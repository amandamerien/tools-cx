## Quando isso se aplica

O job agendado de segunda 8h (ou o pedido explícito "resumo da semana"): varrer as frentes de dinheiro escondido **em paralelo**, estimar o impacto de cada uma, ranquear por **impacto × facilidade** e entregar as **top 3 ações com 1 botão cada** — sem o usuário pedir nada.

É o caso em que a squad inteira do Max trabalha junta: **Rebeca** (recuperação) sonda as cobranças falhadas, **Cassio** (membros) os alunos concluintes, **Diego** (dados) os leads-ouro e os inativos engajados, **Vinícius** (agenda comercial) corrobora o pipeline, e **Mateus** (mensagens) só entra DEPOIS, quando o usuário aperta um botão.

### Desambiguação dos vizinhos

- **revenue-loss-diagnostic** é o diagnóstico **sob demanda** ("quanto estou perdendo?"): pergunta aberta, então ele desambigua via `question` antes de rodar. Este playbook é a versão **agendada/proativa** do mesmo job — ninguém perguntou nada, logo não há o que desambiguar: roda as sondas e ranqueia.
- **subscription-renewal-failed**, **course-completer-no-recent-purchase**, **hot-leads-no-recent-contact** e **lapsed-customers-still-opening-emails** são os especialistas de cada frente. Este orquestrador só **dimensiona** cada frente (sonda + estimativa); quando o usuário escolhe uma ação, o aprofundamento é do especialista.

## Principais pressupostos

- Orquestrador **read-only e proativo**. Cada frente herda as premissas do seu especialista: `refused` / `failed` ≠ `refunded` / `chargeback`; `transactionRecurrence: 'Recurrent'` é obrigatório na frente de mensalidades; `transactionStatus: ['paid']` já exclui estornos; `course_completed` é conclusão literal, não progresso alto.
- **Impacto** = R$ estimado por frente. **Facilidade** = peso fixo por tipo de ação (1.0 = flow de 1 clique; menor = mais trabalho humano). Score de ranking = impacto × facilidade.
- As estimativas usam **proxies conservadores de conversão** — são estimativas, nunca receita garantida. Calibrar com o histórico do workspace antes de prometer número.
- Janelas diferem por frente (35d mensalidades, 30d subtract dos concluintes, 180d+30d inativos engajados) — declarar todas no report, não unificar numa "semana".
- Valores monetários nas linhas de venda (`saleValue`) vêm em **centavos** — formatar como R$ só no report.
- Ponte de identidade: `buyer.leadId` inline nas linhas de `dashboard_my_sales`; fallback = join por e-mail lowercase.
- **Não existe tabela de insights persistida** (o schema `ai` só tem `ChatSessions`). O resumo é recomputado a cada execução e descartado — nunca procure um "resumo anterior" no banco.

## Processo de pensamento

1. **Não perguntar nada.** O job é proativo: se o gatilho foi o agendamento ou a frase "resumo da semana", as 4 sondas rodam direto com defaults. `question` só aparece no FIM, como botão opt-in de cada ação.
2. **Sondar, não aprofundar.** Cada frente é uma leitura barata que dimensiona o cohort e estima o valor. O drill-down (subtract fino, dedupe por assinatura com retry, dormência real por lead) pertence ao playbook especialista — citar o `name` dele em cada item do top 3.
3. **Paralelizar as leituras.** Primeira onda: schema de filtros + mensalidades falhadas + conclusões de curso + base de vendas pagas. Segunda onda (depende do schema): leads-ouro + aberturas de e-mail. Tudo via `Promise.all`.
4. **Ranquear por impacto × facilidade**, não só por R$. Uma frente de R$ 30K que resolve com 1 botão vence uma de R$ 40K que exige montar webinar.
5. **Entregar top 3 + 1 botão cada.** Cada botão é um follow-up de mutação (disparar flow, criar tarefa) oferecido via `question` — nunca executado automaticamente.

