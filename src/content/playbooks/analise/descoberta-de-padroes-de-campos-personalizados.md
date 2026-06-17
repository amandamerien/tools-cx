## Quando isso se aplica

O Max olha os **campos customizados** dos leads do workspace e emerge padrões que ninguém pediu: "leads com renda declarada na faixa de cima convertem 3× mais", "campo 'profissão' = dentista tem receita média 2× maior". Saída é a lista de padrões com **tamanho do segmento, conversão e receita média vs. a base**. Pode rodar agendado (descoberta proativa) ou sob demanda.

### Desambiguação dos vizinhos

- **hot-leads-no-recent-contact** usa UM campo conhecido (score) pra filtrar um cohort. Aqui o job é o inverso: **descobrir QUAIS campos importam** — nenhum campo é conhecido de antemão.
- **cross-product-upsell-candidates** / **ticket-band-upsell-recommendation** qualificam pelo histórico de compra. Aqui a qualificação nasce do **dado declarado** nos campos customizados, cruzado com a receita depois.
- **weekly-hidden-money-summary** é o orquestrador agendado de frentes conhecidas; este playbook descobre frentes NOVAS — um padrão forte daqui pode virar insumo do resumo semanal.

## Principais pressupostos

- Campos customizados só existem se vierem do `leads_filter_schema`. Os nomes variam por workspace ("renda", "faturamento_mensal", "profissão", "empresa"…) — nunca inventar campo, nunca hardcodar nome.
- Valores de campo customizado são **texto livre**: "Dentista", "dentista" e " dentista " são o mesmo segmento (normalizar com trim + lowercase). Campos numéricos chegam como string suja ("R$ 15.000,00") — parsear antes de criar faixas.
- Receita vem de `dashboard_my_sales` com `transactionStatus: ['paid']` (já exclui estornados), agregada por `contactEmail` lowercase. Valores em **centavos** — formatar como R$ só no report. A ponte lead→comprador é o e-mail (espelho da ponte `Buyers.leadId → Leads.id`); leads sem e-mail saem do denominador.
- Análise é **amostral** (`perPage` cap): com base maior que a amostra, os lifts são estimativas, não censo.
- Padrão só é padrão com **massa mínima**: segmento < 20 leads ou campo preenchido em < 5% da amostra é ruído, não insight. E **correlação ≠ causação** — o report apresenta associação, não causa.
- Read-only. Materializar um padrão (criar segmento, tag ou flow) é follow-up opt-in.

## Processo de pensamento

1. **Descobrir os campos primeiro.** `leads_filter_schema` 1× no início é a fonte ÚNICA da lista de campos customizados. Workspace sem campo customizado → dizer isso e parar (não cair pra campos padrão fingindo que são customizados).
2. **Amostrar a base e a receita em paralelo.** `leads_search` sem filtro (amostra ampla) + `dashboard_my_sales` paid sem período (receita all-time por e-mail).
3. **Distribuir valores por campo.** Categórico → histograma de valores normalizados; numérico (≥ 70% parseável) → faixas por quartil. Descartar campos com fill-rate baixo.
4. **Cruzar cada segmento com dinheiro.** Por segmento: tamanho, % que comprou (conversão) e receita média por lead — comparados com a média da base inteira → lift.
5. **Reportar só os padrões fortes.** Lift ≥ 1.5× com massa mínima, ranqueados por força × tamanho, cap 15. Follow-up (criar segmento/flow pro padrão) só como opt-in.

## Guia de execução

Usar `execute` porque o playbook precisa de descoberta de schema, duas leituras paralelas, normalização de texto livre, bucketing numérico, agregação por segmento e ranking por lift.

**Entradas padrão:**

- `maxRows = 2000`
- `minSegmentSize = 20`
- `minFillRate = 0.05`
- `minLift = 1.5`
- `topN = 15`

**Formato de saída esperado:**

- `sampleSize`
- `fieldsInSchema`
- `baseConversion`
- `baseAvgRevenue`
- `patternCount`
- `patterns`

**Código de exemplo:**

