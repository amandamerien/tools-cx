## Quando isso se aplica

O usuário quer a **lista de pessoas cuja compra foi cancelada/estornada numa janela recente e que não compraram mais nada depois** — e quer atacar cada grupo pelo **motivo** do cancelamento, porque mensagem genérica não funciona com quem cancelou. Pergunta típica: "Quem teve compra cancelada nos últimos 60 dias e não voltou a comprar nada?"

Diferenciar dos playbooks vizinhos:

- **card-declined-recovery-list** — tentativas que **nunca** passaram (`refused` / `failed`). Aqui é o oposto: a pessoa **pagou** e depois foi revertido.
- **pending-pix-boleto-by-day** — código gerado e nunca pago; dinheiro nunca entrou.
- **abandono-de-checkout-por-produto** — ciclo de vida `abandoned_cart`; nem chegou a comprar.
- **subscription-renewal-failed** — cobrança recorrente que falhou com assinatura ainda ativa; aqui o cliente já saiu.

## Principais pressupostos

- `transactionStatus: ['refunded', 'chargeback']` — a coorte canônica de compra revertida. `refunded` = o produtor devolveu o dinheiro; `chargeback` = o banco/comprador reverteu. Os dois acontecem **depois** de um pagamento bem-sucedido.
- **Não** filtrar `transactionType` — estorno acontece em cartão, Pix e boleto; o usuário perguntou pelo desfecho, não pelo método.
- Janela padrão = 60 dias.
- "Não voltou a comprar" = nenhuma transação `paid` depois do estorno — qualquer produto, qualquer método.
- Armadilha de terminologia: "compra cancelada/estornada" → `refunded` (+ `chargeback`); `canceled` na API é **void de pedido pendente** (dinheiro nunca entrou) e fica fora do default; "assinatura cancelada" → caminho paralelo via `subscriptions_list`, só quando o usuário disser "assinatura".
- Motivo do cancelamento é **enum classificado**, não texto livre — o catálogo documenta no refund valores como `fraud`, `duplicated`, `requested_by_customer`, e os fluxos de cancelamento do comprador registram valores como `product_did_not_meet_expectations`, `outdated_material`, `did_not_receive_access`, `found_cheaper_option`, `cannot_access_content`, `bought_by_mistake`, `no_longer_want_product`, `other`. Quando vier na linha, agrupar em famílias acionáveis: **preço / expectativa / timing / acesso**; valor ausente ou não mapeado cai no grupo "sem motivo honesto" — nunca inventar.
- Identidade vem inline nas linhas de `dashboard_my_sales`.
- Playbook read-only. Cancelamento é tema sensível — nada de disparo sem revisão humana.

## Processo de pensamento

1. **Travar os filtros**: `refunded` + `chargeback`, 60 dias, sem filtro de método. Pedido específico → rodar direto.
2. **Puxar cancelados e subtrair quem voltou**: segunda leitura `paid` a partir do estorno mais antigo; quem já recomprou não entra na lista de resgate.
3. **Dedupe por e-mail e classificar pelo motivo registrado** em 4 famílias + "sem motivo" — é o agrupamento que define a mensagem (preço → produto mais barato; expectativa → produto adjacente; timing → silêncio de 21 dias).
4. **Acesso é CS, não venda**: motivos de acesso (`did_not_receive_access` / `cannot_access_content`) viram alerta de suporte, não campanha — oferta em cima de bug irrita.
5. **Assinatura é caminho paralelo**: se o usuário esclarecer que falava de "assinatura cancelada", trocar a FASE 1 por `subscriptions_list` mantendo a mesma subtração.

## Guia de execução

Use `execute` porque o job precisa de duas leituras, subtração de conjuntos, dedupe e agrupamento por motivo.

**Entradas padrão:**

- `windowDays = 60`
- `maxRows = 2000`
- `perGroupCap = 10` (5 grupos × 10 = até 50 leads listados)

**Formato de saída esperado:**

- `period`
- `canceledRows`
- `subsequentlyPaidCount`
- `resultCount`
- `groups` — conjunto de `{ group, label, suggestedPlay, leadCount, totalCanceledValue, leads, hiddenCount }`

**Código de exemplo:**

