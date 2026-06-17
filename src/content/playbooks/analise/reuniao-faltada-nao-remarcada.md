## Quando isso se aplica

O usuário quer a **lista de leads** cuja **reunião estava marcada em uma janela recente, não aconteceu e ninguém remarcou** — uma coorte de cobrança do processo comercial, com o valor de proposta que escorregou da agenda e o padrão por anúncio de origem.

### Distinguir dos playbooks vizinhos

- **hot-leads-no-recent-contact** — lá o lead é quente e ninguém nem tentou falar; aqui **houve** um touchpoint agendado que caiu.
- **proposals-sent-no-follow-up** — lá o deal já passou da reunião e está parado no stage de proposta; aqui o funil morreu **na etapa da reunião**.

## Principais pressupostos

- "Reunião" = atividade de categoria `Opportunity` com `meta.type === 'meeting'`. Ligações, WhatsApps, tarefas e notas dividem a mesma categoria — o corte é client-side via `meta.type`.
- "Não aconteceu" é **inferido**, não flagado: `meta.scheduledAt` no passado **e** nenhuma atividade de follow-up no mesmo lead/card em ±24h do horário marcado. No banco o no-show até é enum real (`ScheduledCalls.status='no_show'`, com `autoNoShow` opcional nas configurações de calendário), mas a superfície MCP entrega atividades — então trate como inferência e diga isso na resposta.
- "Ninguém remarcou" = nenhuma reunião posterior no mesmo `leadId` (ou mesmo `meta.opportunityCardId`).
- Janela padrão = 30 dias, aplicada sobre `meta.scheduledAt` (quando a reunião deveria ter acontecido), **não** sobre `createdAt` (quando foi registrada).
- Valor em risco = `value` do card aberto do lead (`cards_list_by_lead`). Dinheiro pode vir em **centavos** — confira a magnitude antes de somar/formatar.
- Playbook somente leitura. Criar tarefa de rediscagem, mover card ou disparar mensagem: nunca automático.

## Processo de pensamento

1. **Confirmar que a intenção é só reunião.** "Reunião" no jargão comercial BR às vezes inclui ligação agendada. Default estrito: `meta.type === 'meeting'`; se o usuário disser "qualquer agendamento", ampliar para `['meeting', 'call', 'whatsapp']`.
2. **Caminho padrão = pull do workspace + filtro client-side.** `lead_activities_system_list` com `categories: ['Opportunity']` e a janela; depois estreitar para reuniões com `scheduledAt` passado e dentro da janela.
3. **Timeline por lead só para os top candidatos (cap 50).** É onde se checa remarcação posterior e follow-up ±24h, sem fan-out na coorte inteira. No mesmo loop, puxar origem do lead e valor do card aberto.
4. **Procurar o padrão de origem.** Se uma mesma origem/anúncio concentrar ≥50% das reuniões perdidas (com pelo menos 3 ocorrências), isso é sinal de problema no anúncio, não no SDR — destacar na resposta.
5. **Resultado people-shaped**, 1 linha por lead, classificado pela reunião perdida mais recente (mais quente para recuperar), com a inferência declarada no cabeçalho.

## Guia de execução

Usar `execute` porque o playbook precisa de um pull do workspace, dois filtros client-side, busca forward por lead (remarcação + follow-up), cruzamento com card e origem, agregação e ranking.

**Entradas padrão:**

- `windowDays = 30`
- `maxRows = 2000`
- `topN = 50`
- `followUpWindowHours = 24`

**Formato de saída esperado:**

- `period`
- `totalSourceRows`
- `missedCount`
- `rescheduledCount`
- `assumedHappenedCount`
- `totalOpenValue`
- `dominantOrigin`
- `originPattern`
- `resultCount`
- `results`

**Código de exemplo:**

