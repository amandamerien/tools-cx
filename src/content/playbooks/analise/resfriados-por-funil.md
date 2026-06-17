## Quando isso se aplica

O usuário quer os **leads que tinham sinal de calor e esfriaram numa janela recente (default 90 dias) sem nunca comprar**, agrupados pelo **funil de origem** — porque cada funil pede uma estratégia de reativação diferente.

### Desambiguação dos vizinhos

- **lapsed-customers-still-opening-emails** — CLIENTES com compra paga que pararam de comprar. Aqui são LEADS que nunca converteram.
- **hot-leads-no-recent-contact** — lead **ainda quente** parado sem contato: urgência do comercial. Aqui o lead **já esfriou**: trabalho de reativação de marketing.
- **campaign-ltv-scale-decision** — decisão de verba por canal (agregado). Aqui a saída é lista de leads por funil.

## Principais pressupostos

- Janela default = 90 dias; "parado" = sem atividade há 21+ dias dentro dela.
- **O histórico de temperatura pode não ser filtrável via MCP.** O proxy de "esfriou" é: teve atividade dentro da janela (estava vivo), parou há 21+ dias, e o estado atual não é quente. Declarar o proxy na resposta.
- Chamar `leads_filter_schema` 1× no início — os nomes reais dos filtros (score, temperatura, última atividade, campos customizados) variam por workspace; nunca chutar nome de campo.
- "Sem comprar" = nenhuma transação `paid` na janela — subtrair via `dashboard_my_sales`, cruzando por e-mail minúsculo.
- Funil de origem = `origin` / `subOrigin` do lead; labels legíveis vêm de `leads_origins_tree`.
- A estratégia por funil deriva do **ticket do produto de entrada** do funil (regra de Report, não de código): entrada barata → reoferta com desconto; produto caro → ligação de SDR; isca grátis → e-mail automático mínimo.
- Playbook read-only. Campanhas por funil só como follow-up opt-in.

## Processo de pensamento

1. **Descobrir os filtros reais** com `leads_filter_schema` antes de montar qualquer busca — workspaces têm campos custom e nomes diferentes pra score/temperatura/última atividade.
2. **Definir o proxy de esfriamento** (sem histórico filtrável): atividade existiu na janela de 90d, parou há ≥21d, estado atual não-quente. Não usar "score baixo" sozinho — lead que sempre foi frio não "esfriou".
3. **Subtrair compradores** da janela via `dashboard_my_sales` (`paid`) — quem converteu não é reativação.
4. **Agrupar por funil de origem** com labels de `leads_origins_tree`; confirmar o decaimento nos top leads com `lead_activities_metrics_by_lead` (fan-out cap 30).
5. **Formato:** grupos por funil ordenados por tamanho + lista plana dos leads mais quentes (por pontuação), cap 50 total, com a estratégia sugerida por funil na resposta.

## Guia de execução

Usar `execute` porque o playbook precisa de descoberta de schema, busca filtrada, subtração de compradores, agrupamento por origem e fan-out limitado de métricas.

**Entradas padrão:**

- `windowDays = 90`
- `cooledIdleDays = 21`
- `maxRows = 2000`
- `topN = 50`
- `metricsFanOut = 30`

**Formato de saída esperado:**

- `period`
- `proxyNote`
- `candidateCount`
- `excludedBuyers`
- `funnels`
- `resultCount`
- `results`

**Código de exemplo:**

