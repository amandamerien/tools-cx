## Quando isso se aplica

Usuário quer a **lista de alunos que concluíram um curso e não fizeram nenhuma compra paga numa janela recente** (default: 30 dias). Qualificação ancorada em **engajamento de conclusão**, não em compra. É o momento "quero MAIS, e agora?" — o upsell mais barato e mais ignorado.

Desambiguação de vizinhos:

- **low-ticket-upsell-readiness** — prontidão multi-sinal (4 sinais) de quem **comprou** nos últimos 90 dias. Aqui o sinal é UM só: a conclusão literal do curso, sem limite de data na coorte.
- **ticket-band-upsell-recommendation** — qualifica por faixa de valor de compra. Aqui não há ancoragem em valor.
- **canceled-purchase-not-returned** — pagou e estornou; aqui é o oposto (cliente engajado que terminou o que comprou e está quente pro próximo passo).

## Principais pressupostos

- O curso é identificado por nome/título dado pelo usuário. Mapeamento errado invalida a resposta inteira. Sempre exibir título e id resolvidos; com mais de um match, perguntar via `question` antes de executar.
- "Terminou" = conclusão literal (evento de sistema `course_completed`). Não substituir silenciosamente por "progresso alto" — são coortes diferentes.
- A janela de 30 dias vale pro SUBTRACT, não pra conclusão. A coorte de concluintes é sem limite de data (quem já concluiu, em qualquer época).
- "Nada novo" = qualquer produto, qualquer método. Não estreitar o subtract com `productIds` nem `transactionType`.
- `transactionStatus: ['paid']` já exclui transações estornadas depois. Nunca misture `authorized`, `pending`, `refused`, `failed`, `refunded` ou `chargeback` no subtract.
- Não existe "completedAt" por aula no domínio — a data de conclusão é a do evento (`createdAt`); no fallback por progresso, a aproximação é o `updatedAt` da linha de progresso.
- Playbook somente leitura. A coorte naturalmente convida um lançamento/webinar — mas nenhuma mutação sem opt-in explícito.

## Processo de pensamento

1. **Resolver o curso primeiro.** `content_list` (workspace inteiro, módulos inline) e match por nome (substring case-insensitive). Um curso só → usar e declarar a premissa. Vários → `question` com os 3 melhores títulos. `classroom_details` só como traversal de fallback quando `content_list` vier vazio.
2. **Puxar a coorte de conclusão sem limite de data** via `lead_activities_system_list` (stream bruto de eventos de sistema; body documentado = `page` / `perPage` / `categories[]` / `dateRange`), filtrando client-side pelo evento `course_completed` e pelo `contentId` resolvido. Dedupe por `leadId`, mantendo a conclusão mais recente.
3. **Puxar o conjunto de compras recentes, com janela.** `dashboard_my_sales` com `transactionStatus: ['paid']` e período de 30 dias — sem `productIds`, sem `transactionType`. Subtrair por e-mail.
4. **Fallback quando o evento não existir no workspace:** percorrer matriculados via `member_users_list_by_classroom` + `member_users_get_course_progress`, tratando `completionPercentage >= 1.0` como concluído. Cap 100 membros, declarado na resposta.
5. **Top 30 por `completedAt` desc.** Coortes de conclusão costumam ser pequenas — se o residual for < 10, dizer isso explicitamente.

## Guia de execução

Use `execute` porque o playbook precisa de resolução de curso, leitura de conclusões sem janela, leitura de compras com janela, subtração por e-mail e agregação por lead.

**Entradas padrão:**

- `windowDays = 30` (vale só pro subtract — conclusão é sem limite)
- `maxRows = 2000`
- `topN = 30`
- `fanoutCap = 100` (caminho de fallback por progresso)

**Formato de saída esperado:**

- `course` (resolvido `{ id, name }`)
- `period` (janela do subtract)
- `completersCount`
- `recentBuyersCount`
- `resultCount`
- `results`

**Código de exemplo:**

