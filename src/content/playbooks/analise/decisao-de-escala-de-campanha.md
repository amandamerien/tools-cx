## Quando isso se aplica

O usuário quer saber **qual campanha/anúncio/canal traz os clientes de maior valor histórico** pra decidir **onde escalar e onde cortar verba**. A saída é um **ranking agregado** por origem/UTM (receita, clientes, valor médio por cliente) — não uma lista de pessoas.

### Desambiguação dos vizinhos

- **cooled-leads-by-funnel** — lista de LEADS pra reativar, agrupados por funil. Aqui é decisão de investimento, agregada.
- **cross-product-upsell-candidates** — esteira de PRODUTOS (o que puxa o quê). Aqui o eixo é canal de AQUISIÇÃO.
- **lapsed-customers-still-opening-emails** — coorte de reativação de clientes. Aqui ninguém será contatado; é leitura de verba.

## Principais pressupostos

- "LTV aqui = **receita paga acumulada por cliente na janela**" (default 365 dias), em centavos — não é LTV preditivo nem projeção.
- Atribuição: preferir a **UTM inline nos rows de** `dashboard_my_sales` (capturada no checkout). Row sem UTM cai pra origem do lead (`origin` / `subOrigin`); o que sobrar vai pro balde "(sem atribuição)" — **nunca ratear** esse balde entre campanhas.
- first-touch / last-touch **não são colunas**: a UTM de navegação e a de checkout podem divergir. Este playbook usa a do checkout e declara isso na resposta.
- Valor por lead = receita da origem ÷ nº de leads da origem. O denominador vem de `leads_search` com `perPage: 1` (só total) — e **só pros top 10 grupos** (cap explícito de fan-out).
- `leads_payments_utm_autocomplete` serve pra validar grafias/case de UTM quando o usuário citar uma campanha pelo nome — não pra montar fan-out.
- O Clickmax não conhece o **custo** das campanhas: valor por cliente não é ROAS. A decisão final de verba acontece no Meta/Google, fora do Max.
- Manual de instruções (somente leitura).

## Processo de pensamento

1. **Confirmar o eixo:** campanha (UTM) ou canal/origem? Default = UTM com fallback pra origem, declarando o eixo usado. Não perguntar se o pedido já diz "campanha"/"anúncio".
2. **Uma passada só:** `dashboard_my_sales` (`paid`, 365d) e agregação client-side por chave de atribuição. Nunca `leads_payments` lead a lead — fan-out caro que não escala.
3. **Denominador de leads** só pros top 10 grupos, via total do `leads_search` — suficiente pra valor-por-lead sem estourar chamadas.
4. **Caçar a anomalia:** origem orgânica/indicação com valor médio acima da melhor campanha paga — é o achado que muda a decisão (formalizar programa de indicação).
5. **Formato:** ranking por valor médio por cliente, com leitura em 3 baldes (escalar / manter / cortar) como recomendação, não como ação.

## Guia de execução

Usar `execute` porque o playbook precisa de uma leitura grande, derivação de chave de atribuição por row, agregação por grupo, fan-out limitado de contagem de leads e detecção de anomalia.

**Entradas padrão:**

- `windowDays = 365`
- `maxRows = 2000`
- `topN = 20`
- `leadsCountFanOut = 10`

**Formato de saída esperado:**

- `period`
- `paidRows`
- `distinctBuyers`
- `unattributedShare`
- `anomaly`
- `resultCount`
- `results`

**Código de exemplo:**

