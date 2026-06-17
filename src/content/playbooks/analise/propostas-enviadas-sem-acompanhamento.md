## Quando isso se aplica

O usuário quer a **lista de propostas enviadas há mais de N dias (default 7) sem nenhum follow-up depois** — pipeline morrendo de pé, ordenado por valor parado. "Proposta" **não é uma entidade no Clickmax**: é um card aberto num **stage de proposta** do pipeline, que cada workspace nomeia do seu jeito.

### Distinguir dos playbooks vizinhos

- **meeting-missed-not-rescheduled** — etapa anterior do funil: a reunião caiu antes de existir proposta; aqui a proposta já foi enviada.
- **hot-leads-no-recent-contact** — lead quente intocado, sem deal formalizado; aqui tem um card com valor no estágio de proposta.

## Principais pressupostos

- "Proposta enviada" = card **aberto** num stage cujo nome bate com `/proposta|proposal|orçamento|quote/i`. Não existe `proposalStatus` — o stage É o estado. Se nenhum stage bater, **não chutar**: devolver os stages existentes e confirmar com o usuário via `question`.
- "Enviada há X dias" = quando o card **entrou** no stage de proposta (`cards_history`, evento de movimentação), não o `updatedAt` do card — `updatedAt` muda por qualquer edição (troca de responsável, nota) e mente sobre a idade da proposta.
- "Ninguém voltou a falar" = nenhuma atividade humana (`Email`, `WhatsApp`, `Opportunity`) no lead **depois** da entrada no stage. O inventário de categorias é workspace-específico — se a timeline vier vazia, amostre sem `categories` antes de concluir silêncio.
- Janela default = 7 dias desde a entrada no stage.
- `value` do card pode vir em **centavos** (convenção do schema: dinheiro é Int em centavos) — checar magnitude antes de somar/formatar.
- Playbook read-only. Criar tarefa de follow-up, mover card ou disparar sequência: nunca automático.

## Processo de pensamento

1. **Resolver o estágio primeiro.** `pipelines_list` + `stages_list` e match por regex no nome. Um match → seguir. Vários matches plausíveis em pipelines diferentes → incluir todos (proposta pode viver em mais de um pipeline). Zero matches → parar e confirmar via `question` com a lista de stages reais.
2. **Pull dos cards abertos nos stages de proposta**, com pré-filtro barato por `updatedAt` antigo pra priorizar o fan-out — documentando que é proxy.
3. **Confirmar a idade real e o silêncio por card (cap 50):** `cards_history` pra datar a entrada no stage; `lead_activities_list_by_lead` pra procurar contato humano depois disso. Card com follow-up sai da lista.
4. **Resultado deal-shaped, ordenado por valor desc** — o usuário decide por onde começar pelo dinheiro parado, então os maiores valores vêm primeiro (não os mais antigos).
5. **Declarar a premissa do nome do stage na resposta** — se o workspace chama o stage de outra coisa, o usuário corrige na hora.

## Guia de execução

Usar `execute` porque o playbook precisa de descoberta de stage, leitura por pipeline, datação via histórico, anti-join com atividades por lead, agregação de valor e ranking.

**Entradas padrão:**

- `thresholdDays = 7`
- `maxRows = 2000`
- `fanOutCap = 50`
- `topN = 50`

**Formato de saída esperado:**

- `proposalStages` (ou `needsStageConfirmation` + `candidates`)
- `openCardsInStage`
- `thresholdDays`
- `totalStalledValue`
- `resultCount`
- `results`

**Código de exemplo:**