```js
async () => {
  const today = new Date();
  const toIso = (d) => d.toISOString();

  // Janela padrão: últimos 60 dias, a menos que o usuário tenha pedido outra.
  const from = new Date(today);
  from.setDate(today.getDate() - 60);
  from.setHours(0, 0, 0, 0);
  today.setHours(23, 59, 59, 999);

  const transactionPeriod = { from: toIso(from), to: toIso(today) };

  // FASE 1 — pull: compras revertidas (refunded + chargeback) na janela.
  // SEM filtro de transactionType — estorno acontece em qualquer método.
  const canceled = await codemode.dashboard_my_sales({
    filters: {
      transactionStatus: ['refunded', 'chargeback'],
      transactionPeriod
    },
    perPage: 2000,
    column: 'createdAt',
    order: 'desc'
  });

  const canceledRows = canceled?.data || [];

  // FASE 2 — cruzamento: quem voltou a comprar (paid, qualquer produto e
  // método) a partir do estorno mais antigo sai da lista de resgate.
  const earliestCanceled = canceledRows
    .map((r) => (r.createdAt ? new Date(r.createdAt).getTime() : null))
    .filter((t) => t !== null)
    .reduce((min, t) => (min === null || t < min ? t : min), null);

  const subsequentFrom = earliestCanceled ? new Date(earliestCanceled) : from;

  const paid = await codemode.dashboard_my_sales({
    filters: {
      transactionStatus: ['paid'],
      transactionPeriod: { from: toIso(subsequentFrom), to: toIso(today) }
    },
    perPage: 2000,
    column: 'createdAt',
    order: 'desc'
  });

  const paidEmails = new Set(
    (paid?.data || [])
      .map((r) => (r.contactEmail || '').toLowerCase())
      .filter(Boolean)
  );

  // FASE 3 — agregação: dedupe por e-mail + classificação do motivo em
  // famílias acionáveis. O motivo é enum no lado produtor; quando não vier
  // na linha, cai honestamente em 'sem_motivo'.
  const groupOf = (reason) => {
    if (!reason) return 'sem_motivo';
    if (reason === 'found_cheaper_option') return 'preco';
    if (reason === 'product_did_not_meet_expectations' || reason === 'outdated_material') return 'expectativa';
    if (reason === 'did_not_receive_access' || reason === 'cannot_access_content') return 'acesso';
    if (reason === 'bought_by_mistake' || reason === 'no_longer_want_product') return 'timing';
    return 'sem_motivo'; // valor não mapeado (ex.: fraud, duplicated, requested_by_customer, other) — não chutar família
  };

  const byEmail = new Map();
  for (const row of canceledRows) {
    const email = (row.contactEmail || '').toLowerCase();
    if (!email || paidEmails.has(email)) continue;

    const createdAtMs = row.createdAt ? new Date(row.createdAt).getTime() : 0;
    const amount = Number(row.value || row.amount || 0);
    const reason = row.cancellationReason || row.cancelReason || row.reason || null;
    const existing = byEmail.get(email);

    if (!existing) {
      byEmail.set(email, {
        name: row.contactName || row.buyer?.name || '—',
        email: row.contactEmail,
        cancellations: 1,
        lastCancellation: row.createdAt || null,
        totalCanceledValue: amount,
        lastProductName: row.productName || row.offer?.name || null,
        lastStatus: row.transactionStatus || row.status || null,
        reason,
        group: groupOf(reason),
        _lastTs: createdAtMs
      });
    } else {
      existing.cancellations += 1;
      existing.totalCanceledValue += amount;
      if (createdAtMs > existing._lastTs) {
        existing._lastTs = createdAtMs;
        existing.lastCancellation = row.createdAt || existing.lastCancellation;
        existing.lastProductName = row.productName || row.offer?.name || existing.lastProductName;
        existing.lastStatus = row.transactionStatus || row.status || existing.lastStatus;
        if (reason) {
          existing.reason = reason;
          existing.group = groupOf(reason);
        }
      }
    }
  }

  // FASE 4 — sort + cap: montar os grupos na ordem de abordagem, cada um
  // ordenado pelo estorno mais recente e capado em 10 leads.
  const groupDefs = [
    { group: 'preco', label: 'Achou caro', play: 'oferecer produto mais barato' },
    { group: 'expectativa', label: 'Não era o que esperava', play: 'oferecer produto adjacente' },
    { group: 'timing', label: 'Não era a hora', play: 'silêncio de 21 dias e reabordar' },
    { group: 'acesso', label: 'Problema de acesso', play: 'encaminhar pro suporte — é bug, não desinteresse' },
    { group: 'sem_motivo', label: 'Sem motivo registrado / não mapeado', play: 'CS liga pra entender antes de ofertar' }
  ];

  const all = Array.from(byEmail.values());
  const groups = groupDefs
    .map((def) => {
      const leads = all
        .filter((l) => l.group === def.group)
        .sort((a, b) => b._lastTs - a._lastTs)
        .map(({ _lastTs, group, ...rest }) => rest);
      return {
        group: def.group,
        label: def.label,
        suggestedPlay: def.play,
        leadCount: leads.length,
        totalCanceledValue: leads.reduce((s, l) => s + l.totalCanceledValue, 0),
        leads: leads.slice(0, 10),
        hiddenCount: Math.max(0, leads.length - 10)
      };
    })
    .filter((g) => g.leadCount > 0);

  return {
    period: transactionPeriod,
    canceledRows: canceledRows.length,
    subsequentlyPaidCount: paidEmails.size,
    resultCount: all.length,
    groups
  };
};
```

