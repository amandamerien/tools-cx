## Quando isso se aplica

O usuário quer a **lista de pessoas** cuja tentativa de pagamento no **cartão** falhou numa janela recente e que **não compraram depois** — a coorte clássica de recuperação de checkout. Pergunta típica: "Me mostra todo mundo que tentou pagar no cartão nos últimos 7 dias, não passou e ainda não comprou." A saída é gente (nome/e-mail), não totais agregados.

Diferenciar dos playbooks vizinhos:

- **pending-pix-boleto-by-day** — Pix/boleto gerado e não pago (`pending`). Método assíncrono, sem passo de subtração.
- **canceled-purchase-not-returned** — `refunded` `chargeback`, reversão **pós**-pagamento. Aqui o usuário disse "não passou" → falha **pré**-pagamento (`refused` / `failed`). Nunca incluir `refunded` / `chargeback`.
- **subscription-renewal-failed** — cobrança **recorrente** que falhou (exige `transactionRecurrence: 'Recurrent'`). Aqui são tentativas de compra avulsa.
- **checkout-abandonment-by-product** — abandono de carrinho (lifecycle `abandoned_cart`), que inclui quem nem chegou a tentar o cartão.

## Principais pressupostos

- `transactionType: ['credit']` apenas — o usuário disse cartão; `pix` / `boleto` são outros estados.
- `transactionStatus: ['refused', 'failed']` — `refused` = recusado pela rede do cartão; `failed` = erro de sistema. Os dois acontecem **antes** do dinheiro entrar.
- Janela padrão = 7 dias, a menos que o usuário diga outra.
- "Ainda não comprou" = nenhuma transação `paid` depois da tentativa, **qualquer método** (qualquer compra posterior desqualifica).
- Identidade (`contactEmail` / `contactName` / `contactDocument`) já vem inline nas linhas de `dashboard_my_sales` — não fazer fan-out por linha.
- No backend, status de transação é **texto livre, não enum** (valores reais: canceled, chargedBack, dispute, failed, paid, pending, refunded, refunding, refund_rejected) e dinheiro é **Int em centavos**. Na borda da tool, use os literais aceitos pelo filtro e confirme a unidade de `value` antes de somar como R$.
- Cortar por "falta de saldo" especificamente **não é confiável**: o motivo da recusa é texto livre do gateway (varia entre iopay/ticto), sem enum de decline-code. Sem de-para mapeado, relate recusas em bloco.
- Playbook read-only. Nenhum disparo de mensagem, tag ou mutação de lista.

## Processo de pensamento

1. **Travar os filtros do pedido** (cartão, `refused` + `failed`, últimos 7 dias) e rodar direto — o pedido é específico, não perguntar nada antes de entregar.
2. **Puxar a coorte que falhou** em uma única chamada; identidade vem inline em cada linha.
3. **Subtrair quem já pagou**: segunda leitura com `paid` a partir da falha mais antiga e remoção por e-mail. É o passo que evita listar cliente já convertido.
4. **Deduplicar por e-mail** e agregar por lead; de quebra, medir o padrão "depois das 18h / fim do mês" — sinal de limite estourado, não de desinteresse, o que muda o ângulo da recuperação (Pix em vez de retry de cartão).
5. **Ordenar pela tentativa mais recente**, top 50, com `+N more` quando sobrar.

## Guia de execução

Use `execute` porque o job precisa de duas leituras, subtração de conjuntos e agregação por lead.

**Entradas padrão:**

- `windowDays = 7`
- `maxRows = 2000`
- `topN = 50`

**Formato de saída esperado:**

- `period`
- `failedRows`
- `subsequentlyPaidCount`
- `pattern` — `{ eveningSharePct, endOfMonthSharePct }`
- `resultCount`
- `results`

**Código de exemplo:**