```js
async () => {
  const hoje = new Date();
  const toIso = (d) => d.toISOString();

  // A janela de 30 dias vale SÓ pro subtract de compras. Conclusão não tem limite de data.
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - 30);
  inicio.setHours(0, 0, 0, 0);
  hoje.setHours(23, 59, 59, 999);
  const transactionPeriod = { from: toIso(inicio), to: toIso(hoje) };

  // ===== FASE 1 — pull: resolver o curso e puxar a coorte de conclusão =====
  // Prefira content_list (workspace inteiro, modules inline). O título deve ter sido
  // confirmado via question ANTES do execute quando houver mais de um match.
  const contents = await codemode.content_list({ perPage: 2000 });
  const courses = contents?.data || [];
  if (courses.length === 0) {
    return {
      course: null,
      period: transactionPeriod,
      completersCount: 0,
      recentBuyersCount: 0,
      resultCount: 0,
      results: [],
      note: 'nenhum curso via content_list; cair pro traversal de classroom_details'
    };
  }
  // Substituir pelo id confirmado pelo usuário quando o workspace tiver mais de um curso.
  const course = courses[0];
  const courseId = course.id;
  const courseName = course.name || course.title || '—';

  // Coorte de conclusão SEM limite de data: evento literal de conclusão de curso.
  // Body documentado (ListLeadActivitiesFilterSchema): page, perPage, categories[], dateRange.
  // O literal do evento e o campo que o carrega são workspace-specific — filtrar client-side.
  const completions = await codemode.lead_activities_system_list({
    page: 1,
    perPage: 2000,
    categories: ['Members']
  });
  const completionRows = (completions?.data || []).filter((row) => {
    const evento = String(row.eventName || row.activityName || row.name || '').toLowerCase();
    return evento.includes('course_completed');
  });

  // ===== FASE 2 — agregação: dedupe por leadId, mantendo a conclusão mais recente =====
  const completersByLead = new Map();
  for (const row of completionRows) {
    const leadId = row.leadId || row.lead?.id;
    if (!leadId) continue;
    const mesmoCurso =
      !row.contentId || row.contentId === courseId || row.payload?.contentId === courseId;
    if (!mesmoCurso) continue;
    const completedAt = row.createdAt || row.occurredAt || null;
    const ts = completedAt ? new Date(completedAt).getTime() : 0;
    const email = (row.contactEmail || row.lead?.email || '').toLowerCase();
    const atual = completersByLead.get(leadId);
    if (!atual || ts > atual._ts) {
      completersByLead.set(leadId, {
        leadId,
        contactName: row.contactName || row.lead?.name || '—',
        contactEmail: row.contactEmail || row.lead?.email || null,
        emailKey: email,
        completedAt,
        _ts: ts
      });
    }
  }

  // ===== FASE 3 — subtract: compras pagas recentes (qualquer produto, qualquer método) =====
  // 'paid' já exclui estornadas — não duplo-filtrar.
  const paid = await codemode.dashboard_my_sales({
    filters: { transactionStatus: ['paid'], transactionPeriod },
    perPage: 2000,
    column: 'createdAt',
    order: 'desc'
  });
  const recentBuyerEmails = new Set(
    (paid?.data || [])
      .map((r) => (r.contactEmail || r.buyer?.email || '').toLowerCase())
      .filter(Boolean)
  );

  const residual = Array.from(completersByLead.values()).filter(
    (c) => !c.emailKey || !recentBuyerEmails.has(c.emailKey)
  );

  // ===== FASE 4 — sort por recência de conclusão + cap =====
  residual.sort((a, b) => b._ts - a._ts);
  const results = residual.slice(0, 30).map(({ _ts, emailKey, ...rest }) => rest);

  return {
    course: { id: courseId, name: courseName },
    period: transactionPeriod,
    completersCount: completersByLead.size,
    recentBuyersCount: recentBuyerEmails.size,
    resultCount: residual.length,
    results
  };
};
```

**Notas:**

