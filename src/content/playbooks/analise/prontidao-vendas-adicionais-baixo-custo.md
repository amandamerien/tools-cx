## Quando isso se aplica

Usuário quer a **lista de quem comprou o produto de entrada recentemente** (default: últimos 90 dias) **e mostra sinais de engajamento** que indicam prontidão pra uma oferta de ticket maior já conhecida (ex.: Workshop → Mentoria). A qualificação é por **ENGAJAMENTO** (4 sinais), não por faixa de preço.

Desambiguação de vizinhos:

- **ticket-band-upsell-recommendation** — qualifica por **faixa de valor** (R$100-500 → R$800-3.000) e devolve produto recomendado por perfil. Aqui a entrada e o alvo já são conhecidos; o trabalho é ranquear prontidão por sinais de engajamento.
- **course-completer-no-recent-purchase** — 1 sinal só (conclusão literal do curso), coorte sem limite de data. Aqui a conclusão é apenas 1 dos 4 sinais e a coorte é ancorada na **compra** dos últimos 90 dias.

## Principais pressupostos

- Janela de 90 dias vale pra compra de entrada (a coorte), não pro subtract — o subtract de quem já comprou o alvo é sem limite de data.
- `transactionStatus: ['paid']` apenas — pendente/recusada não é compra.
- Dinheiro vem em centavos inteiros; converter pra reais só na exibição.
- Comprador ≠ lead ≠ aluno: a ponte é o `buyer.leadId` inline na linha de venda. Linha sem `leadId` não pode ser enriquecida — conte e reporte.
- "Abre e-mails toda semana" é proxy: a abertura registrada é a primeira visualização por mensagem (não existe contador de aberturas). Use métricas agregadas de `lead_activities_metrics_by_lead`.
- % de curso não existe pronto no domínio — é agregação de progresso por aula; a tool de progresso já agrega, mas normalize a escala (0-1 vs 0-100) antes de comparar com 80%/100%.
- Prontidão é ranking heurístico com fórmula declarada, não predição. A taxa de conversão 31% vs 4% da /v10 é exemplo ilustrativo, não dado do workspace.
- Playbook read-only. Campanha/webinar/tag só como opt-in explícito.

## Processo de pensamento

1. **Resolva entrada e alvo primeiro.** O produto de entrada ("Workshop") e a oferta-alvo ("Mentoria") vêm do pedido; resolver ids via `products_list` e confirmar via `question` quando houver mais de um match. Se o alvo não for nomeado, gire sem o subtract e declare isso na resposta.
2. **Coorte ancorada na compra**: pagos do produto de entrada nos últimos 90 dias, dedupe por e-mail com agregados (compras, gasto, última compra).
3. **Subtrair quem já comprou o alvo** (qualquer data) — convidar cliente da Mentoria pra Mentoria queima a lista.
4. **Enriquecer SÓ o topo (50)** com os 4 sinais via `leadId`: % de curso (`member_users_get_progress_by_lead`) + aberturas, cliques e recência (`lead_activities_metrics_by_lead`). Score transparente com pesos declarados.
5. **Resultado = top 30 por prontidão**, com os sinais presentes visíveis por pessoa pra justificar o convite.

## Guia de execução

Use `execute` porque o playbook precisa de duas leituras de vendas, subtração de conjuntos, fan-out controlado de 2 chamadas por lead e ranking com score composto.

**Entradas padrão:**

- `windowDays = 90` (compra de entrada)
- `maxRows = 2000`
- `fanoutCap = 50` (enriquecimento por lead)
- `topN = 30` (resultado final)

**Formato de saída esperado:**

- `period`
- `cohortSize`
- `excludedAlreadyTarget`
- `enriched`
- `withoutLeadId`
- `formula`
- `resultCount`
- `results`

**Código de exemplo:**

