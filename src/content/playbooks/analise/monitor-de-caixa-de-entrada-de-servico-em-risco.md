## Quando isso se aplica

O usuário quer saber **quem atender primeiro**: oportunidades/atendimentos parados que precisam de contato próximo — seja porque o tempo de resposta estourou o SLA do pipeline, seja porque o **valor da oportunidade parada** é alto. Saída = fila priorizada de cards (valor × dias parado ÷ SLA), com o **atendente responsável** por cada um.

### Desambiguação dos vizinhos

- **hot-leads-no-recent-contact** olha **leads** (contatos do CRM) por score sem toque recente. Aqui a unidade é o **card de oportunidade** no pipeline, e o ranking cruza dinheiro com atraso normalizado pelo SLA.
- **meeting-missed-not-rescheduled** trata um touchpoint específico que caiu (reunião no_show sem remarcação). Aqui é o monitor geral da fila: qualquer card parado conta.
- **weekly-hidden-money-summary** é o orquestrador agendado de várias frentes; este monitor é a frente de atendimento em profundidade — pode rodar agendado (diário) por conta própria.

## Principais pressupostos

- O limiar de "parado" é o **SLA configurado por pipeline** (`pipelines_settings_get` — no schema, `OpportunityPipelineSettings.slaInactivityDays`, default 7). O default de 14 dias do `cards_at_risk` é fallback de tool, **não** o SLA do workspace — cada pipeline pode ter o seu.
- "Dias parado" do `cards_at_risk` deriva de movimentação do card; o `updatedAt` mexe com **qualquer** edição (mover, trocar campo), não só contato real. O último contato HUMANO de verdade vem de `lead_activities_list_by_lead` nas categorias `['Email', 'WhatsApp', 'Opportunity']` — checado só no topo do ranking (fan-out limitado).
- Ranking = `valor do card × (dias parado ÷ SLA do pipeline)`. A padronização pelo SLA é o que faz 10 dias num pipeline de SLA 3 valer mais que 15 dias num pipeline de SLA 14.
- Card **sem valor** não some da fila: `max(valor, 1)` mantém o ranking pelo atraso, mas a prioridade fica subestimada — sinalizar.
- Só cards **abertos** entram (ganho/perdido não é fila de atendimento).
- Dinheiro no schema é Int em **centavos** — confirmar a escala do `value` do card antes de exibir R$ (o ranking é invariante à unidade; a exibição não).
- Read-only por padrão. `cards_assign_attendants` / `cards_move` só com confirmação explícita.

## Processo de pensamento

1. **Mapear pipelines e SLAs primeiro.** `pipelines_list` + `pipelines_settings_get` por pipeline — sem isso, qualquer limiar de "parado" é chute. Pipeline sem SLA configurado usa fallback 7 dias (o default do schema), declarado no report.
2. **Puxar os cards em risco POR pipeline**, com `idleDays` = SLA daquele pipeline (não o default global de 14). Em paralelo, `cards_list` por pipeline pra obter valor, stage e atendente de cada card.
3. **Cruzar e ranquear:** juntar dias parado (at_risk) com valor/atendente (list); score = `max(valor,1) × (diasParado ÷ SLA)`; só cards abertos.
4. **Corroborar o topo com contato real.** `lead_activities_list_by_lead` apenas nos primeiros 15 do ranking — confirma se o "parado" é de verdade ou se houve contato que não moveu o card.
5. **Entregar a fila com responsável.** Top 30, agrupável por atendente. Reatribuir (`cards_assign_attendants`) ou mover (`cards_move`) é follow-up opt-in via `question`, nunca automático.

## Guia de execução

Usar `execute` porque o playbook precisa de leituras por pipeline em paralelo, join `cards_at_risk` × `cards_list`, normalização por SLA, ranking e fan-out limitado de atividades.

**Entradas padrão:**

- `slaFallbackDays = 7`
- `maxPipelines = 10`
- `maxRows = 2000`
- `topN = 30`
- `contactFanout = 15`

**Formato de saída esperado:**

- `pipelines`
- `slaByPipeline`
- `atRiskTotal`
- `resultCount`
- `results`

**Código de exemplo:**