```js
async () => {
  const today = new Date();
  const toIso = (d) => d.toISOString();

  // Janela padrão: atividade nos últimos 90 dias, parada há 21+.
  const windowFrom = new Date(today);
  windowFrom.setDate(today.getDate() - 90);
  windowFrom.setHours(0, 0, 0, 0);
  const cooledCutoff = new Date(today);
  cooledCutoff.setDate(today.getDate() - 21);
  today.setHours(23, 59, 59, 999);

  // FASE 1 — pull: descobrir os filtros reais ANTES de buscar.
  const schema = await codemode.leads_filter_schema();
  const schemaFields = schema?.data || schema || null;

  // Filtro no modelo V2 documentado: array de folhas
  // { id, order, field, operator, negation, value*, parentId? };
  // grupo OR via field='children'. temperatureStatus é folha documentada.
  const tempGroupId = crypto.randomUUID();
  const leadsResp = await codemode.leads_search({
    filters: [
      { id: tempGroupId, order: 0, field: 'children', operator: 'childrenOr', negation: false },
      { id: crypto.randomUUID(), order: 0, field: 'temperatureStatus', operator: 'equals', negation: false, valueString: 'warm', parentId: tempGroupId },
      { id: crypto.randomUUID(), order: 1, field: 'temperatureStatus', operator: 'equals', negation: false, valueString: 'cold', parentId: tempGroupId }
    ],
    perPage: 2000,
    page: 1
  });
  const rawCandidates = leadsResp?.data || [];

  // "Teve atividade na janela e parou há 21+ dias": não há folha documentada
  // de última atividade — corte client-side no campo que os rows expõem.
  // Se o leads_filter_schema expuser uma folha de data de atividade, prefira
  // filtrar server-side (a página de 2000 pode não cobrir bases grandes).
  const windowFromMs = windowFrom.getTime();
  const cooledCutoffMs = cooledCutoff.getTime();
  const candidates = rawCandidates.filter((l) => {
    const at = l.lastActivityAt || l.lastInteractionAt || null;
    const ms = at ? new Date(at).getTime() : 0;
    return ms >= windowFromMs && ms < cooledCutoffMs;
  });

  // FASE 2 — subtração: quem comprou (paid) na janela sai da lista.
  const paid = await codemode.dashboard_my_sales({
    filters: {
      transactionStatus: ['paid'],
      transactionPeriod: { from: toIso(windowFrom), to: toIso(today) }
    },
    perPage: 2000,
    column: 'createdAt',
    order: 'desc'
  });
  const paidEmails = new Set(
    (paid?.data || []).map((r) => (r.contactEmail || '').toLowerCase()).filter(Boolean)
  );
  const cooled = candidates.filter((l) => !paidEmails.has((l.email || '').toLowerCase()));

  // FASE 3 — agregação: agrupar por funil de origem com labels reais.
  const tree = await codemode.leads_origins_tree({});
  const labelByOrigin = new Map();
  for (const node of tree?.data || []) {
    const key = node.id || node.key || node.origin;
    labelByOrigin.set(key, node.label || node.name || String(key));
    for (const child of node.children || node.subOrigins || []) {
      const ckey = child.id || child.key || child.subOrigin;
      labelByOrigin.set(ckey, child.label || child.name || String(ckey));
    }
  }

  const groups = new Map();
  for (const lead of cooled) {
    const originKey = lead.subOrigin || lead.origin || 'desconhecida';
    let g = groups.get(originKey);
    if (!g) {
      g = { originKey, label: labelByOrigin.get(originKey) || String(originKey), leadCount: 0, scoreSum: 0, sample: [] };
      groups.set(originKey, g);
    }
    g.leadCount += 1;
    g.scoreSum += Number(lead.temperatureScore || lead.score || 0);
    if (g.sample.length < 5) g.sample.push({ name: lead.name || '—', email: lead.email || null });
  }
  const funnels = Array.from(groups.values())
    .map((g) => ({
      originKey: g.originKey,
      label: g.label,
      leadCount: g.leadCount,
      avgScore: g.leadCount ? Math.round(g.scoreSum / g.leadCount) : 0,
      sample: g.sample
    }))
    .sort((a, b) => b.leadCount - a.leadCount);

  // FASE 4 — sort + cap: lista plana por score desc, cap 50;
  // confirmação de decaimento só nos 30 primeiros (fan-out limitado).
  const flat = cooled
    .map((l) => ({
      leadId: l.id || l.leadId || null,
      name: l.name || '—',
      email: l.email || null,
      score: Number(l.temperatureScore || l.score || 0),
      lastActivityAt: l.lastActivityAt || l.lastInteractionAt || null,
      originKey: l.subOrigin || l.origin || 'desconhecida',
      funnel: labelByOrigin.get(l.subOrigin || l.origin) || String(l.subOrigin || l.origin || 'desconhecida')
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);

  const recent30 = new Date(today);
  recent30.setDate(recent30.getDate() - 30);
  for (const lead of flat.slice(0, 30)) {
    if (!lead.leadId) continue;
    try {
      const metrics = await codemode.lead_activities_metrics_by_lead({
        leadId: lead.leadId,
        startDate: toIso(recent30),
        endDate: toIso(today)
      });
      const buckets = metrics?.data || [];
      const count30 = buckets.reduce((sum, b) => sum + Number(b.count || b.total || 0), 0);
      lead.activity30d = count30;
      lead.trend = count30 === 0 ? 'sem atividade 30d (esfriou)' : 'atividade residual';
    } catch (_e) {
      lead.activity30d = null;
      lead.trend = null;
    }
  }

  return {
    period: { from: toIso(windowFrom), cooledCutoff: toIso(cooledCutoff), to: toIso(today) },
    proxyNote:
      'Histórico de temperatura não filtrado diretamente — proxy: atividade na janela + parado 21d+ + estado atual não-quente.',
    schemaFieldsAvailable: schemaFields ? true : false,
    candidateCount: candidates.length,
    excludedBuyers: candidates.length - cooled.length,
    funnels: funnels.slice(0, 12),
    resultCount: flat.length,
    results: flat
  };
};
```

