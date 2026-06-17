## Quando isso se aplica

O usuário quer a **lista de leads que chegaram ao checkout e não compraram**, agrupada **por produto** — e quer saber onde o problema é fricção, não lead frio. Pergunta típica: "Quais leads abandonaram o checkout antes de finalizar — agrupa por produto." Além da lista, este playbook calcula a razão abandono/venda por produto: quando o abandono é muito maior que a venda concretizada, o Report recomenda **auditar o checkout antes de gastar em recuperação**.

Diferenciar dos playbooks vizinhos:

- **card-declined-recovery-list** — tentativa de **cartão** que falhou (`refused` / `failed`).
- **pending-pix-boleto-by-day** — código assíncrono gerado e parado em `pending`.
- **canceled-purchase-not-returned** — pagou e foi revertido (`refunded` / `chargeback`).
- **Este guia** — coorte de abandono ancorada no ciclo de vida `abandoned_cart`.

## Principais pressupostos

- O Clickmax modela o ciclo de vida do lead como `created → visited → engaged → subscribed → in_cart → abandoned_cart → purchased → ...`. Abandono é o status de lead `abandoned_cart`, de primeira classe — **não** aproximar com combinações de status de transação.
- Caminho default é **ancorado em transação**: `dashboard_my_sales` com `contactStatus: 'abandoned_cart'` devolve linhas com `contactName` / `contactEmail` / `productName` inline. Sem fan-out por linha.
- Janela padrão = 30 dias. Sempre visível na resposta.
- O `groupBy` da API só aceita `day | month | year` — agrupamento por produto é **client-side**.
- Alerta de fricção: comparar abandonos × vendas `paid` do mesmo produto na mesma janela. Razão ≥ 2 (com volume mínimo) = sinal de fricção no checkout (parcelamento ausente, carregamento lento, campo travando).
- Abandonos "puros de UI" (sem transação criada) **não aparecem** via `dashboard_my_sales` — fallback: `lead_activities_system_list` filtrando o evento `cart_abandoned` (o facet exato de evento no body vem do schema zod gerado pelo SDK — inspecione uma página pequena do payload antes de fixar o filtro, como recomenda o doc de lead-activities) ou `leads_search` com status `abandoned_cart` (chame `leads_filter_schema` 1× antes se houver dúvida sobre o nome do campo). Atribuição por produto nesse outro caminho exige `leads_common_products` e deve ser divulgada.
- `in_cart` é lead **ainda ativo** no carrinho — não inclua sem solicitação explícita.
- Playbook read-only. Nenhuma campanha de recuperação sem confirmação.

## Processo de pensamento

1. **Caminho default transaction-anchored**: uma chamada com `contactStatus: 'abandoned_cart'` resolve identidade + produto numa tacada.
2. **Segunda leitura `paid` na mesma janela** só pra calibrar a razão abandono/venda por produto — é o que transforma a lista num diagnóstico ("Programa Anual sangrando").
3. **Agrupar client-side** pelo produto da última tentativa de cada lead, com dedupe por lead antes do agrupamento.
4. **Fricção vem antes de recuperação**: produto com abandono ≥ 2× a venda ganha flag, e o Report recomenda auditoria antes da campanha — recuperar gente pra um checkout quebrado queima a lista.
5. **Fallback divulgado**: se os totais parecerem baixos (abandonos sem transação), trocar pro caminho de eventos/CRM e dizer isso na resposta.

## Guia de execução

Use `execute` porque o job precisa de duas leituras, dedupe por lead, agrupamento por produto e cálculo de razão.

**Entradas padrão:**

- `windowDays = 30`
- `maxRows = 2000`
- `topProducts = 10`
- `perProductCap = 5` (10 produtos × 5 = até 50 leads listados; lista completa por produto é drill-down)
- `frictionRatio = 2` (com mínimo de 5 abandonos no produto)

**Formato de saída esperado:**

- `period`
- `path` (`'transaction-anchored'` ou `'pure-ui-abandons'`)
- `totalSourceRows`
- `uniqueLeads`
- `productCount`
- `frictionAlerts` — nomes dos produtos com alerta
- `products` — conjunto de `{ productName, leadCount, paidCount, abandonToPaidRatio, frictionAlert, totalAttemptedValue, leads, hiddenCount }`

**Código de exemplo:**