## Guia de execução

Usar `execute` porque o playbook precisa de 6 leituras paralelas em 2 ondas, cruzamentos por e-mail/leadId, estimativa de valor por frente e ranking.

**Entradas padrão:**

- `renewalWindowDays = 35` · `completerSubtractDays = 30` · `lapsedDays = 180` · `openWindowDays = 30`
- `scoreThreshold = 70`
- `maxRows = 2000`
- `sampleN = 5` (amostra de pessoas por frente) · `topActions = 3`

**Formato de saída esperado:**

- `generatedAt`
- `windows`
- `scoreLeaf`
- `baseAvgTicket`
- `fronts` (4 frentes com `count`, `estimatedValue`, `ease`, `score`, `specialist`)
- `top3` (com amostra de até 5 pessoas por ação)
- `totalEstimated`

**Código de exemplo:**

```js
async () => {
  const today = new Date();
  const toIso = (d) => d.toISOString();
  const dayMs = 86400000;

  // Janelas por frente — cada sonda herda a janela default do especialista.
  const renewalFrom = new Date(today);
  renewalFrom.setDate(today.getDate() - 35); // ciclo mensal + retries de dunning
  const recentBuyCutoffMs = today.getTime() - 30 * dayMs; // subtract dos concluintes
  const lapsedCutoffMs = today.getTime() - 180 * dayMs; // "parou de comprar"
  const openFrom = new Date(today);
  openFrom.setDate(today.getDate() - 30); // "ainda abre e-mail"
  const to = new Date(today);
  to.setHours(23, 59, 59, 999);

  // Facilidade por frente: 1.0 = ação de 1 botão; menor = mais trabalho humano.
  // São pesos de esforço (decisão de produto), não números do negócio.
  const EASE = {
    mensalidades_falhadas: 1.0, // flow de atualização de cartão, 1 clique
    leads_ouro_parados: 0.8,    // tarefa pro closer, rápido mas humano
    alunos_concluintes: 0.7,    // exige montar webinar/campanha
    inativos_engajados: 0.6     // campanha segmentada, mais curadoria
  };
  // Proxies conservadores de conversão pra ESTIMAR o valor de cada frente.
  // Calibrar com o histórico real do workspace; nunca apresentar como promessa.
  const CONV = { leads_ouro_parados: 0.2, alunos_concluintes: 0.2, inativos_engajados: 0.1 };

  // ── FASE 1 (pull): primeira onda de sondas, em paralelo ──
  const [schema, failedRes, completionsRes, paidRes] = await Promise.all([
    codemode.leads_filter_schema(),
    codemode.dashboard_my_sales({
      filters: {
        transactionRecurrence: 'Recurrent',
        transactionStatus: ['refused', 'failed'],
        subscriptionStatus: ['active'],
        transactionPeriod: { from: toIso(renewalFrom), to: toIso(to) }
      },
      perPage: 2000, column: 'createdAt', order: 'desc'
    }),
    codemode.lead_activities_system_list({ categories: ['Members'], eventNames: ['course_completed'], perPage: 2000 }),
    codemode.dashboard_my_sales({ filters: { transactionStatus: ['paid'] }, perPage: 2000, column: 'createdAt', order: 'desc' })
  ]);

  // Descobrir a folha de score no schema do workspace (nunca chutar o nome).
  const schemaStr = JSON.stringify(schema || {}).toLowerCase();
  const scoreLeaf =
    (schemaStr.includes('"leadscore"') && 'leadScore') ||
    (schemaStr.includes('"temperaturescore"') && 'temperatureScore') ||
    'score';

  // ── FASE 1b (pull): segunda onda — depende do schema descoberto ──
  const statusGroupId = crypto.randomUUID();
  const [goldRes, opensRes] = await Promise.all([
    codemode.leads_search({
      filters: [
        { id: crypto.randomUUID(), order: 0, field: scoreLeaf, operator: 'greaterThanOrEqual', negation: false, valueNumber: 70 },
        { id: statusGroupId, order: 1, field: 'children', operator: 'childrenOr', negation: false },
        ...['engaged', 'subscribed', 'in_cart'].map((s, i) => ({ id: crypto.randomUUID(), order: i, field: 'status', operator: 'equals', negation: false, valueString: s, parentId: statusGroupId }))
      ],
      page: 1, perPage: 2000
    }),
    codemode.lead_activities_system_list({ categories: ['Email'], eventNames: ['email_opened'], dateRange: { from: toIso(openFrom), to: toIso(to) }, perPage: 2000 })
  ]);

  // ── FASE 2 (cruzamento): montar cada frente a partir das leituras ──
  const paidRows = paidRes?.data || [];
  const byEmail = new Map();
  let paidTotal = 0;
  for (const row of paidRows) {
    const email = (row.contactEmail || '').toLowerCase();
    if (!email) continue;
    const ts = row.createdAt ? new Date(row.createdAt).getTime() : 0;
    const value = Number(row.saleValue || row.value || row.amount || 0);
    paidTotal += value;
    const cur = byEmail.get(email);
    if (!cur) byEmail.set(email, { name: row.contactName || '—', email: row.contactEmail, lastTs: ts, ltv: value, leadId: row.buyer?.leadId || null });
    else { cur.ltv += value; if (ts > cur.lastTs) cur.lastTs = ts; if (!cur.leadId && row.buyer?.leadId) cur.leadId = row.buyer.leadId; }
  }
  const avgTicket = paidRows.length ? paidTotal / paidRows.length : 0;

  // Frente 1 — mensalidades falhadas: dedupe por assinatura (retries = 1 linha cada).
  const bySub = new Map();
  for (const row of failedRes?.data || []) {
    const subId = row.subscriptionId || row.subscription?.id;
    if (!subId) continue;
    const ts = row.createdAt ? new Date(row.createdAt).getTime() : 0;
    const cur = bySub.get(subId);
    if (!cur || ts > cur.ts) bySub.set(subId, { ts, name: row.contactName || '—', email: row.contactEmail || null, product: row.productName || null, amount: Number(row.value || row.amount || 0) });
  }
  const mrrAtRisk = Array.from(bySub.values()).reduce((s, x) => s + x.amount, 0);

  // Frente 2 — concluintes sem compra recente: subtract por e-mail (janela 30d).
  const recentBuyerEmails = new Set();
  for (const row of paidRows) {
    const ts = row.createdAt ? new Date(row.createdAt).getTime() : 0;
    const email = (row.contactEmail || '').toLowerCase();
    if (email && ts >= recentBuyCutoffMs) recentBuyerEmails.add(email);
  }
  const completersByLead = new Map();
  for (const row of completionsRes?.data || []) {
    const leadId = row.leadId || row.lead?.id;
    if (!leadId) continue;
    const email = (row.contactEmail || row.lead?.email || '').toLowerCase();
    if (email && recentBuyerEmails.has(email)) continue;
    const ts = row.createdAt ? new Date(row.createdAt).getTime() : 0;
    const cur = completersByLead.get(leadId);
    if (!cur || ts > cur.ts) completersByLead.set(leadId, { ts, name: row.contactName || row.lead?.name || '—', email: row.contactEmail || row.lead?.email || null, completedAt: row.createdAt || null });
  }

  const goldRows = goldRes?.data || [];

  // Frente 4 — inativos engajados: parou de comprar há 180d+ mas abriu e-mail em 30d.
  const lastOpenByLead = new Map();
  const lastOpenByEmail = new Map();
  for (const ev of opensRes?.data || []) {
    const ts = ev.createdAt ? new Date(ev.createdAt).getTime() : 0;
    const leadId = ev.leadId || ev.lead?.id || null;
    const email = (ev.email || ev.lead?.email || '').toLowerCase();
    if (leadId && ts > (lastOpenByLead.get(leadId) || 0)) lastOpenByLead.set(leadId, ts);
    if (email && ts > (lastOpenByEmail.get(email) || 0)) lastOpenByEmail.set(email, ts);
  }
  const lapsedEngaged = [];
  for (const buyer of byEmail.values()) {
    if (!buyer.lastTs || buyer.lastTs >= lapsedCutoffMs) continue;
    const openTs = (buyer.leadId && lastOpenByLead.get(buyer.leadId)) || lastOpenByEmail.get((buyer.email || '').toLowerCase()) || 0;
    if (openTs) lapsedEngaged.push(buyer);
  }

  // ── FASE 3 (agregação): valor estimado × facilidade por frente ──
  const completers = Array.from(completersByLead.values()).sort((a, b) => b.ts - a.ts);
  lapsedEngaged.sort((a, b) => b.ltv - a.ltv);

  const fronts = [
    { front: 'mensalidades_falhadas', specialist: 'subscription-renewal-failed', count: bySub.size, estimatedValue: Math.round(mrrAtRisk * 12), sample: Array.from(bySub.values()).sort((a, b) => b.amount - a.amount).slice(0, 5).map((x) => ({ name: x.name, email: x.email, product: x.product, amount: x.amount })) },
    { front: 'alunos_concluintes', specialist: 'course-completer-no-recent-purchase', count: completers.length, estimatedValue: Math.round(completers.length * avgTicket * CONV.alunos_concluintes), sample: completers.slice(0, 5).map((x) => ({ name: x.name, email: x.email, completedAt: x.completedAt })) },
    { front: 'leads_ouro_parados', specialist: 'hot-leads-no-recent-contact', count: goldRows.length, estimatedValue: Math.round(goldRows.length * avgTicket * CONV.leads_ouro_parados), sample: goldRows.slice(0, 5).map((l) => ({ name: l.name || '—', email: l.email || null, score: l[scoreLeaf] ?? l.score ?? null })) },
    { front: 'inativos_engajados', specialist: 'lapsed-customers-still-opening-emails', count: lapsedEngaged.length, estimatedValue: Math.round(lapsedEngaged.reduce((s, b) => s + b.ltv, 0) * CONV.inativos_engajados), sample: lapsedEngaged.slice(0, 5).map((b) => ({ name: b.name, email: b.email, ltv: b.ltv })) }
  ].map((f) => ({ ...f, ease: EASE[f.front], score: Math.round(f.estimatedValue * EASE[f.front]) }));

  // ── FASE 4 (sort + cap): ranquear por impacto × facilidade, top 3 ──
  fronts.sort((a, b) => b.score - a.score);
  const top3 = fronts.slice(0, 3).map((f, i) => ({ rank: i + 1, ...f }));

  return {
    generatedAt: toIso(new Date()),
    windows: { renewalDays: 35, completerSubtractDays: 30, lapsedDays: 180, openDays: 30 },
    scoreLeaf,
    baseAvgTicket: Math.round(avgTicket),
    fronts: fronts.map(({ sample, ...rest }) => rest),
    top3,
    totalEstimated: fronts.reduce((s, f) => s + f.estimatedValue, 0)
  };
};
```