- Se o workspace devolver zero conclusões, inspecione uma página pequena de `lead_activities_system_list` SEM `categories` pra confirmar o literal do evento e o nome do campo que o carrega (`eventName` vs equivalente), e tente de novo — não substitua silenciosamente por progresso. O doc de domínio manda exatamente isso: inspecionar uma página antes de chutar valores.
- O body de `lead_activities_system_list` documenta `page`, `perPage`, `categories[]` e `dateRange { from, to }`; facets extras (ex.: filtro server-side por evento ou conteúdo) dependem do schema do SDK — confirme via `load_execute_methods` em vez de inventar campo.
- Fallback por progresso: `member_users_list_by_classroom` + `member_users_get_course_progress` com `completionPercentage >= 1.0`, cap nos primeiros 100 matriculados — e declare o cap na resposta.
- Ajuste só a resolução do curso (troque `courses[0]` pelo id confirmado), a janela do subtract ou o cap. A forma do retorno é intencional.
- Prefira campos já presentes nas linhas (`contactEmail`, `contactName`, `leadId`). `leads_payments` só pros top leads quando o usuário pedir contexto de LTV/próximo produto — nunca pra coorte inteira.
- Sempre chame as capacidades do Clickmax via `codemode.*`.
- `question` fora do `execute` pra: desambiguar curso, afrouxar pra "progresso ≥ X%", mudar janela, drill em 1 lead, ou qualquer mutação (sequência, tag, segmento) — nunca automático.

## Relatório

- Abra com a premissa: "Considerando alunos que concluíram o curso `<nome>` (qualquer data) e que não fizeram nenhuma compra paga nos últimos 30 dias."
- Lista cap 30, ordenada por `completedAt` desc. Colunas: `contactName` | `contactEmail` | `completedAt` | `últimaCompra` | `diasSemComprar`.
- Mencionar `+N more` quando `resultCount > 30`.
- Exibir o curso resolvido (título + id) pra correção imediata de mapeamento errado.
- `completersCount` e `recentBuyersCount` uma vez, como contexto — não como manchete.
- Se o residual for pequeno (< 10), dizer explicitamente — coortes de conclusão costumam ser pequenas.
- Follow-up só como opt-in via `question`: convidar pra webinar de transição em 14 dias (`flows_create`), afrouxar pra ≥ X% de progresso, mudar a janela, drill em 1 lead. Nunca mutar sem confirmação explícita.

## Avisos

- Mapeamento errado do curso invalida a resposta inteira. Sempre exibir título e id; `question` quando houver mais de um match.
- `course_completed` é conclusão literal. Não tratar progresso parcial como conclusão sem opt-in explícito do usuário.
- A janela de 30 dias é do subtrato de compra, não da conclusão. A coorte de concluintes é sem limite de data.
- "Nada novo" = qualquer produto, qualquer método. Não adicionar `productIds` nem `transactionType` no subtract.
- `transactionStatus: ['paid']` já exclui estornadas. Não duplo-filtrar, e nunca misturar `authorized`/`pending`.
- A data de conclusão é a do evento; no fallback por progresso não há timestamp de conclusão real — declare a aproximação.
- Read-only. Nenhum disparo/tag/lista/segmento sem o usuário pedir explicitamente.

## Antipadrões

- Tratar "terminou" como "progrediu bastante" — amplia a coorte em silêncio e dilui a resposta.
- Colocar a janela de 30 dias na conclusão em vez do subtract de compras.
- Filtrar o subtract pelo produto do próprio curso (`productIds`) — "nada novo" é qualquer compra nova, não recompra do mesmo.
- Pular a identificação do curso e chutar — com vários cursos no workspace, o errado produz resposta enganosa.
- Fan-out de progresso por aluno quando `lead_activities_system_list` expõe o mesmo sinal numa query só.
- Traversal portal → classroom → details quando `content_list` já devolve os cursos do workspace com modules.
- Pedir `workspaceId` / `ownerId` ou id de curso que a descoberta via `content_list` resolveria.
- Misturar `authorized`/`pending` no subtract — essas pessoas não pagaram de fato.
- Retornar contagem quando pediram a lista — sempre renderizar as pessoas, com cap e totais como apoio.