```js
async () => {
  const minSegmentSize = 20; // segmento menor que isso é ruído
  const minFillRate = 0.05;  // campo preenchido em <5% da amostra não sustenta padrão
  const minLift = 1.5;       // só reportar padrão 1.5x ou mais vs. a base
  const topN = 15;

  // ── FASE 1 (pull): schema de filtros + amostra de leads + receita paga ──
  const [schema, leadsRes, paidRes] = await Promise.all([
    codemode.leads_filter_schema(),
    codemode.leads_search({ page: 1, perPage: 2000 }),
    codemode.dashboard_my_sales({ filters: { transactionStatus: ['paid'] }, perPage: 2000, column: 'createdAt', order: 'desc' })
  ]);

  // Campos customizados SÓ podem vir do filter_schema — nunca inventar nome.
  const raw = schema || {};
  let customFields = raw.customFields || raw.custom_fields || [];
  if (!Array.isArray(customFields) || customFields.length === 0) {
    const all = Array.isArray(raw.fields) ? raw.fields : Array.isArray(raw) ? raw : [];
    customFields = all.filter((f) => f && (f.custom === true || f.isCustom === true || f.type === 'custom'));
  }
  const fieldKeys = customFields.map((f) => (typeof f === 'string' ? f : f.key || f.name || f.id)).filter(Boolean);

  if (fieldKeys.length === 0) {
    return { sampleSize: 0, fieldsInSchema: 0, baseConversion: 0, baseAvgRevenue: 0, patternCount: 0, patterns: [], note: 'Nenhum campo customizado no leads_filter_schema deste workspace.' };
  }

  // Receita por e-mail (centavos) pra cruzar segmento × dinheiro.
  const revenueByEmail = new Map();
  for (const row of paidRes?.data || []) {
    const email = (row.contactEmail || '').toLowerCase();
    if (!email) continue;
    const value = Number(row.saleValue || row.value || row.amount || 0);
    revenueByEmail.set(email, (revenueByEmail.get(email) || 0) + value);
  }

  // ── FASE 2 (cruzamento): valor de cada campo por lead + receita do lead ──
  // Leads sem e-mail não cruzam com receita — saem do denominador.
  const leads = (leadsRes?.data || []).filter((l) => (l.email || '').trim());
  const sampleSize = leads.length;

  // Parser de valor numérico sujo: "R$ 15.000,00" / "15000" / 15000 → número ou null.
  const toNumber = (v) => {
    if (typeof v === 'number') return v;
    if (typeof v !== 'string') return null;
    const s = v.replace(/[rR]\$\s?/, '').replace(/\./g, '').replace(',', '.').trim();
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };

  let baseBuyers = 0;
  let baseRevenue = 0;
  const perLead = leads.map((l) => {
    const email = l.email.toLowerCase();
    const revenue = revenueByEmail.get(email) || 0;
    if (revenue > 0) baseBuyers += 1;
    baseRevenue += revenue;
    const cf = l.customFields || l.custom_fields || l.fields || {};
    return { email, revenue, cf };
  });
  const baseConversion = sampleSize ? baseBuyers / sampleSize : 0;
  const baseAvgRevenue = sampleSize ? baseRevenue / sampleSize : 0;

  // ── FASE 3 (agregação): distribuição por campo → segmentos → lift vs. base ──
  const patterns = [];
  for (const key of fieldKeys) {
    const values = [];
    for (const l of perLead) {
      const v = l.cf && l.cf[key];
      if (v === null || v === undefined || String(v).trim() === '') continue;
      values.push({ lead: l, rawValue: String(v).trim() });
    }
    if (values.length < sampleSize * minFillRate || values.length < minSegmentSize) continue;

    // Campo numérico (>= 70% parseável) vira faixas por quartil; senão, categórico.
    const parsed = values.map((x) => ({ ...x, num: toNumber(x.rawValue) }));
    const parseable = parsed.filter((x) => x.num !== null);
    const isNumeric = parseable.length >= values.length * 0.7;

    const segments = new Map();
    if (isNumeric) {
      const sorted = parseable.map((x) => x.num).sort((a, b) => a - b);
      const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
      const q1 = q(0.25), q2 = q(0.5), q3 = q(0.75);
      for (const x of parseable) {
        const band = x.num <= q1 ? `<= ${q1}` : x.num <= q2 ? `${q1}–${q2}` : x.num <= q3 ? `${q2}–${q3}` : `> ${q3}`;
        if (!segments.has(band)) segments.set(band, []);
        segments.get(band).push(x.lead);
      }
    } else {
      for (const x of values) {
        const norm = x.rawValue.toLowerCase(); // "Dentista" === "dentista"
        if (!segments.has(norm)) segments.set(norm, []);
        segments.get(norm).push(x.lead);
      }
    }

    for (const [value, members] of segments) {
      if (members.length < minSegmentSize) continue;
      const buyers = members.filter((m) => m.revenue > 0).length;
      const revenue = members.reduce((s, m) => s + m.revenue, 0);
      const conversion = buyers / members.length;
      const avgRevenue = revenue / members.length;
      const liftConversion = baseConversion > 0 ? conversion / baseConversion : 0;
      const liftRevenue = baseAvgRevenue > 0 ? avgRevenue / baseAvgRevenue : 0;
      const bestLift = Math.max(liftConversion, liftRevenue);
      if (bestLift < minLift) continue;
      patterns.push({
        field: key,
        value,
        segmentSize: members.length,
        buyers,
        conversion: Number(conversion.toFixed(3)),
        avgRevenue: Math.round(avgRevenue),
        liftConversion: Number(liftConversion.toFixed(2)),
        liftRevenue: Number(liftRevenue.toFixed(2)),
        // Força do padrão: lift × raiz do tamanho (massa conta, mas não domina).
        score: Number((bestLift * Math.sqrt(members.length)).toFixed(1))
      });
    }
  }

  // ── FASE 4 (sort + cap): padrões mais fortes primeiro ──
  patterns.sort((a, b) => b.score - a.score);

  return {
    sampleSize,
    fieldsInSchema: fieldKeys.length,
    baseConversion: Number(baseConversion.toFixed(3)),
    baseAvgRevenue: Math.round(baseAvgRevenue),
    patternCount: patterns.length,
    patterns: patterns.slice(0, topN)
  };
};
```

