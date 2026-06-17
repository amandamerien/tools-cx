## Quando isso se aplica

Usuário quer **compradores numa faixa de ticket baixa** (ex.: R$100-500) **com perfil pra uma faixa alta** (ex.: R$800-3.000), separados em **perfis** com a ação certa pra cada um — convicto (oferta direta), empresa (rota 1:1) e frequente (criar pacote). Três sub-problemas: coorte por faixa de valor, classificação por regras e produto/rota por cluster.

Desambiguação de vizinhos:

- **low-ticket-upsell-readiness** — prontidão por **engajamento** (4 sinais) com entrada e alvo já conhecidos. Aqui a qualificação é por **faixa de valor** sobre o catálogo inteiro e a saída agrupa por perfil.
- **high-value-one-time-non-subscribers** — threshold aberto (`>= R$X`) sem recomendação. Aqui é banda `[min, max]` + cluster + produto por cluster.
- **course-completer-no-recent-purchase** — ancorado em conclusão de curso, não em valor de compra.

## Principais pressupostos

- Dinheiro = centavos inteiros na API de pagamentos. R$100 = 10000, R$500 = 50000, R$800 = 80000, R$3.000 = 300000. Converter reais → centavos antes de qualquer filtro ou comparação.
- Não existe tabela de cluster/ML. Os 3 perfis são **regras de query explícitas** sobre sinais observáveis (nº de compras, domínio do e-mail, engajamento) com precedência declarada — exponha as regras e deixe o usuário discordar.
- "Perfil empresa" de verdade vem do cadastro de empresa no CRM (porte SMB/MID/ENTERPRISE). Domínio de e-mail corporativo é **proxy**: rode `leads_filter_schema` 1× no início e, se existir filtro de empresa/porte/cargo, prefira `leads_search` com esse filtro.
- `transactionStatus: ['paid']` apenas — pendente/autorizada não pagou; estornada já reverteu.
- Sem `transactionPeriod` por default — comprador de faixa baixa em qualquer época é candidato ("once a buyer, always a buyer").
- Identidade (`buyer.email`, `buyer.name`, `buyer.leadId`) já vem inline nas linhas de `dashboard_my_sales` — nunca fazer fan-out por linha.
- O cluster "frequente" gera uma recomendação de **catálogo** (criar pacote anual), não um disparo de produto existente. O pacote pode ser criado via `products_create` (produto + oferta inicial; variantes via `offers_create`) — mas só como follow-up confirmado via `question`, nunca no caminho principal.
- Read-only. Materializar segmento, campanha por cluster ou 1:1 são opt-in.

## Processo de pensamento

1. **Confirmar as faixas.** Default = baixa [R$100-500] e alta [R$800-3.000] quando o usuário deu números. Se deu só um lado, resolver o que falta via `question` antes de rodar.
2. **Bucketizar o catálogo por preço de oferta** (centavos) via `products_list`, puxar as coortes pagas das duas faixas via `dashboard_my_sales` e **subtrair quem já comprou na faixa alta**.
3. **Descobrir o sinal de empresa:** `leads_filter_schema` 1× — existindo filtro de empresa/porte, usar `leads_search` pra marcar o cluster empresa; senão, proxy de domínio corporativo (e declarar o proxy na resposta).
4. **Classificar com regras determinísticas e precedência explícita** (empresa > frequente > convicto > base); engajamento via `lead_activities_metrics_by_lead` só no topo (~50), nunca na coorte inteira.
5. **Produto/rota por cluster:** convicto → produto-âncora mais vendido da faixa alta; empresa → oferta mais cara + rota 1:1 com vendedor sênior; frequente → gap de catálogo (criar Pacote Anual). Top 30 com resumo de contagem por cluster.

## Guia de execução

Use `execute` porque o playbook precisa de bucketing de catálogo, duas coortes, subtração de conjuntos, fan-out controlado de engajamento e classificação por regras com produto por cluster.

**Entradas padrão:**

- `lowBandCents = [10000, 50000]` (R$ 100-500)
- `highBandCents = [80000, 300000]` (R$ 800-3.000)
- `maxRows = 2000`
- `fanoutCap = 50` (engajamento)
- `topN = 30` (resultado final)