```js
async () => {
  const today = new Date();
  const toIso = (d) => d.toISOString();

  // Janela padrão: últimos 30 dias sobre meta.scheduledAt (quando a reunião deveria acontecer).
  const from = new Date(today);
  from.setDate(today.getDate() - 30);
  from.setHours(0, 0, 0, 0);
  today.setHours(23, 59, 59, 999);

  const dateRange = { from: toIso(from), to: toIso(today) };
  const followUpMs = 24 * 60 * 60 * 1000;
  const nowMs = Date.now();
  const fromMs = from.getTime();

  // FASE 1 — pull: todas as atividades Opportunity da janela.
  // Reuniões, ligações, tarefas e notas dividem essa categoria; o corte vem depois.
  const base = await codemode.lead_activities_system_list({
    categories: ['Opportunity'],
    dateRange,
    perPage: 2000
  });
  const baseRows = base?.data || [];

  // FASE 2 — corte client-side: só reuniões com scheduledAt no passado e dentro da janela.
  const candidates = [];
  for (const row of baseRows) {
    const meta = row.meta || {};
    if (meta.type !== 'meeting') continue;
    const scheduledAt = meta.scheduledAt ? new Date(meta.scheduledAt).getTime() : null;
    if (!scheduledAt) continue;
    if (scheduledAt > nowMs) continue; // ainda vai acontecer — não é perdida
    if (scheduledAt < fromMs) continue; // fora da janela
    candidates.push({
      leadId: row.leadId,
      activityId: row.id || null,
      createdAtMs: row.createdAt ? new Date(row.createdAt).getTime() : 0,
      scheduledAtMs: scheduledAt,
      scheduledAtIso: meta.scheduledAt,
      description: meta.description || null,
      opportunityCardId: meta.opportunityCardId || null
    });
  }

  // Agrupar por lead pra buscar a timeline uma vez só por lead.
  const byLead = new Map();
  for (const c of candidates) {
    if (!c.leadId) continue;
    const arr = byLead.get(c.leadId) || [];
    arr.push(c);
    byLead.set(c.leadId, arr);
  }

  // FASE 3 — cruzamento por lead (cap 50): remarcação posterior, follow-up ±24h
  // (reunião provavelmente aconteceu), identidade/origem e valor do card aberto.
  const leadIds = Array.from(byLead.keys()).slice(0, 50);
  const results = [];
  let rescheduledCount = 0;
  let assumedHappenedCount = 0;

  for (const leadId of leadIds) {
    const meetings = byLead.get(leadId) || [];
    const timeline = await codemode.lead_activities_list_by_lead({
      leadId,
      dateRange,
      perPage: 200
    });
    const timelineRows = timeline?.data || [];

    const stillMissed = [];
    for (const m of meetings) {
      // Remarcou? Qualquer reunião posterior no mesmo lead (ou mesmo card) exclui.
      const wasRescheduled = timelineRows.some((r) => {
        const rMeta = r.meta || {};
        if (rMeta.type !== 'meeting') return false;
        const rScheduled = rMeta.scheduledAt ? new Date(rMeta.scheduledAt).getTime() : 0;
        const rCreated = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        const sameCard =
          m.opportunityCardId && rMeta.opportunityCardId
            ? rMeta.opportunityCardId === m.opportunityCardId
            : true;
        if (!sameCard) return false;
        return rScheduled > m.scheduledAtMs || rCreated > m.createdAtMs;
      });
      if (wasRescheduled) {
        rescheduledCount += 1;
        continue;
      }

      // Aconteceu? Nota/tarefa registrada a ±24h do horário marcado = assume que houve.
      const followUp = timelineRows.some((r) => {
        if (r.id && r.id === m.activityId) return false;
        const rCreated = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        if (!rCreated) return false;
        return Math.abs(rCreated - m.scheduledAtMs) <= followUpMs;
      });
      if (followUp) {
        assumedHappenedCount += 1;
        continue;
      }

      stillMissed.push(m);
    }
    if (stillMissed.length === 0) continue;

    stillMissed.sort((a, b) => b.scheduledAtMs - a.scheduledAtMs);
    const last = stillMissed[0];

    // Identidade e origem: preferir campos inline da timeline antes de chamar leads_get.
    const identityRow = timelineRows.find((r) => r.lead || r.contactName || r.contactEmail) || {};
    let contactName = identityRow.contactName || identityRow.lead?.name || null;
    let contactEmail = identityRow.contactEmail || identityRow.lead?.email || null;
    let origin = identityRow.lead?.origin || null;
    let subOrigin = identityRow.lead?.subOrigin || null;
    if (!contactName || !origin) {
      const lead = await codemode.leads_get({ leadId });
      contactName = contactName || lead?.name || '—';
      contactEmail = contactEmail || lead?.email || null;
      origin = origin || lead?.origin || null;
      subOrigin = subOrigin || lead?.subOrigin || null;
    }

    // Valor em risco: card aberto do lead (a proposta esperada que escorregou).
    let openCardValue = null;
    const cards = await codemode.cards_list_by_lead({ leadId });
    const cardRows = cards?.data || cards || [];
    const openCard = (Array.isArray(cardRows) ? cardRows : []).find(
      (c) => (c.status || 'open') === 'open'
    );
    if (openCard && openCard.value != null) openCardValue = Number(openCard.value);

    results.push({
      leadId,
      contactName,
      contactEmail,
      origin,
      subOrigin,
      missedMeetingCount: stillMissed.length,
      lastMissedAt: last.scheduledAtIso,
      daysSinceLastMissed: Math.floor((nowMs - last.scheduledAtMs) / (24 * 60 * 60 * 1000)),
      lastMeetingDescription: last.description,
      openCardValue
    });
  }

  // FASE 4 — agregação do padrão por origem + sort + cap.
  const originCounts = new Map();
  for (const r of results) {
    const key = [r.origin || '—', r.subOrigin || ''].filter(Boolean).join(' / ');
    originCounts.set(key, (originCounts.get(key) || 0) + 1);
  }
  const originPattern = Array.from(originCounts.entries())
    .map(([origin, count]) => ({
      origin,
      count,
      share: results.length ? count / results.length : 0
    }))
    .sort((a, b) => b.count - a.count);
  // Padrão "anúncio problemático": uma origem com >=3 perdas e >=50% da coorte.
  const dominantOrigin =
    originPattern.length && originPattern[0].count >= 3 && originPattern[0].share >= 0.5
      ? originPattern[0]
      : null;

  results.sort((a, b) => new Date(b.lastMissedAt).getTime() - new Date(a.lastMissedAt).getTime());
  const totalOpenValue = results.reduce((sum, r) => sum + (r.openCardValue || 0), 0);

  return {
    period: dateRange,
    totalSourceRows: baseRows.length,
    missedCount: candidates.length,
    rescheduledCount,
    assumedHappenedCount,
    totalOpenValue,
    dominantOrigin,
    originPattern: originPattern.slice(0, 10),
    resultCount: results.length,
    results: results.slice(0, 50)
  };
};
```