```js
async () => {
  const today = new Date();
  const toIso = (d) => d.toISOString();

  // Janela padrão: últimos 30 dias, a menos que o usuário tenha pedido outra.
  const from = new Date(today);
  from.setDate(today.getDate() - 30);
  from.setHours(0, 0, 0, 0);
  today.setHours(23, 59, 59, 999);

  const transactionPeriod = { from: toIso(from), to: toIso(today) };

  // FASE 1 — pull: leads em abandoned_cart ancorados em transação.
  // Identidade e produto já vêm inline em cada linha — sem fan-out.
  const abandoned = await codemode.dashboard_my_sales({
    filters: {
      contactStatus: 'abandoned_cart',
      transactionPeriod
    },
    perPage: 2000,
    column: 'createdAt',
    order: 'desc'
  });

  const rows = abandoned?.data || [];

  // FASE 2 — cruzamento: vendas pagas da MESMA janela, contadas por produto.
  // É o que permite a razão abandono/venda — o alerta de fricção.
  const paid = await codemode.dashboard_my_sales({
    filters: {
      transactionStatus: ['paid'],
      transactionPeriod
    },
    perPage: 2000,
    column: 'createdAt',
    order: 'desc'
  });

  const paidCountByProduct = new Map();
  for (const row of paid?.data || []) {
    const pName = row.productName || row.offer?.name || '— sem produto —';
    paidCountByProduct.set(pName, (paidCountByProduct.get(pName) || 0) + 1);
  }

  // FASE 3 — agregação: dedupe por lead (e-mail > documento > leadId) e
  // agrupamento pelo produto da última tentativa de cada lead.
  const leadKey = (row) =>
    (row.contactEmail || '').toLowerCase() || row.contactDocument || row.leadId || null;

  const byLead = new Map();
  for (const row of rows) {
    const key = leadKey(row);
    if (!key) continue;

    const createdAtMs = row.createdAt ? new Date(row.createdAt).getTime() : 0;
    const amount = Number(row.value || row.amount || 0);
    const productName = row.productName || row.offer?.name || '— sem produto —';
    const existing = byLead.get(key);

    if (!existing) {
      byLead.set(key, {
        name: row.contactName || row.buyer?.name || '—',
        email: row.contactEmail || null,
        attempts: 1,
        lastAttemptAt: row.createdAt || null,
        lastMethod: row.transactionType || row.paymentMethod || null,
        lastStatus: row.transactionStatus || null,
        lastProductName: productName,
        totalAttemptedValue: amount,
        _lastTs: createdAtMs
      });
    } else {
      existing.attempts += 1;
      existing.totalAttemptedValue += amount;
      if (createdAtMs > existing._lastTs) {
        existing._lastTs = createdAtMs;
        existing.lastAttemptAt = row.createdAt || existing.lastAttemptAt;
        existing.lastMethod = row.transactionType || row.paymentMethod || existing.lastMethod;
        existing.lastStatus = row.transactionStatus || existing.lastStatus;
        existing.lastProductName = productName;
      }
    }
  }

  const byProduct = new Map();
  for (const lead of byLead.values()) {
    const block = byProduct.get(lead.lastProductName) || {
      productName: lead.lastProductName,
      leadCount: 0,
      totalAttemptedValue: 0,
      _leads: []
    };
    block.leadCount += 1;
    block.totalAttemptedValue += lead.totalAttemptedValue;
    block._leads.push(lead);
    byProduct.set(lead.lastProductName, block);
  }

  // FASE 4 — sort + cap + flag: produtos com mais abandono primeiro; fricção
  // quando abandono >= 2x a venda paga (mínimo de 5 abandonos pra não alarmar
  // produto de volume irrisório).
  const products = Array.from(byProduct.values())
    .sort((a, b) => b.leadCount - a.leadCount)
    .slice(0, 10)
    .map((block) => {
      const paidCount = paidCountByProduct.get(block.productName) || 0;
      const ratio = paidCount > 0 ? block.leadCount / paidCount : null;
      const frictionAlert =
        block.leadCount >= 5 && (paidCount === 0 || block.leadCount >= paidCount * 2);
      const sortedLeads = block._leads
        .sort((a, b) => b._lastTs - a._lastTs)
        .map(({ _lastTs, ...rest }) => rest);

      return {
        productName: block.productName,
        leadCount: block.leadCount,
        paidCount,
        abandonToPaidRatio: ratio === null ? null : Math.round(ratio * 10) / 10,
        frictionAlert,
        totalAttemptedValue: block.totalAttemptedValue,
        leads: sortedLeads.slice(0, 5),
        hiddenCount: Math.max(0, sortedLeads.length - 5)
      };
    });

  return {
    period: transactionPeriod,
    path: 'transaction-anchored',
    totalSourceRows: rows.length,
    uniqueLeads: byLead.size,
    productCount: byProduct.size,
    frictionAlerts: products.filter((p) => p.frictionAlert).map((p) => p.productName),
    products
  };
};
```