**Notas:**

- O exemplo assume `contactEmail` / `contactName` / `productName` inline na linha; quando faltar, caia nos objetos aninhados `buyer` / `offer`.
- O campo de motivo pode não vir inline em todos os fluxos/gateways — os fallbacks (`cancellationReason` / `cancelReason` / `reason`) cobrem variações; sem motivo, o lead cai em `sem_motivo` e o Report trata isso honestamente. Para casos de alto valor, um drill pontual via `codemode.transactions_get` (status + histórico de refund da transação) pode recuperar a classificação — nunca loop por linha.
- O body de `dashboard_my_sales` (`GetDashboardMySalesBody`) é schema zod gerado pelo SDK, fora do catálogo — se a chamada rejeitar um campo de filtro, confira o schema no worker em vez de inventar variação.
- Ângulo de assinatura (só quando o usuário disser "assinatura"): troque a FASE 1 por `codemode.subscriptions_list` filtrando assinaturas canceladas na janela — o body (`GetSubscriptionsBody`) aceita status, range, projeto/produto/cliente, paginação e sort, mas o shape exato vem do SDK gerado (conferir no worker antes de fixar campos). A assinatura traz `cancellationReason` classificado e `reason` em texto livre (doc de domínio). Mantenha a mesma subtração via `dashboard_my_sales` `paid` (cruzando por `contactEmail`) e reaproveite o dedupe.
- Sempre chame as capacidades do Clickmax via `codemode.*`.
- `question` fica fora do `execute` e só para follow-up de mutação (sequências de win-back, tag) — nunca automático.

## Relatório

- Abrir com a premissa entre aspas: "Considerando estornos (`refunded`) e chargebacks dos últimos 60 dias, excluindo quem voltou a comprar."
- Manchete com o funil — ex. de saída ilustrativa (números da /v10, nunca hardcode): "31 compras canceladas, 24 pessoas nunca mais voltaram."
- Um bloco por grupo, na ordem preço → expectativa → timing → acesso → sem motivo, cada um com o `suggestedPlay` no header: quem achou caro fecha em produto mais barato (quem pagou R$ 1.997 aceita algo de R$ 497); expectativa pede produto adjacente; timing pede 21 dias de silêncio e reabordagem; acesso vai pro suporte, não pra campanha.
- Dentro de cada grupo, ordenar por `lastCancellation` desc (estorno recente = resgate mais quente); cap em 10 com `+N more`.
- `canceledRows` e `subsequentlyPaidCount` aparecem uma vez como contexto, não como manchete.
- Mencionar o caminho paralelo: "Se você quis dizer assinaturas canceladas, rodo a mesma análise via `subscriptions_list`."
- As 3 sequências segmentadas (preço/expectativa/timing) só como opt-in via `question`, citando que o disparo seria via flow (`flows_list` / `flows_create`) com revisão antes — cancelamento é sensível, nunca automático.

## Avisos

- `refunded` ≠ `refused` ≠ `canceled` ≠ `chargeback`. Em português, "cancelado" é armadilha: `canceled` na API é pedido pendente anulado antes do dinheiro entrar — não incluir no default.
- O motivo de cancelamento é enum classificado (diferente do motivo de recusa de cartão, que é texto livre) — mas pode não vir inline na linha da tool e o vocabulário varia por fluxo (refund vs. cancelamento do comprador). Sem o campo ou com valor não mapeado, reporte "sem motivo registrado"; um drill pontual via `transactions_get` pode recuperar a classificação. Nunca deduza o motivo pelo produto ou valor.
- Cancelamento de assinatura do SaaS Clickmax é outro mundo (modelo próprio de assinatura da plataforma) — não misturar com estorno de compra do produtor.
- Não estreitar a subtração com `productIds`/`transactionType` — "não voltou a comprar nada" é qualquer compra.
- Janela de 60 dias visível no header; para ciclo longo o usuário pode querer "nunca voltou".
- Read-only. Nenhum `transactions_refund`, cancelamento, envio ou tag — mesmo que o follow-up "traz de volta" convide a isso.

## Antipadrões

- Devolver a lista de cancelados sem subtrair quem já recomprou — coloca cliente recuperado na lista de resgate.
- Filtrar `transactionStatus: ['canceled']` achando que significa "compra cancelada" — é void de pedido pendente.
- Filtrar `['refused']` — falha pré-pagamento; pertence ao card-declined-recovery-list.
- Defaultar para `subscriptions_list` quando o usuário disse "compra" — assinatura é ângulo paralelo, não o default.
- Mandar (ou propor) uma mensagem única pros grupos — a pessoa cancelou com uma dor específica; genérico queima a lista.
- Inventar motivo de cancelamento quando o campo não veio na linha.
- Pedir `workspaceId` / `ownerId` ao usuário.
- Retornar contagem quando pediram lista — pessoas por nome/e-mail dentro de cada grupo, com totais como apoio.