```js
async () => {
  const slaFallbackDays = 7; // default do schema quando o pipeline não configurou SLA
  const maxPipelines = 10;
  const topN = 30;
  const contactFanout = 15; // só o topo do ranking ganha checagem de contato real
  const dayMs = 86400000;
  const now = Date.now();

  // ── FASE 1 (pull): pipelines, SLA por pipeline, cards em risco e valores ──
  const pipesRes = await codemode.pipelines_list({});
  const pipelines = (pipesRes?.data || pipesRes || []).slice(0, maxPipelines);
  if (!pipelines.length) {
    return { pipelines: 0, slaByPipeline: [], atRiskTotal: 0, resultCount: 0, results: [] };
  }

  // pipelines_settings_get recebe o id do pipeline no campo `id` (param de path).
  const settings = await Promise.all(
    pipelines.map((p) => codemode.pipelines_settings_get({ id: p.id }).catch(() => null))
  );
  const slaByPipeline = new Map();
  pipelines.forEach((p, i) => {
    const s = settings[i] || {};
    const sla = Number(s.slaInactivityDays || s.idleDays || s.sla || 0) || slaFallbackDays;
    slaByPipeline.set(p.id, sla);
  });

  // cards_at_risk por pipeline usando o SLA DAQUELE pipeline como idleDays —
  // nunca o default global de 14 dias. cards_list traz valor/atendente/stage.
  const [atRiskAll, listsAll] = await Promise.all([
    Promise.all(pipelines.map((p) => codemode.cards_at_risk({ pipelineId: p.id, idleDays: slaByPipeline.get(p.id) }).catch(() => null))),
    Promise.all(pipelines.map((p) => codemode.cards_list({ pipelineId: p.id, perPage: 2000 }).catch(() => null)))
  ]);

  // ── FASE 2 (cruzamento): juntar dias parado (at_risk) com valor/atendente (list) ──
  const cardInfo = new Map();
  pipelines.forEach((p, i) => {
    for (const c of listsAll[i]?.data || listsAll[i] || []) {
      if (c && c.id) cardInfo.set(c.id, c);
    }
  });

  const candidates = [];
  pipelines.forEach((p, i) => {
    const sla = slaByPipeline.get(p.id);
    for (const r of atRiskAll[i]?.data || atRiskAll[i] || []) {
      const cardId = r.cardId || r.id;
      if (!cardId) continue;
      const info = cardInfo.get(cardId) || {};
      // Só oportunidade aberta — ganho/perdido não é fila de atendimento.
      const status = (info.status || r.status || 'open').toLowerCase();
      if (status !== 'open') continue;
      const idleDays = Number(r.idleDays || r.daysIdle || r.daysStalled || 0);
      const value = Number(info.value || r.value || 0);
      const slaRatio = sla > 0 ? idleDays / sla : 0;
      candidates.push({
        cardId,
        title: info.title || r.title || '—',
        pipeline: p.name || p.title || p.id,
        stage: info.stageName || info.stage?.name || null,
        attendant: (info.attendants && info.attendants[0] && (info.attendants[0].name || info.attendants[0])) || r.attendant || null,
        leadId: info.leadId || r.leadId || null,
        value,
        valueMissing: !value, // sem valor = prioridade subestimada, sinalizar
        idleDays,
        slaDays: sla,
        slaRatio: Number(slaRatio.toFixed(2)),
        // Valor × estouro do SLA. max(value,1) mantém card sem valor na fila, ranqueado pelo atraso.
        priorityScore: Math.round(Math.max(value, 1) * slaRatio)
      });
    }
  });

  // ── FASE 3 (agregação): último contato HUMANO real só pro topo do ranking ──
  candidates.sort((a, b) => b.priorityScore - a.priorityScore);
  const top = candidates.slice(0, topN);
  const fanout = top.slice(0, contactFanout).filter((c) => c.leadId);
  const activities = await Promise.all(
    fanout.map((c) => codemode.lead_activities_list_by_lead({ leadId: c.leadId, categories: ['Email', 'WhatsApp', 'Opportunity'], perPage: 10, column: 'createdAt', order: 'desc' }).catch(() => null))
  );
  fanout.forEach((c, i) => {
    const rows = activities[i]?.data || [];
    const last = rows[0] || null;
    c.lastRealContactAt = last ? last.createdAt || null : null;
    c.daysSinceRealContact = last && last.createdAt ? Math.floor((now - new Date(last.createdAt).getTime()) / dayMs) : null;
  });

  // ── FASE 4 (sort + cap): fila final "quem atender primeiro" ──
  return {
    pipelines: pipelines.length,
    slaByPipeline: pipelines.map((p) => ({ pipeline: p.name || p.id, slaDays: slaByPipeline.get(p.id) })),
    atRiskTotal: candidates.length,
    resultCount: candidates.length,
    results: top
  };
};
```

**Notas:**

