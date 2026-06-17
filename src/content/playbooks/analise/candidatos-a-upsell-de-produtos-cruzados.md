## Quando isso se aplica

O usuário quer o **mapa agregado da esteira**: quais pares produto A→B têm **alta taxa de conversão**, onde está o **gap de exposição** (par que converte muito mas pouca gente recebe a oferta) e quais produtos são **becos sem saída** (quase ninguém compra nada depois). Saída é um ranking de pares + diagnóstico, **não** uma lista de pessoas.

### Desambiguação dos vizinhos

- **ticket-band-upsell-recommendation** / **course-completer-no-recent-purchase** — listas de PESSOAS prontas pra próxima oferta. Se o usuário pedir "quem está pronto", é lá.
- **campaign-ltv-scale-decision** — canal de AQUISIÇÃO (campanha/UTM). Aqui o eixo é a sequência de PRODUTOS pós-compra.
- **lapsed-customers-still-opening-emails** — reativação de clientes sumidos; aqui os compradores estão ativos e a pergunta é estrutural.

## Principais pressupostos

- **Não existe tabela de "par de produtos"** — pares são derivados das sequências de transações `paid` por comprador (e-mail) na janela (default 365 dias).
- Par A→B conta **1× por comprador**: primeira compra de A seguida, no tempo, da primeira compra de B. Conversão do par = compradores A→B ÷ compradores de A. Recompras não inflam o par.
- Base mínima por par (default 10 compradores de A) — par com base pequena é ruído, não recomendação.
- Exposição ("quantos compradores de A receberam a oferta de B") exige **convenção de marcação** das mensagens/flows por oferta — geralmente NÃO instrumentada. `flows_list` (read) mostra QUAIS automações existem (match heurístico por nome), mas não liga mensagem→oferta→lead. O gap estimado assume que a base não convertida não recebeu a oferta (teto, não medição). Sempre declarar a limitação.
- Preços de oferta (`products_list`) e valores de venda vêm em **centavos** — converter pra R$ só na exibição.
- Playbook read-only. Configurar a oferta automática do par campeão é follow-up opt-in.

## Processo de pensamento

1. **Uma passada nas vendas pagas** da janela e montagem da linha do tempo de produtos por comprador — tudo client-side, sem fan-out.
2. **Três leituras do mesmo dado:** pares A→B (conversão), "pull rate" por produto (% dos compradores que compram QUALQUER coisa depois) e becos sem saída (pull rate baixo com base relevante).
3. **Exposição declarada como limitação:** par de alta conversão sem automação conhecida = dinheiro estrutural parado. `flows_list` (read, 1 chamada) flagra por nome se já existe automação citando o produto B — sinal heurístico, não medição. Não inventar percentuais de exposição sem instrumentação.
4. **Valorar o gap:** `products_list` resolve o preço de B; gap estimado = base de A não convertida × conversão observada × preço de B.
5. **Formato:** top pares por conversão (com base mínima), gaps rankeados, becos sem saída — e a esteira implícita como leitura final.

## Guia de execução

Usar `execute` porque o playbook precisa de leitura grande, construção de sequências por comprador, derivação de pares/taxas e catálogo de preços.

**Entradas padrão:**

- `windowDays = 365`
- `maxRows = 2000`
- `topN = 20`
- `minBaseBuyers = 10`

**Formato de saída esperado:**

- `period`
- `paidRows`
- `buyersWithSequence`
- `pullRanking`
- `deadEnds`
- `resultCount`
- `results`

**Código de exemplo:**