**Formato de saída esperado:**

- `bands`
- `setACount` / `setBCount`
- `cohortRawSize`
- `excludedAlreadyUpgraded`
- `analyzed`
- `clusterRules`
- `clusterSummary`
- `resultCount`
- `results`

**Código de exemplo:**

```js
async () => {
  // Faixas em CENTAVOS. R$100 = 10000 — nunca passar reais direto.
  const lowBand = { minCents: 10000, maxCents: 50000 };
  const highBand = { minCents: 80000, maxCents: 300000 };
  const dominiosGenericos = [
    'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br',
    'icloud.com', 'live.com', 'bol.com.br', 'uol.com.br', 'terra.com.br', 'msn.com'
  ];

  // ===== FASE 1 — pull: catálogo bucketizado por preço + coortes pagas das 2 faixas =====
  const productsResp = await codemode.products_list({ perPage: 2000 });
  const products = productsResp?.data || [];

  const setA = products.filter((p) =>
    (p.offers || []).some((o) => {
      const cents = Number(o?.newPrice ?? o?.originalPrice ?? NaN);
      return Number.isFinite(cents) && cents >= lowBand.minCents && cents <= lowBand.maxCents;
    })
  );
  const setB = products.filter((p) =>
    (p.offers || []).some((o) => {
      const cents = Number(o?.newPrice ?? o?.originalPrice ?? NaN);
      return Number.isFinite(cents) && cents >= highBand.minCents && cents <= highBand.maxCents;
    })
  );

  if (setA.length === 0 || setB.length === 0) {
    return {
      bands: { low: lowBand, high: highBand },
      setACount: setA.length,
      setBCount: setB.length,
      cohortRawSize: 0,
      excludedAlreadyUpgraded: 0,
      analyzed: 0,
      clusterRules: null,
      clusterSummary: {},
      resultCount: 0,
      results: [],
      note: 'Faixa vazia — não há produto com oferta no intervalo pedido.'
    };
  }

  const aSales = await codemode.dashboard_my_sales({
    filters: { productIds: setA.map((p) => p.id), transactionStatus: ['paid'] },
    perPage: 2000,
    column: 'createdAt',
    order: 'desc'
  });
  const bSales = await codemode.dashboard_my_sales({
    filters: { productIds: setB.map((p) => p.id), transactionStatus: ['paid'] },
    perPage: 2000,
    column: 'createdAt',
    order: 'desc'
  });

  // ===== FASE 2 — subtract: quem já comprou na faixa alta sai da lista =====
  const bEmails = new Set(
    (bSales?.data || [])
      .map((r) => (r.buyer?.email || r.contactEmail || '').toLowerCase())
      .filter(Boolean)
  );

  const porEmail = new Map();
  for (const row of aSales?.data || []) {
    const email = (row.buyer?.email || row.contactEmail || '').toLowerCase();
    if (!email || bEmails.has(email)) continue;
    const ts = row.createdAt ? new Date(row.createdAt).getTime() : 0;
    const valor = Number(row.saleValue || row.value || 0);
    const atual = porEmail.get(email);
    if (!atual) {
      porEmail.set(email, {
        name: row.buyer?.name || row.contactName || '—',
        email: row.buyer?.email || row.contactEmail,
        leadId: row.buyer?.leadId || null,
        purchases: 1,
        totalSpentCents: valor,
        lastPurchaseAt: row.createdAt || null,
        _lastTs: ts
      });
    } else {
      atual.purchases += 1;
      atual.totalSpentCents += valor;
      if (ts > atual._lastTs) {
        atual._lastTs = ts;
        atual.lastPurchaseAt = row.createdAt || atual.lastPurchaseAt;
      }
      if (!atual.leadId && row.buyer?.leadId) atual.leadId = row.buyer.leadId;
    }
  }

  // ===== FASE 3 — cruzamento: engajamento no topo + classificação nos 3 clusters =====
  // Produto-âncora dos convictos = mais vendido da faixa alta; do perfil empresa = oferta mais cara.
  const popularidade = new Map();
  for (const row of bSales?.data || []) {
    const pid = row.productId || row.product?.id;
    if (pid) popularidade.set(pid, (popularidade.get(pid) || 0) + 1);
  }
  const maisVendidoB = setB
    .slice()
    .sort((x, y) => (popularidade.get(y.id) || 0) - (popularidade.get(x.id) || 0))[0];
  const maisCaroB = setB
    .slice()
    .sort((x, y) => {
      const px = Math.max(0, ...(x.offers || []).map((o) => Number(o?.newPrice ?? o?.originalPrice ?? 0)));
      const py = Math.max(0, ...(y.offers || []).map((o) => Number(o?.newPrice ?? o?.originalPrice ?? 0)));
      return py - px;
    })[0];

  // Fan-out de engajamento limitado ao topo por gasto (nunca a coorte inteira).
  const cohort = Array.from(porEmail.values()).sort((a, b) => b.totalSpentCents - a.totalSpentCents);
  const topo = cohort.slice(0, 50);
  for (const c of topo) {
    c.engagement = 0;
    if (c.leadId) {
      const met = await codemode.lead_activities_metrics_by_lead({ leadId: c.leadId });
      c.engagement = Number(met?.totalActivities ?? met?.count ?? 0);
    }
  }

  // Regras determinísticas, com precedência explícita: empresa > frequente > convicto > base.
  for (const c of topo) {
    const dominio = (c.email.split('@')[1] || '').toLowerCase();
    const corporativo = Boolean(dominio) && !dominiosGenericos.includes(dominio);
    if (corporativo) {
      c.cluster = 'empresa';
      c.recommendation = {
        action: 'rota 1:1 com vendedor sênior — quer implementação, não curso',
        productId: maisCaroB?.id || null,
        productName: maisCaroB?.name || null
      };
    } else if (c.purchases >= 3) {
      c.cluster = 'frequente';
      c.recommendation = {
        action: 'gap de catálogo: criar pacote/assinatura anual que empacote os baratos',
        productId: null,
        productName: null
      };
    } else if (c.purchases >= 2 || c.engagement > 0) {
      c.cluster = 'convicto';
      c.recommendation = {
        action: 'oferta direta do produto-âncora da faixa alta',
        productId: maisVendidoB?.id || null,
        productName: maisVendidoB?.name || null
      };
    } else {
      c.cluster = 'base';
      c.recommendation = {
        action: 'nutrir antes de oferta de ticket alto',
        productId: null,
        productName: null
      };
    }
  }

  // ===== FASE 4 — agregação por cluster + sort + cap =====
  const ordem = { empresa: 0, frequente: 1, convicto: 2, base: 3 };
  topo.sort(
    (a, b) => (ordem[a.cluster] - ordem[b.cluster]) || (b.totalSpentCents - a.totalSpentCents)
  );
  const clusterSummary = {};
  for (const c of topo) clusterSummary[c.cluster] = (clusterSummary[c.cluster] || 0) + 1;

  const results = topo.slice(0, 30).map(({ _lastTs, ...rest }) => ({
    ...rest,
    totalSpentBRL: Math.round(rest.totalSpentCents) / 100
  }));

  return {
    bands: { low: lowBand, high: highBand },
    setACount: setA.length,
    setBCount: setB.length,
    cohortRawSize: cohort.length,
    excludedAlreadyUpgraded: bEmails.size,
    analyzed: topo.length,
    clusterRules:
      'empresa = domínio de e-mail corporativo (proxy do cadastro de empresa); frequente = 3+ compras na faixa baixa; convicto = 2+ compras OU engajamento > 0; base = resto. Precedência: empresa > frequente > convicto > base.',
    clusterSummary,
    resultCount: results.length,
    results
  };
};
```

