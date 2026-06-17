## Quando isso se aplica

O usuário quer a **lista de leads com nota alta (score > 70) parados há mais de 48h sem contato humano** — alta intenção, ninguém falou. Saída é people-shaped, rankeada por **urgência = score × tempo parado**: o nota 92 parado há 96h fura a fila de um nota 75 parado há 50h.

### Distinguir dos playbooks vizinhos

- **meeting-missed-not-rescheduled** — lá houve um touchpoint agendado que caiu; aqui o lead está **intocado**.
- **proposals-sent-no-follow-up** — lá o deal já tem proposta no pipeline; aqui o lead ainda nem chegou lá.
- **gold-leads-high-ticket-agenda** — lá é qualificação proativa (score + renda) pra lotar agenda; aqui é tempo de reação sobre quem já está quente.

## Principais pressupostos

- Threshold de score default `>= 70`. O leaf real do filtro é **descoberto por workspace** — chame `leads_filter_schema` 1× no início pra achar `score` / `leadScore` / `temperatureScore`. Chutar o leaf errado devolve coorte vazia em silêncio.
- "Contato" = atividades nas categorias `['Email', 'WhatsApp', 'Opportunity']` (e-mail enviado, conversa de mensageria, atividade manual de venda). **Não** contam: `Lead` (mudança de status), `Tag`, `Members`, `Payments` e demais eventos automáticos (page view, checkout) — não é gente falando com gente. O inventário de categorias é workspace-específico (o doc lista Lead/Tag/Email/WhatsApp/Members/Payments…) — se a timeline vier vazia, amostre sem `categories` antes de concluir que não houve contato.
- Limiar de dormência default = `48h` (o que o usuário pediu). A janela de busca de atividades precisa ser **mais larga** (default 14 dias) pra distinguir "parado há 5 dias" de "nunca contatado na janela".
- "Parado" pressupõe lead ainda em jogo: excluir `purchased` / `churned` via leaves negados (`negation: true`) no filtro V2. Os valores de `status` são enum por espaço de trabalho — `created` / `engaged` / `purchased` / `renewed` / `churned` são os exemplos documentados.
- Temperatura existe em DOIS níveis no schema: a do lead e a do deal (card). Este playbook decide pelo **lead** (`leads_search`); se o usuário fala de "cards parados", o caminho é `cards_at_risk`, não este.
- Playbook read-only. Notificar atendente, atribuir card, tag ou mensagem: nunca automático.

## Processo de pensamento

1. **Descobrir o leaf de score primeiro.** `leads_filter_schema` sempre, cache na sessão, nunca chutar o nome do campo.
2. **Caminho padrão = coorte + fan-out capado.** Coorte A (leads score alto, ativos) via `leads_search`; último contato humano por lead via `lead_activities_list_by_lead` (categorias de contato, janela larga), só pros top `fanOutCap` por score; classificar em JS.
3. **Ranquear por score × horas parado**, não por score puro — o pedido é "quem está sangrando mais rápido", e a urgência composta captura exatamente isso. O top 1 vira o "caso mais crítico do dia".
4. **Trocar de caminho** se o usuário quis dizer "contato manual do comercial": derrubar `Email` do set de categorias e ficar com `['WhatsApp', 'Opportunity']` (workspaces com drip automático contam e-mail de robô como contato). Confirmar via `question` só se o resultado ficar implausivelmente pequeno.
5. **Resultado compacto:** lista única rankeada por urgência, cap 50, com `criticalLead` destacado e o atendente responsável em cada linha.

## Guia de execução

Usar `execute` porque o playbook precisa de descoberta de schema, duas leituras paginadas, join de conjuntos, classificação e ranking composto.

**Entradas padrão:**

- `scoreThreshold = 70`
- `dormancyHours = 48`
- `lookupDays = 14`
- `maxRows = 2000`
- `fanOutCap = 150`
- `topN = 50`

**Formato de saída esperado:**

- `period`
- `scoreLeaf`
- `cohortASize`
- `checkedLeads`
- `resultCount`
- `criticalLead`
- `results`

**Código de exemplo:**