```js
async () => {
  const hoje = new Date();
  const toIso = (d) => d.toISOString();

  // Janela padrão: compra de entrada nos últimos 90 dias.
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - 90);
  inicio.setHours(0, 0, 0, 0);
  hoje.setHours(23, 59, 59, 999);
  const transactionPeriod = { from: toIso(inicio), to: toIso(hoje) };

  // Ids resolvidos ANTES do execute (products_list + question quando ambíguo).
  // entryProductIds vazio = qualquer compra paga na janela vira coorte de entrada.
  const entryProductIds = [];
  const targetProductIds = [];

  // ===== FASE 1 — pull: compradores pagos do produto de entrada na janela =====
  const vendas = await codemode.dashboard_my_sales({
    filters: {
      transactionStatus: ['paid'],
      transactionPeriod,
      ...(entryProductIds.length ? { productIds: entryProductIds } : {})
    },
    perPage: 2000,
    column: 'createdAt',
    order: 'desc'
  });
  const linhas = vendas?.data || [];

  // ===== FASE 2 — subtract: quem JÁ comprou a oferta-alvo sai (qualquer data) =====
  let jaTemAlvo = new Set();
  if (targetProductIds.length) {
    const alvo = await codemode.dashboard_my_sales({
      filters: { transactionStatus: ['paid'], productIds: targetProductIds },
      perPage: 2000,
      column: 'createdAt',
      order: 'desc'
    });
    jaTemAlvo = new Set(
      (alvo?.data || [])
        .map((r) => (r.buyer?.email || r.contactEmail || '').toLowerCase())
        .filter(Boolean)
    );
  }

  // Dedupe por e-mail com agregados por comprador.
  const porEmail = new Map();
  for (const row of linhas) {
    const email = (row.buyer?.email || row.contactEmail || '').toLowerCase();
    if (!email || jaTemAlvo.has(email)) continue;

    const ts = row.createdAt ? new Date(row.createdAt).getTime() : 0;
    const valor = Number(row.saleValue || row.value || 0);
    const atual = porEmail.get(email);
    if (!atual) {
      porEmail.set(email, {
        name: row.buyer?.name || row.contactName || '—',
        email: row.buyer?.email || row.contactEmail,
        leadId: row.buyer?.leadId || null,
        purchases: 1,
        totalSpentCents: valor,
        lastPurchaseAt: row.createdAt || null,
        _lastTs: ts
      });
    } else {
      atual.purchases += 1;
      atual.totalSpentCents += valor;
      if (ts > atual._lastTs) {
        atual._lastTs = ts;
        atual.lastPurchaseAt = row.createdAt || atual.lastPurchaseAt;
      }
      if (!atual.leadId && row.buyer?.leadId) atual.leadId = row.buyer.leadId;
    }
  }

  // ===== FASE 3 — cruzamento: enriquecer SÓ o topo com os 4 sinais de prontidão =====
  // Fan-out limitado: 2 chamadas por lead × no máximo 50 candidatos.
  const candidatos = Array.from(porEmail.values())
    .sort((a, b) => b._lastTs - a._lastTs)
    .slice(0, 50);

  let semLeadId = 0;
  for (const c of candidatos) {
    c.courseProgress = null;
    c.emailsOpened = 0;
    c.offerClicks = 0;
    c.lastActivityAt = null;

    if (!c.leadId) {
      semLeadId += 1;
      continue;
    }

    // Sinal 1 — % do curso (a tool agrega o progresso; pegar o maior entre cursos).
    const prog = await codemode.member_users_get_progress_by_lead({ leadId: c.leadId });
    const cursos = Array.isArray(prog?.data)
      ? prog.data
      : Array.isArray(prog?.courses)
        ? prog.courses
        : Array.isArray(prog)
          ? prog
          : [];
    for (const curso of cursos) {
      let p = Number(curso.completionPercentage ?? curso.progressPercentage ?? curso.progress ?? 0);
      if (p > 1) p = p / 100; // normalizar escala 0-100 → 0-1
      if (c.courseProgress === null || p > c.courseProgress) c.courseProgress = p;
      const lw = curso.lastWatchedAt || curso.lastAccessAt || null;
      if (lw && (!c.lastActivityAt || new Date(lw) > new Date(c.lastActivityAt))) {
        c.lastActivityAt = lw;
      }
    }

    // Sinais 2, 3 e 4 — aberturas de e-mail, cliques em oferta e recência de atividade.
    const met = await codemode.lead_activities_metrics_by_lead({ leadId: c.leadId });
    c.emailsOpened = Number(met?.emailsOpened ?? met?.opened ?? met?.emailOpens ?? 0);
    c.offerClicks = Number(met?.emailsClicked ?? met?.clicked ?? met?.clicks ?? 0);
    const metLast = met?.lastActivityAt || met?.lastActivity || null;
    if (metLast && (!c.lastActivityAt || new Date(metLast) > new Date(c.lastActivityAt))) {
      c.lastActivityAt = metLast;
    }
  }

  // Score transparente: 4 sinais com pesos fixos, normalizados no grupo.
  const maxOpens = Math.max(1, ...candidatos.map((c) => c.emailsOpened));
  const maxClicks = Math.max(1, ...candidatos.map((c) => c.offerClicks));
  const agora = Date.now();
  for (const c of candidatos) {
    const curso = c.courseProgress === null ? 0 : Math.min(c.courseProgress, 1);
    const abre = c.emailsOpened / maxOpens;
    const clica = c.offerClicks / maxClicks;
    const diasParado = c.lastActivityAt
      ? (agora - new Date(c.lastActivityAt).getTime()) / 86400000
      : 999;
    const recencia = diasParado <= 7 ? 1 : diasParado <= 30 ? 0.5 : 0;
    c.readinessScore = Number(
      (0.35 * curso + 0.25 * abre + 0.2 * clica + 0.2 * recencia).toFixed(3)
    );
    c.signals = [
      curso >= 1 ? 'curso 100%' : curso >= 0.8 ? 'curso 80%+' : null,
      c.emailsOpened > 0 ? 'abre e-mails' : null,
      c.offerClicks > 0 ? 'clicou em oferta' : null,
      recencia > 0 ? 'ativo recentemente' : null
    ].filter(Boolean);
  }

  // ===== FASE 4 — sort por prontidão + cap =====
  candidatos.sort((a, b) => b.readinessScore - a.readinessScore);
  const results = candidatos.slice(0, 30).map(({ _lastTs, ...rest }) => ({
    ...rest,
    totalSpentBRL: Math.round(rest.totalSpentCents) / 100
  }));

  return {
    period: transactionPeriod,
    cohortSize: porEmail.size,
    excludedAlreadyTarget: jaTemAlvo.size,
    enriched: candidatos.length,
    withoutLeadId: semLeadId,
    formula:
      'readiness = 0.35*cursoConcluido + 0.25*aberturasDeEmail + 0.2*cliquesEmOferta + 0.2*recenciaDeAtividade',
    resultCount: results.length,
    results
  };
};
```