**Notas:**

- `meta` pode driftar entre versões de evento — `meta.type` / `meta.scheduledAt` / `meta.opportunityCardId` são facetas do payload, não campos documentados no inputSchema (shape vem do SDK gerado). Se as reuniões vierem vazias, amostre a timeline de um lead via `lead_activities_list_by_lead` sem `categories` pra ver o inventário real de categorias do workspace (o doc lista Lead/Tag/Email/WhatsApp/Members/Payments…) antes de assumir que o filtro quebrou.
- Preferir `contactName` / `contactEmail` / `lead.origin` inline na timeline antes de chamar `leads_get` — fan-out barato.
- Sempre chamar as capacidades do Clickmax via `codemode.*`.
- `question` fora do `execute`, só pra follow-up opt-in (criar tarefa de remarcação, ampliar pra ligações, auditar a origem dominante) — nunca automático.

## Relatório

- Abrir com a premissa: *"Reuniões com `meta.scheduledAt` nos últimos 30 dias, sem reagendamento posterior nem nota/tarefa em ±24h do horário marcado. Inferido por ausência de eventos — se uma reunião aconteceu mas não foi registrada, ela aparece aqui."*
- Liste os formatos de pessoas, limite de 50, ordenados em `lastMissedAt` ordem decrescente; mencione "+N mais" quando `resultCount > 50`.
- Formato por lead: identidade + dias desde a perda + valor do card aberto + origem (ex. de tom: *"Lead João, 19 dias, card de R$ 9.997, origem LR-14"*).
- Se `dominantOrigin` existir, destacar como achado à parte: *"X das Y reuniões perdidas vieram da mesma origem — pode ser promessa do anúncio desalinhada com a reunião; vale auditar antes de remarcar todo mundo"* (na /v10: 5 de 8 vinham do mesmo anúncio, R$ 67.940 parados).
- `missedCount`, `rescheduledCount`, `assumedHappenedCount` e `totalOpenValue` entram uma vez como contexto, não como manchete.
- Follow-ups (criar tarefa de remarcação pro mesmo SDR, incluir ligações/WhatsApps, auditar a origem dominante, mover card) só como opt-in via `question`. Nunca mutar sem confirmação explícita.

## Avisos

- `meta.scheduledAt` é o horário da reunião; `createdAt` é quando foi registrada. A janela aplica sobre `scheduledAt` — não troque.
- Fuso horário importa: trate `meta.scheduledAt` como UTC salvo metadado em contrário; não compare com `Date.now()` ingênuo sem declarar a premissa.
- O no-show automático depende de configuração do workspace (`autoNoShow`) — workspaces sem isso dependem de registro manual, e a inferência por ausência de eventos é o único caminho confiável na superfície MCP.
- `openCardValue` pode vir em centavos (convenção do schema: dinheiro é Int em centavos). Cheque a magnitude antes de somar e formatar como R$.
- Reunião perdida com zero follow-up de qualquer tipo é sinal mais forte que uma com follow-up fraco — as órfãs de verdade vêm primeiro.
- Read-only. Nenhuma tarefa, tag, movimentação de card ou mensagem sem follow-up explícito.

## Antipadrões

- Devolver toda atividade `Opportunity` da janela — inclui ligações, tarefas e notas; o usuário pediu reuniões.
- Incluir reuniões futuras (`meta.scheduledAt > hoje`) — ainda podem acontecer; "últimos 30 dias" implica horário já passado.
- Contar reunião remarcada como perdida — sem a busca forward por reuniões posteriores, a lista mostra reuniões que só mudaram de data.
- Puxar a FASE 1 sem `categories: ['Opportunity']` — page view, pagamento e demais eventos de plataforma não são agenda comercial e afogam as reuniões.
- Loopar `leads_get` por linha quando a timeline já expõe identidade inline — fan-out desperdiçado.
- Tratar a coincidência de origem como veredito — `dominantOrigin` é hipótese pra auditar o anúncio, não prova; com coorte pequena (<3) nem reportar padrão.
- Pedir `cardId`, `workspaceId` ou `ownerId` ao usuário.