**Notas:**

- Cada sonda é uma APROXIMAÇÃO da análise do especialista (ex.: a frente de mensalidades não subtrai quem recuperou no retry; os leads-ouro não têm a checagem fina de dormência). Antes de o usuário agir numa frente, rode o playbook especialista citado em `specialist`.
- `subscriptions_list` entra só como drill-down opcional (MRR exato de uma assinatura específica que o usuário clicou) — nunca em loop dentro do orquestrador.
- Ajuste apenas janelas, threshold de score, pesos `EASE`/`CONV` e caps. A forma do retorno é intencional — mantenha compacta.
- Em `lead_activities_system_list`, `categories` e `dateRange` são os campos documentados do filter body; o facet de nome de evento (`eventNames` no sample) vem do shape gerado pelo SDK — conferir no worker quando uma sonda voltar vazia.
- Sempre chame as capacidades do Clickmax via `codemode.*`.
- `question` fica FORA do `execute`, só para os botões opt-in do top 3 — nunca para perguntar "o que você quer ver" (isso é papel do revenue-loss-diagnostic).

## Relatório

- Abra com a premissa: *"Resumo da semana — varri 4 frentes em paralelo (mensalidades falhadas 35d, concluintes sem compra 30d, leads-ouro score ≥ 70, inativos 180d+ que ainda abrem e-mail 30d) e ranqueei por impacto estimado × facilidade da ação."*
- Formato fixo do resumo: 🥇🥈🥉 top 3 ações, cada uma com: R$ estimado (rotulado como estimativa), tamanho do cohort, amostra de até 5 pessoas e 1 botão ("Disparar flow de atualização de cartão" via `flows_create`, "Criar campanha pros concluintes", "Criar tarefas pro closer" via `cards_create`/`cards_import_from_lists`) — cada botão é opt-in via `question`.
- Citar o playbook especialista de cada ação ("quer que eu aprofunde essa frente?").
- `totalEstimated` aparece uma vez como contexto, com a ressalva de que soma horizontes diferentes (anualizado × one-off). Os números da página /v10 (R$ 587.420, R$ 14.892, 142 alunos…) são exemplos ilustrativos de como o resumo soa — nunca valores a serem reproduzidos.
- Mencionar "+N more" quando o cohort de uma frente passa da amostra de 5.
- Acompanhamentos de mutação (disparar `flows_create`, agendar o resumo recorrente via flow `scheduled_datetime`, criar tarefa) só como opt-in via `question`. `flows_list` / `flows_create` são citados, nunca executados daqui.

