## Quando isso se aplica

O usuário quer a **lista de leads-ouro pra lotar a agenda dos closers**: score alto (> 70) **+** renda declarada ≥ R$ 15.000/mês (campo customizado) **+** nenhum card aberto em pipeline (= ninguém do comercial pegou). É qualificação **proativa** — separar quem está pronto pra oferta high-ticket antes de gastar hora de closer.

### Distinguir dos playbooks vizinhos

- **hot-leads-no-recent-contact** — reativo: lead já quente esfriando por falta de contato. Aqui o critério é perfil (score × renda × histórico), não tempo de reação.
- **proposals-sent-no-follow-up** — o deal já existe e tem proposta; aqui o lead ainda nem entrou no pipeline.
- **meeting-missed-not-rescheduled** — reunião que caiu; aqui nunca houve reunião — o objetivo é justamente criar a primeira.

## Principais pressupostos

- O campo de renda é customizado e o nome varia por workspace ("renda", "renda_mensal", "faturamento", "income"…). Chame `leads_filter_schema` 1× no início e procure o campo; se não achar nada plausível, **pare e confirme via `question`** — nunca hardcode.
- O valor da renda pode ser **texto ou select** ("R$ 15.000 - R$ 20.000", "acima de 15k"), não número. Filtrar renda **client-side** com parse tolerante; só o score filtra server-side.
- Leaf de score também é descoberto via `leads_filter_schema` (`score` / `leadScore` / `temperatureScore`). Threshold default `>= 70`.
- "Sem closer agendado" = **nenhum card aberto** em nenhum pipeline (`cards_list_by_lead`). Card ganho/perdido no passado não conta como closer ativo — lead pode voltar pra agenda.
- Ticket histórico via `leads_payments` (transações `paid`): quem já pagou antes fura a fila no desempate. Valores em **centavos**.
- Playbook read-only. Criar card pro closer, atribuir atendente ou disparar convite de agenda: nunca automático.

## Processo de pensamento

1. **Descoberta dupla de schema primeiro:** leaf de score E campo de renda, na mesma chamada de `leads_filter_schema`. Sem campo de renda detectável, devolver os campos existentes e confirmar com o usuário — coorte de renda chutada é lixo silencioso.
2. **Caminho padrão = filtro server-side só no score**, renda client-side. Campo customizado tem suporte de operador imprevisível entre workspaces; parse local é o caminho robusto.
3. **Qualificar "sem closer" por ausência, com fan-out controlado:** `cards_list_by_lead` nos top candidates (cap 50, ordenados por score) — card aberto = já está na mão de alguém, sai da lista.
4. **Enriquecer com ticket histórico** (`leads_payments`) pra ranquear: entre dois leads de mesmo score, quem já comprou antes fecha high-ticket mais fácil.
5. **Resultado people-shaped pra virar agenda:** score, renda declarada, histórico pago e telefone — tudo que o closer precisa pra priorizar a semana. Criação de cards é opt-in.

## Guia de execução

Usar `execute` porque o playbook precisa de descoberta de schema (2 campos), pull paginado, parse de campo customizado, anti-join por cards e enriquecimento com pagamentos.

**Entradas padrão:**

- `scoreThreshold = 70`
- `incomeThreshold = 15000` (R$/mês)
- `maxRows = 2000`
- `fanOutCap = 50`
- `topN = 50`

**Formato de saída esperado:**

- `scoreLeaf`
- `incomeField` (ou `needsIncomeFieldConfirmation` + `customFieldCandidates`)
- `highScoreCohort`
- `incomeQualified`
- `withCloserCount`
- `resultCount`
- `results`

**Código de exemplo:**