```js
async () => {
  const today = new Date();
  const toIso = (d) => d.toISOString();

  // Janela padrão: 365 dias — "valor histórico" pede janela longa.
  const from = new Date(today);
  from.setDate(today.getDate() - 365);
  from.setHours(0, 0, 0, 0);
  today.setHours(23, 59, 59, 999);
  const transactionPeriod = { from: toIso(from), to: toIso(today) };

  // FASE 1 — pull: UMA passada nas vendas pagas da janela.
  // NUNCA fan-out de leads_payments por lead — a agregação é client-side.
  const paid = await codemode.dashboard_my_sales({
    filters: { transactionStatus: ['paid'], transactionPeriod },
    perPage: 2000,
    column: 'createdAt',
    order: 'desc'
  });
  const rows = paid?.data || [];

  // FASE 2 — cruzamento: chave de atribuição por row.
  // Preferir UTM do checkout inline; fallback pra origem do lead;
  // o resto cai em "(sem atribuição)" — nunca ratear.
  const keyOf = (row) => {
    const utmSource = row.utmSource || row.tracking?.utmSource || row.buyer?.utmSource || null;
    const utmCampaign = row.utmCampaign || row.tracking?.utmCampaign || row.buyer?.utmCampaign || null;
    if (utmSource || utmCampaign) {
      return { key: `${utmSource || '?'} · ${utmCampaign || '?'}`, kind: 'utm', utmSource, utmCampaign };
    }
    const origin = row.buyer?.origin || row.origin || null;
    const subOrigin = row.buyer?.subOrigin || row.subOrigin || null;
    if (origin) {
      return { key: subOrigin ? `${origin} / ${subOrigin}` : String(origin), kind: 'origin', origin, subOrigin };
    }
    return { key: '(sem atribuição)', kind: 'none' };
  };

  // FASE 3 — agregação: receita (centavos) e clientes distintos por chave.
  const groups = new Map();
  for (const row of rows) {
    const k = keyOf(row);
    const cents = Number(row.value || row.amount || 0);
    const email = (row.contactEmail || '').toLowerCase();
    let g = groups.get(k.key);
    if (!g) {
      g = {
        key: k.key, kind: k.kind,
        utmSource: k.utmSource || null, utmCampaign: k.utmCampaign || null,
        origin: k.origin || null, subOrigin: k.subOrigin || null,
        revenueCents: 0, transactions: 0, buyerEmails: new Set()
      };
      groups.set(k.key, g);
    }
    g.revenueCents += cents;
    g.transactions += 1;
    if (email) g.buyerEmails.add(email);
  }

  const ranked = Array.from(groups.values())
    .map((g) => ({
      ...g,
      buyers: g.buyerEmails.size,
      avgValuePerBuyerCents: g.buyerEmails.size ? Math.round(g.revenueCents / g.buyerEmails.size) : 0
    }))
    .sort((a, b) => b.avgValuePerBuyerCents - a.avgValuePerBuyerCents);

  // FASE 4 — sort + cap: denominador de leads SÓ pros top 10 grupos
  // (cap explícito de fan-out), depois cap final do ranking.
  const leaf = (order, field, value) => ({ id: crypto.randomUUID(), order, field, operator: 'equals', negation: false, valueString: value });
  const top = ranked.filter((g) => g.kind !== 'none').slice(0, 10);
  for (const g of top) {
    try {
      const filters =
        g.kind === 'utm'
          ? [g.utmSource ? leaf(0, 'utmSource', g.utmSource) : null, g.utmCampaign ? leaf(1, 'utmCampaign', g.utmCampaign) : null].filter(Boolean)
          : [leaf(0, 'origin', g.origin), ...(g.subOrigin ? [leaf(1, 'subOrigin', g.subOrigin)] : [])];
      const count = await codemode.leads_search({ filters, perPage: 1, page: 1 });
      g.leadCount = Number(count?.total || count?.meta?.total || 0) || null;
      g.valuePerLeadCents = g.leadCount ? Math.round(g.revenueCents / g.leadCount) : null;
    } catch (_e) {
      g.leadCount = null;
      g.valuePerLeadCents = null;
    }
  }

  // Anomalia: origem orgânica/indicação com valor médio por cliente
  // acima da melhor campanha paga (com base mínima de clientes).
  const organicHints = ['indica', 'referral', 'organic', 'organico', 'orgânico'];
  const minBuyers = 10;
  const organicTop = ranked.find((g) => g.buyers >= minBuyers && organicHints.some((h) => g.key.toLowerCase().includes(h)));
  const paidTop = ranked.find((g) => g.kind === 'utm' && g.buyers >= minBuyers);
  const anomaly =
    organicTop && paidTop && organicTop.avgValuePerBuyerCents > paidTop.avgValuePerBuyerCents
      ? {
          key: organicTop.key,
          buyers: organicTop.buyers,
          avgValuePerBuyerCents: organicTop.avgValuePerBuyerCents,
          note: 'origem orgânica/indicação supera a melhor campanha paga — acontece sem programa formal'
        }
      : null;

  const unattributed = groups.get('(sem atribuição)');
  const results = ranked.slice(0, 20).map(({ buyerEmails, ...rest }) => rest);

  return {
    period: transactionPeriod,
    paidRows: rows.length,
    distinctBuyers: new Set(rows.map((r) => (r.contactEmail || '').toLowerCase()).filter(Boolean)).size,
    unattributedShare: rows.length && unattributed ? Math.round((unattributed.transactions / rows.length) * 100) : 0,
    anomaly,
    resultCount: results.length,
    results
  };
};
```