## Avisos

- Não existe persistência de insight: o schema `ai` só tem `ChatSessions` — não há tabela `WeeklyInsights`. O resumo é recomputado e descartado a cada execução; não invente leitura de "resumo anterior".
- A IA decide, o Flows executa, o Hermes entrega: este playbook nunca dispara flow, mensagem ou tarefa. Mesmo sendo um job agendado, cada botão do top 3 exige confirmação do usuário.
- As estimativas usam proxies (`CONV`) e anualização (× 12) — horizontes diferentes por frente. Rotular cada número como estimativa e declarar a janela; somar tudo sem ressalva infla a expectativa.
- O evento de abertura (`email_opened`) registra a PRIMEIRA abertura por mensagem, não um contador — "abriu 4 vezes" não existe no dado; use abriu sim/não.
- Sondas limitadas a `perPage: 2000`: em bases grandes os counts são piso, não total — dizer isso quando a leitura volta cheia.
- `transactionRecurrence: 'Recurrent'` é obrigatório na frente 1; sem ele, recusas de compra avulsa contaminam a estimativa de MRR.

## Antipadrões

- Rodar as 19 análises da /v10 em profundidade dentro do orquestrador — sondas dimensionam, especialistas aprofundam. O resumo precisa caber numa leitura de 30 segundos.
- Disparar a ação nº 1 automaticamente "porque o job é agendado" — agendado é o diagnóstico, nunca a mutação.
- Abrir com `question` perguntando qual frente o usuário quer — isso é o revenue-loss-diagnostic. Aqui a proatividade é o produto.
- Hardcodar números da página /v10 (47 pessoas, R$ 9.236, R$ 587.420) no código ou exibi-los como resultado real.
- Apresentar `estimatedValue` como receita garantida, ou somar anualizado + one-off num único "R$ esperando" sem rotular.
- Chutar a folha de score (`score` vs `leadScore` vs `temperatureScore`) sem consultar `leads_filter_schema`.
- Pedir `workspaceId` / `ownerId` ao usuário.