**Notas:**

- O exemplo assume `contactEmail` / `contactName` / `productName` inline na linha; quando faltar, caia nos objetos aninhados `buyer` / `offer`.
- `contactStatus: 'abandoned_cart'` em `dashboard_my_sales` é o caminho documentado no doc de domínio de lead-activities para a coorte de lifecycle; os demais campos do body (`GetDashboardMySalesBody`) vêm do schema zod gerado pelo SDK — se a chamada rejeitar um campo, confira o schema no worker em vez de inventar variação.
- Fallback de abandonos puros de UI: troque a FASE 1 por `codemode.lead_activities_system_list` filtrando o evento `cart_abandoned`, com dedupe por `leadId`; marque `path: 'pure-ui-abandons'` e divulgue que a atribuição por produto passa a depender de `codemode.leads_common_products`. O nome do facet de evento no body não está documentado (schema gerado pelo SDK) — leia uma página pequena do payload antes de fixar o filtro.
- Se houver dúvida sobre o nome do campo de status no filtro V2, chame `codemode.leads_filter_schema()` uma vez antes de `leads_search`.
- Ajuste só filtros (janela, escopo), fallbacks de campo ou caps. O shape é intencional.
- Sempre chame as capacidades do Clickmax via `codemode.*`.
- `question` fica fora do `execute` e só para follow-up de mutação — nunca automático.

## Relatório

- Abrir com a premissa entre aspas: "Mostrando leads em `abandoned_cart` com tentativa de pagamento nos últimos 30 dias, agrupados pelo produto da última tentativa."
- Renderizar um bloco por produto, ordenado desc por `leadCount`; header com nome, contagem de leads, valor total tentado e razão abandono/venda.
- Fricção abre a resposta quando houver `frictionAlert` — ex. de saída ilustrativa (números da /v10, nunca hardcode): "184 pessoas chegaram ao checkout e saíram — R$ 99.698 em 30 dias. O Programa Anual tem 3× mais abandono que venda: antes de recuperar esses 28, vale auditar o checkout (parcelamento visível? carregamento? campo travando?). Você pode estar consertando o teto com a torneira aberta."
- Leads capados por produto com `+N more` quando `hiddenCount > 0`; lista completa de um produto é drill-down opt-in.
- Mencionar o `path` quando for o fallback de abandonos puros de UI.
- Campanha de recuperação + tarefa de auditoria só como opt-in via `question` — a sequência seria via flow (`flows_list` / `flows_create`), a auditoria é tarefa humana. Nunca disparar automaticamente.

## Avisos

- Não existe modelo de "checkout session" nem status de transação "abandoned" no backend — abandono é o status de lead `abandoned_cart` (ou derivado de evento de checkout iniciado sem compra). Não aproximar com `pending`/`refused`/`failed`.
- Visita não é abandono: `visited`/`engaged` ficaram fora; `in_cart` é carrinho ativo. Só conta quem cruzou a linha do checkout.
- `dashboard_my_sales` é ancorado em transação — abandono sem transação criada é invisível a ele. Totais suspeitos de baixos → fallback de eventos, com divulgação.
- O sinal mais forte de "tentou pagar de verdade" é existir transação `pending`/`failed` na linha — o status `abandoned_cart` também cobre quem só preencheu os dados.
- A razão abandono/venda é heurística de fricção, não prova: compara contagens da mesma janela e exige volume mínimo. Trate como hipótese a auditar.
- Read-only. Nenhum envio, tag ou criação de segmento sem follow-up explícito.

## Antipadrões

- Combinar `transactionStatus: ['pending','refused','failed']` pra aproximar abandono quando `contactStatus: 'abandoned_cart'` resolve com um campo só.
- Devolver agregados de funil quando a pergunta foi quais leads — perde o requisito de identidade.
- Chamar `leads_search` primeiro quando o usuário quer agrupamento por produto — `dashboard_my_sales` já traz o produto em cada linha.
- Loopar `products_get` por linha quando `productName` já vem inline.
- Incluir `in_cart` ou `purchased` por leitura errada do lifecycle.
- Disparar a campanha de recuperação ignorando o `frictionAlert` — recuperar leads pra um checkout quebrado desperdiça a melhor lista do mês.
- Pedir `workspaceId` / janela antes de entregar; o default de 30 dias é razoável — mencione e rode.
- Retornar contagem quando pediram lista; os leads aparecem por nome/e-mail dentro de cada produto.