```js
async () => {
  const today = new Date();
  const toIso = (d) => d.toISOString();

  // Janela padrão: 365 dias — pares com ciclo longo escapam de janela curta.
  const from = new Date(today);
  from.setDate(today.getDate() - 365);
  from.setHours(0, 0, 0, 0);
  today.setHours(23, 59, 59, 999);
  const transactionPeriod = { from: toIso(from), to: toIso(today) };

  // FASE 1 — pull: vendas pagas da janela + catálogo (preço por produto).
  const paid = await codemode.dashboard_my_sales({
    filters: { transactionStatus: ['paid'], transactionPeriod },
    perPage: 2000,
    column: 'createdAt',
    order: 'asc'
  });
  const rows = paid?.data || [];

  const catalog = await codemode.products_list({ perPage: 200 });
  const priceByName = new Map();
  for (const p of catalog?.data || []) {
    const prices = (p.offers || [])
      .map((o) => Number(o.newPrice || o.originalPrice || 0))
      .filter((n) => n > 0);
    priceByName.set((p.name || '').toLowerCase(), prices.length ? Math.min(...prices) : 0);
  }

  // FASE 2 — cruzamento: linha do tempo de produtos por comprador.
  const timeline = new Map();
  for (const row of rows) {
    const email = (row.contactEmail || '').toLowerCase();
    const product = row.productName || row.offer?.name || null;
    const ts = row.createdAt ? new Date(row.createdAt).getTime() : 0;
    if (!email || !product) continue;
    if (!timeline.has(email)) timeline.set(email, []);
    timeline.get(email).push({ product, ts });
  }

  // FASE 3 — agregação: pares A→B (1× por comprador, pela PRIMEIRA compra
  // de cada produto), pull rate por produto e becos sem saída.
  const buyersOf = new Map(); // produto -> Set(email)
  const pairBuyers = new Map(); // 'A → B' -> Set(email)
  const nextBuyers = new Map(); // produto -> Set(email que compraram algo depois)

  for (const [email, purchases] of timeline) {
    purchases.sort((a, b) => a.ts - b.ts);
    const firstTs = new Map();
    for (const p of purchases) {
      if (!firstTs.has(p.product)) firstTs.set(p.product, p.ts);
    }
    const entries = Array.from(firstTs.entries());
    for (const [prod] of entries) {
      if (!buyersOf.has(prod)) buyersOf.set(prod, new Set());
      buyersOf.get(prod).add(email);
    }
    for (const [a, tsA] of entries) {
      let boughtNext = false;
      for (const [b, tsB] of entries) {
        if (a === b || tsB <= tsA) continue;
        boughtNext = true;
        const key = `${a} → ${b}`;
        if (!pairBuyers.has(key)) pairBuyers.set(key, new Set());
        pairBuyers.get(key).add(email);
      }
      if (boughtNext) {
        if (!nextBuyers.has(a)) nextBuyers.set(a, new Set());
        nextBuyers.get(a).add(email);
      }
    }
  }

  const minBase = 10; // base mínima de compradores de A por par
  const pairs = [];
  for (const [key, set] of pairBuyers) {
    const [a, b] = key.split(' → ');
    const base = buyersOf.get(a)?.size || 0;
    if (base < minBase) continue;
    pairs.push({
      pair: key,
      productA: a,
      productB: b,
      baseBuyersA: base,
      convertedAB: set.size,
      conversionPct: Math.round((set.size / base) * 100),
      offerPriceBCents: priceByName.get((b || '').toLowerCase()) || 0
    });
  }
  pairs.sort((x, y) => y.conversionPct - x.conversionPct);

  const pull = [];
  for (const [prod, set] of buyersOf) {
    if (set.size < minBase) continue;
    const next = nextBuyers.get(prod)?.size || 0;
    pull.push({ product: prod, buyers: set.size, nextPurchasePct: Math.round((next / set.size) * 100) });
  }
  pull.sort((a, b) => b.nextPurchasePct - a.nextPurchasePct);
  const deadEnds = pull.filter((p) => p.nextPurchasePct < 10);

  // FASE 4 — sort + cap: gap estimado por par. Exposição real exige marcação
  // de mensagens por oferta (não instrumentada); o gap assume base não
  // convertida sem oferta (teto declarado, não medição). `flows_list` dá um
  // sinal heurístico: existe automação cujo nome cita o produto B?
  let flowNames = [];
  try {
    const flows = await codemode.flows_list({ page: 1, perPage: 100 });
    flowNames = (flows?.data || []).map((f) => (f.name || '').toLowerCase());
  } catch (_e) {
    flowNames = [];
  }
  const results = pairs.slice(0, 20).map((p) => {
    const unexposedBase = p.baseBuyersA - p.convertedAB;
    const bLower = (p.productB || '').toLowerCase();
    return {
      ...p,
      hasFlowMentioningB: bLower ? flowNames.some((n) => n.includes(bLower)) : null,
      estGapCents: p.offerPriceBCents
        ? Math.round(unexposedBase * (p.conversionPct / 100) * p.offerPriceBCents)
        : null
    };
  });

  return {
    period: transactionPeriod,
    paidRows: rows.length,
    buyersWithSequence: Array.from(timeline.values()).filter((t) => t.length > 1).length,
    minBaseBuyers: minBase,
    pullRanking: pull.slice(0, 10),
    deadEnds: deadEnds.slice(0, 10),
    resultCount: results.length,
    results
  };
};
```