- O sample cobre variações de shape (`idleDays`/`daysIdle`, `attendants[0]`, `stage.name`) — ajuste os fallbacks ao payload real, nunca a lógica de normalização pelo SLA.
- O nome exato do campo de SLA na resposta de `pipelines_settings_get` (`slaInactivityDays` no schema do banco) e os filtros de escopo do `cards_at_risk` (`pipelineId`, atendente) vêm dos schemas gerados pelo SDK — os fallbacks cobrem as variações prováveis; se nada bater, confira o shape no worker em vez de inventar campo.
- O `column`/`order` da timeline vem do schema gerado pelo SDK; se a chamada rejeitar, caia pra calcular o max de `createdAt` client-side.
- `daysSinceRealContact > idleDays` significa que o card foi mexido sem contato real — o atraso de atendimento é MAIOR do que o card sugere. `daysSinceRealContact < idleDays` significa que houve contato que não moveu o card — rebaixar na narrativa.
- Se o usuário pedir o recorte de UM atendente ou UM pipeline, filtre no escopo do `cards_at_risk` (a tool aceita escopo por pipeline/attendant) em vez de filtrar client-side.
- Ajuste apenas caps, fallback de SLA e fallbacks de shape. A forma do retorno é intencional.
- Sempre chame as capacidades do Clickmax via `codemode.*`.
- `question` fora do `execute` para os follow-ups de mutação (reatribuir, mover, criar tarefa) — nunca automaticamente.

## Relatório

- Abrir com a premissa: *"Fila de atendimento priorizada por valor do card × dias parado, normalizado pelo SLA de cada pipeline (SLAs: X dias no pipeline A, Y no B; pipelines sem SLA configurado usam 7 dias)."*
- Renderizar a fila top 30 ordenada por `priorityScore` desc, com colunas: card · pipeline/stage · atendente responsável · valor · dias parado vs. SLA (ex.: *"12d / SLA 3d = 4× estourado"*) · último contato real (quando checado).
- Mencionar "+N more" quando `atRiskTotal > 30`.
- Sinalizar cards com `valueMissing` ("sem valor preenchido — prioridade possivelmente subestimada") e divergências entre dias parado e contato real.
- Agrupar um resumo por atendente (quantos cards estourados cada um tem) como contexto, uma vez — sem apontar culpado, apontando fila.
- Follow-ups só como opt-in via `question`: reatribuir os críticos a outro atendente (`cards_assign_attendants`), mover card de stage (`cards_move`), criar tarefa de contato, ou agendar este monitor como rotina diária. Nunca executar mutação sem confirmação explícita.

## Avisos

- O SLA é configurável por pipeline (`slaInactivityDays`, default 7 no schema) — não use o default de 14 dias do `cards_at_risk` como se fosse o SLA, e não invente um número único pro workspace inteiro.
- `updatedAt` do card mexe com qualquer edição — mover de coluna "renova" o card sem ninguém ter falado com o cliente. Por isso a checagem de contato real via `lead_activities_list_by_lead` no topo do ranking.
- Valor do card pode estar em centavos (padrão do schema para dinheiro). Confirme a escala antes de exibir R$ — um card de R$ 500,00 exibido como R$ 50.000 destrói a confiança na fila.
- Stage de "proposta"/"atendimento" é nomeado pelo workspace (não há enum de stage) — nunca filtrar por nome de stage hardcodado; o escopo é o pipeline.
- Cards sem `leadId` não têm como checar contato real — mantêm o score, mas sem corroboração.
- Read-only por padrão: `cards_assign_attendants` e `cards_move` existem no playbook apenas como follow-up confirmado pelo usuário.

## Antipadrões

- Chamar `cards_at_risk` com o `idleDays` default (14) ignorando o SLA configurado de cada pipeline — o monitor inteiro perde o sentido da normalização.
- Ranquear só por dias parado (ignora o dinheiro) ou só por valor (ignora o atraso) — o pedido é exatamente o cruzamento dos dois.
- Fan-out de `lead_activities_list_by_lead` para TODOS os cards em risco — só o topo do ranking (cap 15); o resto usa o `idleDays` da tool.
- Incluir cards ganhos/perdidos na fila porque vieram no `cards_list`.
- Reatribuir atendente ou mover card automaticamente "porque o SLA estourou" — mutação é sempre opt-in.
- Tratar o resumo por atendente como ranking de culpados — o produto é a fila de quem atender, não uma avaliação de pessoas.
- Pedir `workspaceId` / `ownerId` ao usuário.