**Notas:**

- Substitua `entryProductIds` / `targetProductIds` pelos ids confirmados antes do execute. Não chute o produto — confirme via `question` quando o catálogo tiver mais de um candidato.
- Os nomes de campo de `member_users_get_progress_by_lead` e `lead_activities_metrics_by_lead` podem variar — os fallbacks já estão no sample; se um sinal não existir no workspace, zere o sinal e siga, nunca faça round-trips extras pra compensar.
- O shape de `GetDashboardMySalesBody` (filtros `transactionStatus`, `transactionPeriod`, `productIds`) vem do SDK gerado e não está documentado campo a campo — confirme via `load_execute_methods` se a validação reclamar dos nomes.
- Ajuste só janela, ids, pesos do score e caps. A forma do retorno é intencional — resposta compacta.
- Sempre chame as capacidades do Clickmax via `codemode.*`.
- `question` fora do `execute` serve pra: desambiguar produto, trocar pesos/janela, ou qualquer mutação de follow-up (campanha, webinar, tag) — nunca automático.

## Relatório

- Abrir com a premissa: "Compradores do produto de entrada nos últimos 90 dias que ainda não compraram a oferta-alvo, ranqueados por 4 sinais de prontidão: curso concluído, abertura de e-mails, clique em ofertas e atividade recente."
- Lista top 30 por `readinessScore` desc, mostrando os sinais presentes por pessoa (ex.: "100% do curso · abre e-mails · entra todo dia", como a /v10 ilustra). Mencionar `+N more` quando `resultCount > 30`.
- Expor a `formula` uma vez no cabeçalho; `cohortSize`, `excludedAlreadyTarget` e `withoutLeadId` entram como contexto de apoio, não como manchete.
- Potencial de receita só como cenário: nº de prontos × preço da oferta-alvo × taxa que o usuário validar. Os números da /v10 (73 pessoas, 31% vs 4%, R$ 145.781) são exemplo de tom — nunca promessa.
- Follow-up só como opt-in via `question`: criar a campanha "entrada → alvo" (`flows_create`), taggear os prontos (`tags_create` + `crm_tags_apply_to_leads`), convite pra webinar de transição, marcar 1:1 com os top 3. Nunca disparar nada automaticamente.

## Avisos

- LMS, CRM e vendas são mundos separados; a ponte é o `leadId` do comprador. Linha de venda sem `leadId` não enriquece — reporte `withoutLeadId` em vez de fingir sinal zero.
- % de curso é agregação por aula, sem percent pronto no domínio — normalize a escala (87 na escala 0-100 é 0.87, não 87.0).
- "Abre e-mails toda semana" não é literal: a visualização registrada é a primeira abertura por mensagem, sem contador. Nunca afirme "abriu 18/20 e-mails" se a métrica agregada não existir no workspace.
- A conversão 31% vs 4% citada na /v10 é ilustrativa — só cite taxa de conversão com histórico real do workspace.
- Dinheiro em centavos nas linhas de venda; reais só na exibição (`totalSpentBRL`).
- Read-only. Nenhuma chamada de disparo/tag/segmento sem opt-in explícito.

## Antipadrões

- Usar este playbook pra pergunta de faixa de preço ("comprou R$100-500 e tem perfil pra R$800-3.000") — isso é ticket-band-upsell-recommendation.
- Enriquecer a coorte inteira com 2 chamadas por lead — fan-out só no topo (cap 50).
- Tratar progresso na escala 0-100 como 0-1 (ou vice-versa) — marca todo mundo como "curso 100%" ou ninguém.
- Pular o subtract de quem já comprou a oferta-alvo — convida cliente da Mentoria pra comprar a Mentoria.
- Prometer receita ("R$ 145.781") como fato — é cenário que depende de taxa validada pelo usuário.
- Disparar o flow/campanha sem confirmação explícita.
- Retornar contagem quando pediram a lista de pessoas.
- Pedir `workspaceId` / `ownerId` ou ids de produto que `products_list` resolve.