```js
async () => {
  const nowMs = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const thresholdDays = 7;

  // FASE 1 — pull: descobrir o(s) stage(s) de proposta. Não existe entidade
  // "proposta" — é um stage de pipeline que cada workspace nomeia do seu jeito.
  const pipelines = await codemode.pipelines_list({});
  const pipelineRows = pipelines?.data || pipelines || [];
  const proposalStages = [];
  const allStages = [];
  for (const p of Array.isArray(pipelineRows) ? pipelineRows : []) {
    // stages_list recebe o id do pipeline no campo `id` (param de path).
    const stages = await codemode.stages_list({ id: p.id });
    const stageRows = stages?.data || stages || [];
    for (const s of Array.isArray(stageRows) ? stageRows : []) {
      const entry = {
        pipelineId: p.id,
        pipelineName: p.name || null,
        stageId: s.id,
        stageName: s.name || ''
      };
      allStages.push(entry);
      if (/proposta|proposal|or[cç]amento|quote/i.test(s.name || '')) {
        proposalStages.push(entry);
      }
    }
  }

  // Zero matches → NÃO chutar: devolver os stages reais pro Max confirmar via question.
  if (proposalStages.length === 0) {
    return { needsStageConfirmation: true, candidates: allStages.slice(0, 50) };
  }

  // FASE 2 — pull dos cards abertos nos stages de proposta.
  const candidates = [];
  for (const st of proposalStages) {
    const cards = await codemode.cards_list({
      pipelineId: st.pipelineId,
      stageId: st.stageId,
      perPage: 2000
    });
    const cardRows = cards?.data || cards || [];
    for (const c of Array.isArray(cardRows) ? cardRows : []) {
      if (c.status && c.status !== 'open') continue; // ganho/perdido não é proposta parada
      candidates.push({
        cardId: c.id,
        leadId: c.leadId || c.lead?.id || null,
        title: c.title || c.name || null,
        contactName: c.lead?.name || c.contactName || null,
        contactEmail: c.lead?.email || c.contactEmail || null,
        attendant: c.attendant?.name || c.assignedAttendant?.name || null,
        value: c.value != null ? Number(c.value) : null,
        updatedAtMs: c.updatedAt ? new Date(c.updatedAt).getTime() : 0,
        pipelineName: st.pipelineName,
        stageName: st.stageName
      });
    }
  }

  // Pré-filtro barato (proxy): card sem QUALQUER edição há thresholdDays.
  // Prioriza o fan-out; a datação real vem do histórico na fase 3.
  candidates.sort((a, b) => (b.value || 0) - (a.value || 0));
  const stale = candidates.filter((c) => nowMs - c.updatedAtMs >= thresholdDays * dayMs);

  // FASE 3 — cruzamento por card (cap 50): quando ENTROU no stage + houve contato depois?
  const results = [];
  for (const c of stale.slice(0, 50)) {
    // "Proposta enviada em" = entrada mais recente do card no stage de proposta.
    // cards_history recebe o id do card no campo `id` (param de path).
    let sentAtMs = null;
    const history = await codemode.cards_history({ id: c.cardId });
    const histRows = history?.data || history || [];
    for (const h of Array.isArray(histRows) ? histRows : []) {
      const toStage = h.toStageId || h.toStage?.id || null;
      const at = h.createdAt || h.movedAt || null;
      if (toStage && at && proposalStages.some((s) => s.stageId === toStage)) {
        const ts = new Date(at).getTime();
        if (sentAtMs === null || ts > sentAtMs) sentAtMs = ts;
      }
    }
    // Card criado direto no stage (sem movimentação): cair pro updatedAt como aproximação.
    if (sentAtMs === null) sentAtMs = c.updatedAtMs || null;
    if (!sentAtMs) continue;

    const daysSinceSent = Math.floor((nowMs - sentAtMs) / dayMs);
    if (daysSinceSent < thresholdDays) continue; // entrou no stage faz pouco — ainda no prazo

    // Anti-join: alguma atividade HUMANA no lead depois do envio? Se sim, houve follow-up.
    let lastTouchMs = null;
    if (c.leadId) {
      const timeline = await codemode.lead_activities_list_by_lead({
        leadId: c.leadId,
        perPage: 200
      });
      const rows = timeline?.data || [];
      for (const r of rows) {
        if (!['Email', 'WhatsApp', 'Opportunity'].includes(r.category)) continue;
        const ts = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        if (ts > sentAtMs && (lastTouchMs === null || ts > lastTouchMs)) lastTouchMs = ts;
      }
    }
    if (lastTouchMs !== null) continue; // alguém voltou a falar — fora da lista

    results.push({
      cardId: c.cardId,
      leadId: c.leadId,
      contactName: c.contactName || c.title || '—',
      contactEmail: c.contactEmail,
      attendant: c.attendant,
      pipelineName: c.pipelineName,
      stageName: c.stageName,
      value: c.value,
      sentAt: new Date(sentAtMs).toISOString(),
      daysSinceSent
    });
  }

  // FASE 4 — agregação + sort por valor parado desc + cap.
  const totalStalledValue = results.reduce((sum, r) => sum + (r.value || 0), 0);
  results.sort((a, b) => (b.value || 0) - (a.value || 0));

  return {
    proposalStages,
    openCardsInStage: candidates.length,
    thresholdDays,
    totalStalledValue,
    resultCount: results.length,
    results: results.slice(0, 50)
  };
};
```