```js
async () => {
  const today = new Date();
  const toIso = (d) => d.toISOString();

  // Janela de busca de atividades: mais larga que o limiar de 48h,
  // senão não dá pra rotular "parado há quanto tempo".
  const lookupFrom = new Date(today);
  lookupFrom.setDate(today.getDate() - 14);
  lookupFrom.setHours(0, 0, 0, 0);
  today.setHours(23, 59, 59, 999);

  const dormancyMs = 48 * 60 * 60 * 1000;
  const nowMs = today.getTime();
  const dormancyCutoff = nowMs - dormancyMs;

  // FASE 1 — descobrir o leaf de score no schema do workspace (nunca chutar).
  const schema = await codemode.leads_filter_schema();
  const schemaStr = JSON.stringify(schema || {}).toLowerCase();
  const scoreLeaf =
    (schemaStr.includes('"leadscore"') && 'leadScore') ||
    (schemaStr.includes('"temperaturescore"') && 'temperatureScore') ||
    (schemaStr.includes('"score"') && 'score') ||
    'score';

  // FASE 2 — pull A: leads com score alto, fora de purchased/churned.
  // leads_search usa o modelo de filtro V2 (o mesmo do leads_filter_schema):
  // array de leaves { id, order, field, operator, negation, valueX }, AND implícito.
  const uid = () => crypto.randomUUID();
  const cohortA = await codemode.leads_search({
    filters: [
      { id: uid(), order: 0, field: scoreLeaf, operator: 'greaterThanOrEqual', negation: false, valueNumber: 70 },
      { id: uid(), order: 1, field: 'status', operator: 'equals', negation: true, valueString: 'purchased' },
      { id: uid(), order: 2, field: 'status', operator: 'equals', negation: true, valueString: 'churned' }
    ],
    page: 1,
    perPage: 2000
  });
  const leadRows = cohortA?.data || [];

  // FASE 2b — ordenar por score e capar o fan-out: a checagem de contato é
  // por lead (timeline), então só os top 150 por score entram na verificação.
  leadRows.sort(
    (a, b) => Number(b[scoreLeaf] ?? b.score ?? 0) - Number(a[scoreLeaf] ?? a.score ?? 0)
  );
  const checked = leadRows.slice(0, 150);

  // FASE 3 — cruzamento: último contato humano por lead via timeline, em lotes de 10.
  // Email/WhatsApp/Opportunity = contato real; Lead/Tag/Members/Payments etc. NÃO contam.
  const lastContactByLead = new Map();
  for (let i = 0; i < checked.length; i += 10) {
    const batch = checked.slice(i, i + 10);
    const timelines = await Promise.all(
      batch.map((lead) =>
        codemode
          .lead_activities_list_by_lead({
            leadId: lead.id || lead.leadId,
            categories: ['Email', 'WhatsApp', 'Opportunity'],
            dateRange: { from: toIso(lookupFrom), to: toIso(today) },
            perPage: 10,
            column: 'createdAt',
            order: 'desc'
          })
          .catch(() => null)
      )
    );
    batch.forEach((lead, j) => {
      const rows = timelines[j]?.data || [];
      const last = rows[0] || null;
      const at = last ? last.createdAt || last.occurredAt || null : null;
      if (!at) return;
      lastContactByLead.set(lead.id || lead.leadId, {
        ts: new Date(at).getTime(),
        lastAt: at,
        lastCategory: last.category || null
      });
    });
  }

  // FASE 4 — classificação + ranking por urgência (score × horas parado) + cap.
  const stalled = [];
  for (const lead of checked) {
    const leadId = lead.id || lead.leadId;
    const contact = lastContactByLead.get(leadId);
    if (contact && contact.ts >= dormancyCutoff) continue; // contatado nas últimas 48h — fora

    // Sem contato na janela: tempo parado conta desde o início da janela (piso conservador).
    const idleMs = contact ? nowMs - contact.ts : nowMs - lookupFrom.getTime();
    const hoursIdle = Math.floor(idleMs / (60 * 60 * 1000));
    const score = Number(lead[scoreLeaf] ?? lead.score ?? 0);

    stalled.push({
      leadId,
      contactName: lead.name || lead.contactName || '—',
      contactEmail: lead.email || lead.contactEmail || null,
      phone: lead.phone || lead.contactPhone || null,
      score,
      leadStatus: lead.status || null,
      assignedAttendant: lead.assignedAttendant?.name || lead.attendant?.name || null,
      lastContactAt: contact?.lastAt || null,
      lastContactCategory: contact?.lastCategory || null,
      hoursIdle,
      neverContactedInWindow: !contact,
      // urgência composta: nota 92 parado há 96h fura a fila de um 75 parado há 50h.
      urgency: score * hoursIdle
    });
  }

  stalled.sort((a, b) => b.urgency - a.urgency);

  return {
    period: { from: toIso(lookupFrom), to: toIso(today) },
    scoreLeaf,
    cohortASize: leadRows.length,
    checkedLeads: checked.length,
    resultCount: stalled.length,
    criticalLead: stalled[0] || null,
    results: stalled.slice(0, 50)
  };
};
```