**Notas:**

- `leads_common_products` é tool real da superfície — usar como cross-check dos pares derivados (co-compra agregada por coorte de leads); divergência grande sugere fragmentação de nomes de produto.
- `flows_list` é paginado (o shape exato dos params vem do SDK gerado — conferir no worker se `perPage` divergir). O match por nome é heurístico: ausência de match NÃO prova ausência de automação, e match não prova exposição por lead.
- Ajustar só filtros (janela, base mínima, threshold de beco sem saída), fallbacks de campo ou caps. Sempre via `codemode.*`; `question` fora do `execute` só pra follow-ups.

## Relatório

- Abrir com a premissa entre aspas: *"Sequências de compras pagas dos últimos 365 dias; par A→B contado uma vez por comprador (primeira compra de A seguida da primeira de B), base mínima de 10 compradores por par. Exposição não instrumentada — o gap estimado assume que a base não convertida não recebeu a oferta (teto); medir exposição real exige marcar as mensagens por oferta."*
- Estruturar em 3 blocos: (1) produto que mais puxa (pull ranking), (2) pares de alta conversão com gap — com o valor estimado do gap em R$, o flag `hasFlowMentioningB` (sinal heurístico via `flows_list`, match por nome) e a ressalva de que confirmar a automação real é passo do usuário — e (3) becos sem saída. Os números da /v10 (64% de pull, 38% vs 12%, R$ 82.000/ano, Pacote Avulso 7%) são EXEMPLOS de saída — jamais prometa esses valores.
- Ordenar pares por conversão desc, cap 20, com "+N more" quando houver mais pares acima da base mínima.
- `paidRows` e `buyersWithSequence` como contexto de apoio, não manchete.
- Follow-ups só como opt-in via `question`: configurar a oferta automática do par campeão (`flows_create`), documentar a esteira oficial como sequência recomendada, repensar o beco sem saída. Nunca criar flow sem confirmação explícita.

## Avisos

- Exposição real não está instrumentada na maioria dos workspaces — sem convenção ligando mensagem/flow a uma oferta, "só X% recebem a oferta" é inventado. `flows_list` mostra que automações existem (e seus nomes), não quem as recebeu — `hasFlowMentioningB` é sinal, nunca taxa de exposição. Reportar `estGapCents` como teto e a limitação, nunca um percentual fabricado.
- Par é direcional: A→B ≠ B→A. Usar a primeira compra de cada produto evita que recompras dupliquem pares.
- Base mínima importa: 2 de 3 compradores = 67% de conversão e zero confiança. Pares abaixo de `minBaseBuyers` ficam fora do ranking.
- A chave do par é o nome do produto no row de venda. Produto renomeado ou vendido por várias ofertas fragmenta a contagem — conferir contra `products_list` quando os números parecerem baixos demais.
- Preços e gaps em centavos — converter só na exibição.
- Janela curta esconde pares de ciclo longo (B comprado 8 meses depois de A) — 365 dias é o mínimo razoável pra esta análise.

## Antipadrões

- Retornar lista de pessoas quando pediram o mapa — o job de pessoas é o ticket-band-upsell-recommendation / course-completer-no-recent-purchase.
- Contar cada transação como um par (em vez de 1× por comprador via primeira compra) — recompras inflam a conversão.
- Comparar pares ignorando a base mínima — ranking dominado por ruído estatístico.
- Inventar taxa de exposição a partir de e-mails genéricos sem convenção de marcação por oferta.
- Configurar a oferta automática direto, sem `question` — mutação é sempre opt-in.
- Hardcode dos números da /v10 (38%, 12%, R$ 82K) no código — são ilustração de Report.
- Fan-out por comprador (pagamentos/atividades lead a lead) — toda a análise sai de uma passada em `dashboard_my_sales`.
- Pedir `workspaceId` / `ownerId` ao usuário.