**Notas:**

- O filtro de `leads_search` segue o modelo V2 documentado (folhas `{ id, order, field, operator, negation, value*, parentId? }`, grupos via `field='children'`). `temperatureStatus` é folha documentada; folha de data de última atividade varia por workspace — conferir no retorno de `leads_filter_schema` e preferir server-side quando existir.
- Ajustar só filtros (janela, idle, status de temperatura), fallbacks de campo ou caps. Manter a forma.
- Sempre chamar capacidades do Clickmax via `codemode.*`. `question` fora do `execute` só para mutações de follow-up.

## Relatório

- Abrir com a premissa entre aspas: *"Leads com atividade nos últimos 90 dias, parados há 21+ dias, sem status quente atual e sem nenhuma compra paga na janela — agrupados pelo funil de origem. Como o histórico de temperatura não é filtrável diretamente, usei um proxy (score atual + última atividade)."*
- Mostrar primeiro os grupos por funil (ordenados por tamanho) com a estratégia sugerida por faixa de ticket do funil: entrada barata → reoferta com desconto; funil de produto caro que travou → oferecer o produto de entrada ("andar de baixo") em vez de forçar o caro de novo; ticket alto com lead qualificado → ligação de SDR; isca gratuita (eBook) → só e-mail automático, sem gastar atenção.
- Os números da /v10 (96 leads, 38/27/19/12 por funil) são EXEMPLOS de saída — nunca prometa esses valores.
- Lista plana cap 50, ordenada por score desc; mencionar "+N more" quando houver mais.
- `candidateCount` e `excludedBuyers` como contexto de apoio, não manchete.
- Follow-ups só como opt-in via `question`: criar 1 sequência por funil (`flows_create`), criar cards de oportunidade pro SDR no funil de ticket alto (`cards_create` / `cards_import_from_lists`), ou ajustar janela/idle. Nunca dispare as 4 campanhas automaticamente.

## Avisos

- Histórico de temperatura (quem JÁ FOI quente) pode não estar exposto como filtro — o resultado é um proxy e isso deve aparecer na resposta. Se o `leads_filter_schema` revelar um filtro de histórico/variação de temperatura, prefira ele ao proxy.
- Folhas de filtro variam por workspace (inclusive campos customizados). `temperatureStatus` é documentada; folha de última atividade NÃO é — por isso o corte de janela no sample é client-side. Chutar nome de folha retorna vazio silenciosamente — vazio aqui é suspeito, não conclusão.
- Score baixo sozinho ≠ esfriou. Lead que sempre foi frio nunca esquentou — exigir atividade dentro da janela é o que separa "esfriou" de "base morta".
- A subtração de compradores cruza por e-mail; lead sem e-mail permanece na lista mas sem garantia de "não comprou" — declarar quando for relevante.
- A estratégia por funil (desconto / produto de entrada / SDR / e-mail mínimo) é regra de comunicação derivada do ticket — não existe no dado; apresentar como recomendação, não como fato.
- Read-only. Nenhuma campanha, flow ou card sem follow-up explícito.

## Antipadrões

- Buscar todos os leads cold sem exigir atividade na janela — devolve a base morta inteira como se fosse oportunidade.
- Esquecer de subtrair compradores — "reativa" quem já converteu e queima credibilidade.
- Fan-out de `lead_activities_metrics_by_lead` pra todos os candidatos — só nos 30 primeiros.
- Agrupar por UTM quando o usuário disse "funil" — UTM/campanha é o eixo do campaign-ltv-scale-decision; aqui o eixo é origem/subOrigem.
- Tratar todos os funis com a mesma mensagem — o agrupamento existe exatamente porque cada funil pede ângulo diferente.
- Disparar as campanhas por funil sem `question` de confirmação.
- Pedir `workspaceId` / `ownerId` ao usuário.