**Notas:**

- O sample assume identidade inline (`name` / `email` / `phone`) na linha do `leads_search`; se o workspace aninhar em outro objeto, estenda os fallbacks.
- O shape exato do body do `leads_search` (paginação `page`/`perPage`) e o `column`/`order` da timeline vêm dos schemas gerados pelo SDK e não estão documentados campo a campo — se a chamada rejeitar um campo, confira o shape no worker e, no caso da ordenação, caia pra calcular o max de `createdAt` client-side.
- Ajuste só o threshold de score, a janela de dormência, o escopo de lifecycle, o set de categorias de contato ou o `fanOutCap`. O shape ranqueado por urgência é intencional — mantenha a resposta compacta.
- Sempre chamar as capacidades do Clickmax via `codemode.*`.
- `question` fora do `execute`, só pra follow-up opt-in (notificar atendente, atribuir card, tag, mensagem de reengajamento) — nunca automático.

## Relatório

- Abrir com a premissa: *"Leads com score >= 70 (campo `<scoreLeaf>`) cuja última atividade humana (Email/WhatsApp/Opportunity) foi há mais de 48h — ou ausente nos últimos 14 dias. Ranqueado por score × tempo parado."*
- Manchete = `criticalLead`: nome, nota, horas parado, atendente responsável e o último contexto. Tom da /v10: *"Maria Santos, nota 92, parada há 96 horas com Peçanha — ela pediu proposta na última conversa; a bola está no nosso campo"*.
- Depois a lista ranqueada por `urgency` desc, cap 50, com "+N more" quando `resultCount > 50`. Marcar quem é `neverContactedInWindow` ("sem contato na janela de 14 dias" — não é "nunca na vida"; o bot não paginou o histórico todo).
- `cohortASize` e `checkedLeads` entram uma vez como contexto, não como manchete; quando `cohortASize > checkedLeads`, dizer que a checagem cobriu os top por score (fan-out capado).
- Follow-ups (notificar o atendente do crítico agora, atribuir atendente via `cards_assign_attendants`, tag, mensagem de reengajamento, regra automática pra futuro via `flows_create`) só como opt-in via `question`. Nunca mutar sem confirmação explícita.

## Avisos

- Sempre `leads_filter_schema` antes de `leads_search`. Chutar o leaf de score é a falha silenciosa mais comum: coorte vazia e resposta confiantemente errada.
- O set de contato default inclui `Email`. Workspace com drip automático pesado conta e-mail de robô como "contato" e esconde leads largados — se o usuário quis "contato do comercial", estreite pra `['WhatsApp', 'Opportunity']`.
- 48h é o limiar de dormência; a janela do `lead_activities_list_by_lead` precisa ser mais larga (14 dias), senão "nunca contatado" e "contatado há 5 dias" ficam indistinguíveis.
- O limiar de "parado" do próprio workspace vive nas configurações de pipeline (SLA de inatividade, default 7 dias — visível via `pipelines_settings_get`). Aqui vale 48h porque o usuário pediu; se ele falar "usa meu SLA", leia a configuração em vez de assumir.
- Temperatura do lead ≠ temperatura do card. Este playbook olha o lead; deal parado em stage é outro playbook (`cards_at_risk` cobre isso por pipeline).
- Read-only. Nenhum `cards_assign_attendants`, tag ou mensagem sem follow-up explícito.

## Antipadrões

- Hardcodar o leaf de score (`score`, `leadScore`, …) sem chamar `leads_filter_schema` primeiro.
- Tratar toda atividade do CRM como "contato" — `Lead` (mudança de status), `Tag`, `Members`, `Payments` e demais eventos automáticos NÃO são contato humano.
- Puxar `lead_activities_list_by_lead` com janela de só 48h — destrói o rótulo de tempo parado e o sub-grupo "nunca contatado".
- Fan-out de `lead_activities_list_by_lead` na coorte inteira sem cap — o limite é `fanOutCap` (top por score), o resto fica fora da checagem.
- Ordenar por score puro — o pedido é urgência; score 92 parado 96h vem antes de score 95 parado 49h. Sem o composto, o ranking erra a fila.
- Usar `lead_activities_system_list` — eventos de sistema (page view, pagamento) não são contato humano.
- Incluir leads `purchased` / `churned` porque o score continua alto — não estão mais "parados no pipeline".
- Devolver contagem quando o usuário perguntou QUEM — a saída é sempre people-shaped.
- Pedir `workspaceId` / `ownerId` ou perguntar o set de categorias quando os defaults são razoáveis.