**Notas:**

- O shape do `leads_filter_schema` varia — o código cobre `customFields`, `custom_fields` e `fields` com flag `custom`/`isCustom`. Se nenhuma variação bater, inspecione UMA resposta crua do schema antes de re-rodar; não caia pra campos padrão fingindo que são customizados.
- Se os valores dos campos customizados NÃO vierem inline em `leads_search`, refaça a busca filtrando por campo (o filter_schema diz como) — nunca faça loop de `leads_get` por lead.
- O shape do body de `dashboard_my_sales` (`filters.transactionStatus`, `perPage`, `column`, `order`) e a paginação do `leads_search` vêm dos schemas gerados pelo SDK — se a chamada rejeitar um campo, confira o shape no worker em vez de inventar campo.
- As faixas numéricas saem na mesma unidade do campo (texto declarado pelo lead); `avgRevenue`/`baseAvgRevenue` saem em centavos — o report converte pra R$.
- Ajuste apenas thresholds (`minSegmentSize`, `minFillRate`, `minLift`), o cap e os fallbacks de shape. A forma do retorno é intencional.
- Sempre chame as capacidades do Clickmax via `codemode.*`.
- `question` fora do `execute` só para follow-ups: materializar um padrão como segmento/tag, criar flow pro segmento, ou aprofundar um padrão específico. Nunca mutar sem confirmação.

## Relatório

- Abrir com a premissa: *"Analisei os N campos customizados do seu workspace (vindos do schema de filtros) numa amostra de X leads, cruzando cada segmento com a receita paga histórica. Conversão média da base: Y% · receita média: R$ Z."*
- Cada padrão em 1 linha legível: *"profissão = dentista — 34 leads · converte 2.3× a base · receita média R$ 812 (2.1× a base)"*. Ordenado por `score` desc, cap 15, com "+N more" se houver mais.
- Sempre mostrar tamanho do segmento ao lado do lift — lift sem massa engana.
- Rotular explicitamente como associação na amostra, não causa ("leads que declararam X compram mais; não significa que declarar X faz comprar").
- Se nenhum padrão passou dos thresholds, dizer isso com os thresholds usados e oferecer afrouxá-los (opt-in) — não inventar padrão fraco pra ter o que mostrar.
- Follow-ups só como opt-in via `question`: materializar o padrão campeão como segmento dinâmico (`segments_create` + `segments_upsert_filters`, usando o leaf do campo no filtro V2) ou como tag (`tags_create` + `crm_tags_apply_to_leads`), disparar campanha pro segmento (via `flows_create`), agendar esta descoberta como rotina recorrente, ou aprofundar um campo específico.

## Avisos

- Nunca inventar campo. A lista de campos customizados vem 100% do `leads_filter_schema` — nomes variam por workspace; um campo "renda" pode se chamar `faturamento_mensal` no workspace ao lado. Campo chutado = resultado silenciosamente vazio ou errado.
- Valores de campo são texto livre (mesma armadilha do status no schema): sem normalizar trim/lowercase, "Dentista" e "dentista" viram dois segmentos e nenhum passa da massa mínima.
- Campos numéricos chegam como string com "R$", ponto de milhar e vírgula decimal — parsear antes do bucketing, senão tudo vira categórico de cardinalidade infinita.
- Receita em centavos nas linhas de venda — dividir por 100 só na exibição; o lift é invariante à unidade, a exibição não.
- Segmento pequeno mente: 3 dentistas que compraram dão "conversão 100%". Os thresholds (`minSegmentSize`, `minFillRate`) existem pra isso — não os remova pra "achar mais padrões".
- Amostra `perPage: 2000`: em bases maiores, declarar que a análise é amostral. Correlação ≠ causação, sempre.

## Antipadrões

- Hardcodar nomes de campo ("renda", "profissão") sem consultar `leads_filter_schema` — o erro nº 1 deste playbook.
- Reportar lift de segmento com 5 pessoas, ou de campo preenchido em 2% da base.
- Fazer loop de `leads_get` por lead pra buscar campos customizados quando `leads_search` já os devolve inline.
- Misturar campos padrão (status, origem, score) na lista de "campos customizados" pra engordar o resultado.
- Tratar a falta de receita de lead sem e-mail como "não convertido" — sem e-mail não há ponte; o lead sai do denominador.
- Criar segmento/tag/flow automaticamente a partir de um padrão descoberto (`segments_create`, `tags_create`, `crm_tags_apply_to_leads`, `flows_create` são writes) — materialização é opt-in via `question`.
- Retornar a distribuição crua de todos os valores de todos os campos — o produto é o padrão ranqueado, não o histograma.
- Pedir `workspaceId` / `ownerId` ao usuário.