```js
async () => {
  const today = new Date();
  const toIso = (d) => d.toISOString();

  // Janela padrão: últimos 7 dias, a menos que o usuário tenha pedido outra.
  const from = new Date(today);
  from.setDate(today.getDate() - 7);
  from.setHours(0, 0, 0, 0);
  today.setHours(23, 59, 59, 999);

  const transactionPeriod = { from: toIso(from), to: toIso(today) };

  // FASE 1 — pull: tentativas de cartão recusadas/falhas na janela.
  const failed = await codemode.dashboard_my_sales({
    filters: {
      transactionType: ['credit'],
      transactionStatus: ['refused', 'failed'],
      transactionPeriod
    },
    perPage: 2000,
    column: 'createdAt',
    order: 'desc'
  });

  const failedRows = failed?.data || [];

  // FASE 2 — cruzamento: quem pagou DEPOIS (qualquer método) sai da lista.
  // A janela do paid começa na falha mais antiga encontrada.
  const earliestFailed = failedRows
    .map((r) => (r.createdAt ? new Date(r.createdAt).getTime() : null))
    .filter((t) => t !== null)
    .reduce((min, t) => (min === null || t < min ? t : min), null);

  const subsequentFrom = earliestFailed ? new Date(earliestFailed) : from;

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

  // FASE 3 — agregação: dedupe por e-mail (subtraindo quem pagou) e medição
  // do padrão "depois das 18h / fim do mês" — sinal de limite estourado.
  const byEmail = new Map();
  let attemptCount = 0;
  let eveningCount = 0;
  let endOfMonthCount = 0;

  for (const row of failedRows) {
    const email = (row.contactEmail || '').toLowerCase();
    if (!email || paidEmails.has(email)) continue;

    const createdAt = row.createdAt ? new Date(row.createdAt) : null;
    const createdAtMs = createdAt ? createdAt.getTime() : 0;
    const amount = Number(row.value || row.amount || 0);

    attemptCount += 1;
    if (createdAt && createdAt.getHours() >= 18) eveningCount += 1;
    if (createdAt && createdAt.getDate() >= 25) endOfMonthCount += 1;

    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, {
        name: row.contactName || row.buyer?.name || '—',
        email: row.contactEmail,
        document: row.contactDocument || null,
        attempts: 1,
        firstAttempt: row.createdAt || null,
        lastAttempt: row.createdAt || null,
        totalAttemptedValue: amount,
        lastProductName: row.productName || row.offer?.name || null,
        _lastTs: createdAtMs
      });
    } else {
      existing.attempts += 1;
      existing.totalAttemptedValue += amount;
      if (createdAtMs > existing._lastTs) {
        existing._lastTs = createdAtMs;
        existing.lastAttempt = row.createdAt || existing.lastAttempt;
        existing.lastProductName = row.productName || row.offer?.name || existing.lastProductName;
      }
      if (!existing.firstAttempt || createdAtMs < new Date(existing.firstAttempt).getTime()) {
        existing.firstAttempt = row.createdAt || existing.firstAttempt;
      }
    }
  }

  // FASE 4 — sort + cap: tentativa mais recente primeiro, top 50.
  const results = Array.from(byEmail.values())
    .sort((a, b) => b._lastTs - a._lastTs)
    .map(({ _lastTs, ...rest }) => rest);

  return {
    period: transactionPeriod,
    failedRows: failedRows.length,
    subsequentlyPaidCount: paidEmails.size,
    pattern: {
      eveningSharePct: attemptCount ? Math.round((eveningCount / attemptCount) * 100) : 0,
      endOfMonthSharePct: attemptCount ? Math.round((endOfMonthCount / attemptCount) * 100) : 0
    },
    resultCount: results.length,
    results: results.slice(0, 50)
  };
};
```

**Notas:**

- O exemplo assume `contactEmail` / `contactName` / `productName` inline na linha; quando faltar, caia nos objetos aninhados `buyer` / `offer` já cobertos.
- O body de `dashboard_my_sales` (`GetDashboardMySalesBody`) é schema zod gerado pelo SDK, fora do catálogo — os campos de filtro usados aqui (`transactionType`, `transactionStatus`, `transactionPeriod`) vêm desse shape; se a chamada rejeitar um campo, confira o schema no worker em vez de inventar variação.
- Ajuste só filtros (janela, conjunto de status), fallbacks de campo ou o cap. O shape é intencional — resposta compacta.
- Sempre chame as capacidades do Clickmax via `codemode.*`.
- `question` fica fora do `execute` e só para follow-up de mutação (disparar oferta, aplicar tag) — nunca automático.

## Relatório

- Abrir com a premissa entre aspas: "Considerando tentativas de cartão recusadas (refused/failed) dos últimos 7 dias, excluindo quem comprou depois."
- Renderizar a coorte em formato de pessoas, cap em 50, ordenada por `lastAttempt` desc. Mencionar `+N more` quando `resultCount > 50`.
- Totais (`failedRows`, `subsequentlyPaidCount`) entram uma vez como contexto de apoio, não como manchete.
- Quando `pattern` for expressivo, usar como insight de enquadramento — ex. de saída ilustrativa (números da /v10, nunca hardcode): "47 pessoas, R$ 9.236 em tentativas; 83% tentaram depois das 18h no fim do mês — é limite estourado, não falta de interesse."
- Follow-up de mutação só como opt-in via `question`: oferta de Pix com desconto por e-mail/WhatsApp (disparo via flow — `flows_list` / `flows_create`) ou marcação da coorte com tag de CRM (`tags_create` + `crm_tags_apply_to_leads`) — nunca executado automaticamente.

## Avisos

- `refused` ≠ `refunded` ≠ `failed` ≠ `chargeback`. "Recusado" é pré-pagamento; "estornado" é pós. Nunca incluir `refunded`/`chargeback` em silêncio.
- O motivo da recusa ("falta de saldo", "cartão vencido") é texto livre do gateway, sem enum. Sem mapear os valores reais por gateway, qualquer corte por motivo é chute — prometa no Report só o que o dado sustenta.
- No banco, dinheiro é Int em centavos; confirme a unidade de `value` da tool antes de reportar somas como R$.
- Comprador e lead são entidades distintas no backend (a ponte passa por Buyers → Leads) — por isso o dedupe canônico aqui é por e-mail, que existe nos dois mundos.
- O padrão 18h/fim de mês usa o fuso do runtime — trate como aproximação, não como fato forense.
- "Ainda não comprou" é limitado à janela consultada; para ciclos de vendas longos o usuário pode querer "nunca". Deixe a janela visível na resposta.
- Read-only. Nenhuma tool de envio/tag/lista sem follow-up explícito.

## Antipadrões

- Devolver a lista de falhas sem subtrair quem pagou depois — o erro mais comum; produz lista de clientes já convertidos.
- Filtrar `transactionStatus: ['refunded']` por confundir "recusado" com "estornado".
- Prometer o corte "só falta de saldo" sem o motivo do gateway mapeado.
- Incluir pix/boleto no filtro — pendência assíncrona é outro playbook (pending-pix-boleto-by-day).
- Fazer lookup de comprador por linha quando os campos de contato já vêm inline.
- Pedir `workspaceId` / `ownerId` ou qualquer identificador de escopo ao usuário.
- Retornar contagem quando pediram a lista de pessoas.
- Hardcodear os números de exemplo da /v10 (47 pessoas, R$ 9.236) no código ou tratá-los como resultado real.