**Notas:**

- Se o usuário citar uma campanha pelo nome ("LR-14"), validar a grafia real com `leads_payments_utm_autocomplete` antes de filtrar — UTMs têm typos e variações de case.
- Se a maioria dos rows não tiver UTM inline, o ranking vira ranking de origem — declarar a troca de eixo na resposta em vez de fingir precisão de campanha. Pra labels legíveis e pra conferir as grafias reais de origem/sub-origem, usar `leads_origins` / `leads_origins_tree` (sem input, 1 chamada).
- Ajustar só filtros (janela, base mínima), fallbacks de campo ou caps. Sempre via `codemode.*`; `question` fora do `execute` só para follow-ups.

## Relatório

- Abrir com a premissa entre aspas: *"Receita paga dos últimos 365 dias agregada pela UTM capturada no checkout (fallback: origem do lead). 'Valor do cliente' = total pago acumulado na janela, exibido em R$ (convertido de centavos). X% das vendas ficaram sem atribuição."*
- Ranking por valor médio por cliente desc, cap 20, com "+N more" quando houver mais grupos.
- Leitura em 3 baldes, como recomendação: **escalar** (valor alto por cliente, volume baixo = verba subdimensionada), **manter** (valor médio, volume alto), **cortar** (valor baixo por cliente apesar do volume). Os números da /v10 (R$ 1.847 / R$ 487 / R$ 94 / R$ 2.430, +R$ 82K/mês) são EXEMPLOS de saída — jamais prometa esses valores.
- Destacar a anomalia quando existir: indicação/orgânico superando a melhor campanha paga, acontecendo sem programa formal — formalizar é a alavanca.
- Deixar claro que o Max não altera verba — Meta/Google ficam fora; a decisão é do usuário. Follow-ups só como opt-in via `question`: criar segmento/sequência pros clientes da campanha vencedora (`flows_create`) ou montar o esqueleto de um programa de indicação. Nunca executar sem confirmação.

## Avisos

- Dinheiro vem em centavos — converter pra R$ só na exibição; errar a unidade infla o ranking 100×.
- O balde "(sem atribuição)" pode ser grande. Reportar o percentual e seguir — ratear entre campanhas fabrica precisão que não existe.
- UTM de navegação ≠ UTM de checkout (podem divergir). Este ranking usa a do checkout — se o usuário compara com o gerenciador de anúncios, a diferença de atribuição explica gaps.
- Fan-out de `leads_payments` por lead é caro e proibido — a agregação acontece nos rows de `dashboard_my_sales`; o único fan-out permitido é o de contagem (top 10, `perPage: 1`).
- Valor por cliente não é ROAS: o custo da campanha não está no Clickmax. Recomendar "escalar/cortar" sempre condicionado ao CAC que só o usuário conhece.
- Grupos com poucos clientes (< 10) têm média instável — não recomendar decisão de verba em cima deles; mostrar com ressalva.

## Antipadrões

- Chamar `leads_payments` pra cada lead pra "somar o LTV" — o erro mais caro deste playbook; tudo já está nos rows de vendas.
- Ratear as vendas sem atribuição proporcionalmente entre campanhas.
- Tratar valor médio por cliente como ROAS/lucro e mandar "cancelar" sem mencionar que o custo não está no dado.
- Decidir corte por janela curta (7/30 dias) quando o produto tem ciclo longo — "valor histórico" pede 365d.
- Ignorar a origem orgânica/indicação porque "não é campanha" — é exatamente onde mora a anomalia que o usuário precisa ver.
- Hardcode dos números da /v10 (R$ 1.847, 89 pessoas, R$ 94) no código — são ilustração de Report.
- Retornar lista de pessoas quando pediram ranking de campanhas — pessoas são follow-up opt-in.
- Pedir `workspaceId` / `ownerId` ao usuário.