**Notas:**

- Se vier `needsStageConfirmation`, use `question` com os nomes reais dos stages ("qual desses é o seu stage de proposta?") e rode de novo com o stage confirmado — nunca escolha sozinho.
- O pré-filtro por `updatedAt` é proxy: um card editado ontem (troca de responsável) pode esconder uma proposta de 10 dias. Se o usuário estranhar a lista curta, remova o pré-filtro e aumente o fan-out.
- Os campos das linhas de `cards_history` (`toStageId`/`toStage.id`, `createdAt`/`movedAt`) e os filtros de `cards_list` (`pipelineId`/`stageId`/`perPage`) vêm dos schemas gerados pelo SDK — os fallbacks no sample cobrem as variações prováveis; se nada bater, confira o shape no worker em vez de inventar campo.
- Sempre chamar as capacidades do Clickmax via `codemode.*`.
- `question` fora do `execute`, só pra confirmação de stage e follow-up opt-in (criar tarefa, mover card, disparar sequência) — nunca automático.

## Relatório

- Abrir com a premissa: *"Cards abertos no stage `<stageName>` (pipeline `<pipelineName>`) que entraram no stage há 7+ dias, sem nenhuma atividade humana (Email/WhatsApp/Opportunity) no lead desde então. 'Proposta' aqui = esse stage — me corrija se o seu for outro."*
- Lista deal-shaped ordenada por `value` desc, cap 50, com "+N more" quando `resultCount > 50`. Formato por linha: contato + valor + dias desde o envio + vendedor responsável (ex. de tom da /v10: *"Lead A — R$ 49.970, há 12 dias"*).
- `totalStalledValue` como contexto de abertura ("R$ 198.490 parados em 11 propostas"), não repetido por linha. Atenção a centavos antes de formatar.
- Vale citar o argumento de cadência uma vez: proposta com follow-up nas duas primeiras semanas fecha muito mais do que proposta no silêncio — e a conexão de 5 minutos é o follow-up mais barato que existe.
- Follow-ups (criar tarefa de follow-up pro mesmo vendedor que enviou, mover card de stage via `cards_move`, sequência D+7/D+10/D+14 via `flows_create`) só como opt-in via `question`. Nunca mutar sem confirmação explícita.

## Avisos

- "Proposta" depende do nome do stage no workspace — esta é a armadilha central. O regex `/proposta|proposal|orçamento|quote/i` cobre o comum, mas workspace que chama o stage de "Negociação" ou "Aguardando cliente" fica invisível. Zero matches = perguntar, nunca assumir.
- `updatedAt` do card ≠ data da proposta. Qualquer edição (responsável, nota, valor) renova o `updatedAt`. A data verdadeira do envio é a entrada no estágio via `cards_history`.
- `value` pode estar em centavos — somar sem checar magnitude infla o total por 100×.
- Card em stage de ganho/perda não é proposta parada — filtrar por card aberto antes de qualquer conta.
- Proposta pode existir em mais de um pipeline (ex.: inbound e outbound) — não parar no primeiro match de stage.
- Read-only. Nenhuma tarefa, movimentação de card ou disparo sem follow-up explícito.

## Antipadrões

- Chutar o stage de proposta quando o regex não bate — devolve coorte do stage errado com confiança total. O caminho é `needsStageConfirmation` + `question`.
- Usar `updatedAt` como "data do envio da proposta" sem consultar `cards_history` — propostas velhas com edição recente somem da lista.
- Contar atividade de sistema (page view, evento de pagamento) como follow-up — só Email/WhatsApp/Opportunity são alguém voltando a falar.
- Ordenar por mais antigo primeiro — o usuário prioriza pelo valor parado; os R$ 49.970 de 12 dias vêm antes dos R$ 900 de 30 dias.
- Rodar `cards_history` + timeline pra TODOS os cards do stage sem cap — fan-out explode em pipelines grandes; o pré-filtro + cap 50 existem por isso.
- Incluir cards ganhos/perdidos que ainda estão "no stage" por dado sujo — o filtro de status aberto é obrigatório.
- Devolver contagem ou só o total em R$ quando o usuário pediu QUAIS propostas — a saída é a lista de deals.
- Pedir `pipelineId` / `workspaceId` ao usuário — descobrir via `pipelines_list`.