**Notas:**

- Antes do execute, rode `leads_filter_schema` 1× — se o workspace tiver filtro de empresa/porte, marque o cluster empresa via `leads_search` com esse filtro e use o domínio só como fallback.
- Os shapes de `GetDashboardMySalesBody` e `GetProductsQueryParams` vêm do SDK gerado e não estão documentados campo a campo — confirme via `load_execute_methods` se a validação reclamar de algum nome de filtro.
- Todas as comparações monetárias em centavos; reais só no campo final `totalSpentBRL`.
- Se os campos de `lead_activities_metrics_by_lead` divergirem do sample, use os fallbacks ou zere o sinal — nunca round-trips extras pra compensar.
- Ajuste só faixas, lista de domínios genéricos, limiares (2+/3+) e caps. A precedência dos clusters é deliberada — mude-a só com pedido explícito.
- Sempre chame as capacidades do Clickmax via `codemode.*`.
- `question` fora do `execute` pra: faixa faltando, troca de limiar de cluster, ou qualquer mutação de follow-up.

## Relatório

- Abrir com a premissa: "Compradores na faixa R$100-500 (centavos 10000-50000) que ainda não compraram nada na faixa R$800-3.000 (centavos 80000-300000), separados em 3 perfis por regras explícitas — empresa, frequente e convicto."
- Agrupar a resposta por cluster (a /v10 ilustra o tom: "47 convictos · 89 perfil empresa · 82 frequentes"), com a ação de cada um; dentro do cluster, ordenar por gasto total desc. Top 30 no total, com `+N more` quando `cohortRawSize > 30`.
- Declarar `clusterRules` uma vez no cabeçalho — o usuário precisa poder discordar das regras.
- No cluster frequente, deixar claro que a recomendação é decisão de catálogo (criar o Pacote Anual) — não há produto existente pra disparar; se o usuário topar, o caminho é `products_create` (cria produto + oferta inicial), sempre confirmado via `question` antes.
- Potencial por cluster apenas como cenário (qtde × preço-alvo); os R$ 507.000 da /v10 são exemplo de tom, não promessa.
- `setACount`, `setBCount`, `cohortRawSize`, `excludedAlreadyUpgraded` como contexto de apoio — não como manchete.
- Follow-up só como opt-in via `question`: campanha por cluster (`flows_create`), card 1:1 pro perfil empresa (`cards_create`), criar o Pacote Anual pro cluster frequente (`products_create`), materializar segmento. Sugerir 1 cluster por semana pra não saturar o comercial. Nunca mutar sem confirmação.