```js
async () => {
  // FASE 1 — descoberta de schema: leaf de score E campo customizado de renda.
  // O nome do campo de renda varia por workspace — NUNCA hardcode.
  const schema = await codemode.leads_filter_schema();
  const schemaStr = JSON.stringify(schema || {});
  const lower = schemaStr.toLowerCase();
  const scoreLeaf =
    (lower.includes('"leadscore"') && 'leadScore') ||
    (lower.includes('"temperaturescore"') && 'temperatureScore') ||
    (lower.includes('"score"') && 'score') ||
    'score';

  // Procurar o campo de renda entre todos os campos do schema (inclusive customizados).
  const fieldNames = Array.from(new Set(
    Array.from(schemaStr.matchAll(/"([^"\\]+)"/g)).map((m) => m[1])
  ));
  const incomeField =
    fieldNames.find((f) => /renda|income|faturamento|sal[aá]rio/i.test(f)) || null;

  // Sem campo plausível → devolver candidatos pro Max confirmar via question.
  if (!incomeField) {
    return {
      needsIncomeFieldConfirmation: true,
      scoreLeaf,
      customFieldCandidates: fieldNames.filter((f) => f.length > 2).slice(0, 80)
    };
  }

  // FASE 2 — pull: leads com score alto (renda filtra client-side, porque campo
  // customizado pode ser texto/select tipo "R$ 15.000 - R$ 20.000").
  const cohort = await codemode.leads_search({
    filters: [
      { id: crypto.randomUUID(), order: 0, field: scoreLeaf, operator: 'greaterThanOrEqual', negation: false, valueNumber: 70 }
    ],
    page: 1,
    perPage: 2000
  });
  const leadRows = cohort?.data || [];

  // Parse tolerante de renda: extrai o primeiro número do valor bruto.
  const parseIncome = (raw) => {
    if (raw == null) return null;
    if (typeof raw === 'number') return raw;
    const match = String(raw).replace(/\./g, '').replace(',', '.').match(/\d+(\.\d+)?/);
    if (!match) return null;
    let n = parseFloat(match[0]);
    if (/k\b/i.test(String(raw)) && n < 1000) n = n * 1000; // "15k" → 15000
    return Number.isFinite(n) ? n : null;
  };

  // Corte client-side por renda declarada >= 15000.
  const golden = [];
  for (const lead of leadRows) {
    const fields = lead.customFields || lead.fields || lead;
    const rawIncome = fields?.[incomeField] ?? lead[incomeField];
    const income = parseIncome(rawIncome);
    if (income === null || income < 15000) continue;
    golden.push({
      leadId: lead.id || lead.leadId,
      contactName: lead.name || lead.contactName || '—',
      contactEmail: lead.email || lead.contactEmail || null,
      phone: lead.phone || lead.contactPhone || null,
      score: Number(lead[scoreLeaf] ?? lead.score ?? 0),
      declaredIncome: income,
      declaredIncomeRaw: rawIncome
    });
  }

  // FASE 3 — cruzamento (fan-out cap 50, melhores scores primeiro):
  // card aberto = já tem closer → fora; ticket histórico entra no ranking.
  golden.sort((a, b) => b.score - a.score);
  const results = [];
  let withCloserCount = 0;

  for (const lead of golden.slice(0, 50)) {
    if (!lead.leadId) continue;

    // Sem closer agendado = nenhum card ABERTO em nenhum pipeline.
    const cards = await codemode.cards_list_by_lead({ leadId: lead.leadId });
    const cardRows = cards?.data || cards || [];
    const hasOpenCard = (Array.isArray(cardRows) ? cardRows : []).some(
      (c) => (c.status || 'open') === 'open'
    );
    if (hasOpenCard) {
      withCloserCount += 1;
      continue;
    }

    // Ticket histórico: o que o lead já pagou (valores em CENTAVOS).
    let historicalPaidTotal = 0;
    let lastPaidAt = null;
    const payments = await codemode.leads_payments({ leadId: lead.leadId });
    const payRows = payments?.data || payments || [];
    for (const p of Array.isArray(payRows) ? payRows : []) {
      if (p.status && p.status !== 'paid') continue;
      historicalPaidTotal += Number(p.amount || p.value || 0);
      const at = p.createdAt || p.paidAt || null;
      if (at && (!lastPaidAt || new Date(at) > new Date(lastPaidAt))) lastPaidAt = at;
    }

    results.push({
      ...lead,
      historicalPaidTotal,
      lastPaidAt,
      alreadyCustomer: historicalPaidTotal > 0
    });
  }

  // FASE 4 — sort: score desc, empate por ticket histórico desc; cap 50.
  results.sort(
    (a, b) => (b.score - a.score) || (b.historicalPaidTotal - a.historicalPaidTotal)
  );

  return {
    scoreLeaf,
    incomeField,
    highScoreCohort: leadRows.length,
    incomeQualified: golden.length,
    withCloserCount,
    resultCount: results.length,
    results: results.slice(0, 50)
  };
};
```

**Notas:**

- Se vier `needsIncomeFieldConfirmation`, use `question` mostrando os `customFieldCandidates` plausíveis ("qual desses campos guarda a renda declarada?") e gire de novo — nunca escolha sozinho um campo ambíguo.
- O fan-out é cortado nos 50 melhores scores ANTES do anti-join de cards — se muitos já tiverem closer, a lista final fica menor que 50; informe isso em vez de ampliar o fan-out silenciosamente.
- `declaredIncomeRaw` viaja junto no resultado de propósito: a resposta deve mostrar o valor original do campo, não só o parse.
- O shape exato do body do `leads_search` (paginação `page`/`perPage`) vem do schema gerado pelo SDK — se a chamada rejeitar o campo, confira o shape no worker. Os leaves do filtro seguem o modelo V2 documentado (`id`/`order`/`field`/`operator`/`negation`/`valueNumber`/`valueString`).
- Sempre chamar as capacidades do Clickmax via `codemode.*`.
- `question` fora do `execute`, só pra confirmação de campo e follow-up opt-in (criar cards, atribuir closer, disparar convite) — nunca automático.

## Relatório

- Abrir com a premissa: *"Leads com score ≥ 70 (campo `<scoreLeaf>`) e renda declarada ≥ R$ 15.000/mês (campo `<incomeField>`), sem nenhum card aberto em pipeline — ou seja, sem closer agendado. Renda lida do campo customizado do seu workspace."*
- Lista people-shaped ordenada por score desc (empate: ticket histórico desc), cap 50, "+N more" quando `resultCount > 50`. Formato por linha: nome + score + renda declarada (valor bruto do campo) + histórico pago + telefone — o pacote completo pra agenda do closer.
- Marcar `alreadyCustomer` — quem já pagou antes é o ouro do ouro pra oferta acima de R$ 5.000; vale ser a sub-manchete.
- `highScoreCohort`, `incomeQualified` e `withCloserCount` entram uma vez como funil de contexto ("de X com score alto, Y declararam renda ≥ 15k, Z já estavam com closer").
- Lembrar que renda é autodeclarada — qualifica a fila, não substitui a triagem do closer.
- Follow-ups (criar card no pipeline do closer via `cards_create`, atribuir via `cards_assign_attendants`, disparar convite de agenda via `flows_create`) só como opt-in via `question`. Nunca criar card ou agendar automaticamente.

## Avisos

- O nome do campo de renda varia por workspace — esta é a armadilha central. Hardcodar "renda" devolve coorte vazia ou, pior, lê o campo errado com confiança. Descoberta via `leads_filter_schema` + confirmação quando ambíguo.
- O valor da renda pode ser select/texto ("R$ 15.000 - R$ 20.000", "15k+", "entre 10 e 20 mil"). O parse pega o primeiro número — num range, isso é o piso (conservador). Não compare string com número.
- `leads_payments` devolve valores em centavos — `historicalPaidTotal` de 500000 é R$ 5.000, não meio milhão. Dividir antes de formatar.
- "Sem closer agendado" é um proxy por ausência de card aberto. Workspace que controla agenda fora do pipeline (planilha, agenda externa) vai ter falso-positivo — declare o proxy na resposta pra correção fácil.
- Card ganho/perdido antigo não é closer ativo — só card aberto desqualifica o lead da lista.
- Leaf de score também é por workspace — mesmo cuidado do campo de renda.
- Read-only. Nenhum `cards_create` / `cards_assign_attendants` / flow sem confirmação explícita.

## Antipadrões

- Hardcodar o nome do campo de renda (ou do score) sem `leads_filter_schema` — a falha silenciosa número 1 deste playbook.
- Filtrar renda server-side assumindo campo numérico — em workspace com select de faixas o filtro retorna vazio e a resposta sai "não há leads-ouro" sendo que há.
- Tratar lead com card ganho/perdido no passado como "já tem closer" — ele está livre; só card aberto conta.
- Somar `leads_payments` sem tratar centavos — infla o ticket histórico por 100× e destrói o ranking.
- Criar cards ou atribuir closer automaticamente porque o usuário disse "lota a agenda" — a intenção de mutação sempre passa por `question` com a lista na mesa.
- Rodar `cards_list_by_lead` + `leads_payments` pra coorte inteira sem cap — fan-out de 2 chamadas por lead explode em bases grandes.
- Devolver só a contagem ("você tem N leads-ouro") quando o objetivo é montar agenda — a saída é a lista com telefone e contexto por pessoa.
- Pedir `workspaceId` / `ownerId` ou pedir pro usuário "me diz o nome do campo de renda" sem antes tentar a descoberta via schema.