## Avisos

- Centavos vs reais: R$100 ≠ 100. R$100 = 10000. Sempre multiplicar por 100 antes de filtrar ou comparar preço de oferta.
- Não existe cluster pronto no domínio — os 3 perfis são regras de query sobre sinais, com precedência declarada. Apresentar como regra, nunca como predição de ML.
- "Perfil empresa" real é o cadastro de empresa no CRM (porte SMB/MID/ENTERPRISE) — domínio de e-mail é proxy. Cheque `leads_filter_schema` antes de confiar no proxy e declare qual sinal foi usado.
- Subtract da faixa alta é obrigatório — sem ele a lista vem cheia de quem já subiu de ticket.
- Cluster frequente: 3+ compras baratas indicam apetite por preço baixo recorrente. A saída é criar o pacote (`products_create`, write — só com confirmação explícita), não empurrar o produto caro existente.
- `transactionStatus: ['paid']` apenas. Pendente/autorizada não pagou.
- Read-only. Segmento, campanha e 1:1 são opt-in via `question`.

## Antipadrões

- Passar reais direto no filtro de preço (100 em vez de 10000) — vira R$1 e a faixa fica absurda.
- Mandar uma oferta única pros 3 clusters — cada perfil pede oferta, ângulo e prova diferentes; genérico mata o número.
- Pular o subtract da faixa alta — produz lista de quem já comprou o produto caro.
- Fan-out de `lead_activities_metrics_by_lead` pra coorte inteira — só o topo (cap 50).
- Apresentar o cluster como predição personalizada de IA — é regra determinística declarada.
- Recomendar o produto-âncora (curso/mentoria) pro perfil empresa — esse perfil quer implementação/execução 1:1.
- Pedir `workspaceId` / `ownerId` ou ids de catálogo que `products_list` resolve.
- Retornar contagem quando pediram a lista com produto por pessoa.
