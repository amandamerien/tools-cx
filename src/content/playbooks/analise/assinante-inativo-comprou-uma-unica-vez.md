## Quando isso se aplica

O usuário quer a **lista de quem cancelou uma assinatura de cliente final numa janela recente (default 60 dias) E voltou a comprar avulso DEPOIS do cancelamento**. É a coorte de win-back mais fácil que existe: a pessoa saiu da recorrência mas continua comprando solto — ela quer estar com o negócio, só não naquele formato. A oferta de volta muda conforme o **motivo do cancelamento**. Saída é gente, não totais.

### Desambiguação dos vizinhos

- **canceled-purchase-not-returned** — compra estornada (`refunded` / `chargeback`) sem retorno. Aqui é **assinatura** cancelada e HÁ compra posterior.
- **subscription-renewal-failed** — assinatura ativa cuja cobrança falhou. Aqui a assinatura já era (`canceled`).
- **dormant-subscribers-no-member-access** — ainda paga, parou de usar. Aqui já cancelou — este playbook é o pós-churn.

## Principais pressupostos

- **"Mensalidade" = assinatura de cliente final** → `subscriptions_*`. Nunca `plans_*` (plano SaaS do próprio workspace na Clickmax).
- **"Avulso" = `transactionRecurrence: 'OneTime'`**. Fácil de inverter mentalmente porque o usuário fala de assinatura na mesma frase. Nunca `'Recurrent'`.
- **Ordem temporal é obrigatória:** a compra qualificadora precisa de `createdAt > canceledAt` da assinatura. Compra avulsa ANTES do cancelamento = comprador misto, não win-back.
- **Janela default = 60 dias sobre a data do CANCELAMENTO**, não sobre a compra de retorno. A API de `subscriptions_list` não filtra por período de cancelamento — puxar `['canceled']` e cortar client-side por `canceledAt` / `updatedAt`.
- `transactionStatus: ['paid']` já exclui estornos posteriores — não duplicar o filtro.
- **Identidade vem inline** (`contactEmail` / `contactName` em `dashboard_my_sales`; `subscriber.*` na lista de assinaturas) — sem lookups por lead em loop.
- **Motivo do cancelamento tem dois campos na assinatura de cliente final:** `cancellationReason` (enum classificado: `fraud`, `requested_by_customer`, …) e `reason` (texto livre). O enum só existe quando foi registrado no cancelamento; a divisão comercial (preço / sem tempo / sem motivo) continua sendo leitura curada sobre os dois campos — não filtro automático.
- **Valores em centavos** → exibir em R$ só na resposta.
- **Read-only.** Nenhum cupom, mensagem, tag ou cancelamento de forma automática.

## Processo de pensamento

1. **Travar a janela.** Default 60 dias para a data do cancelamento. A compra de retorno qualifica em qualquer momento depois do cancelamento, até hoje.
2. **Puxar coorte A (assinaturas canceladas)** via `subscriptions_list` com `['canceled']`, cortando client-side para dentro da janela. Montar `Map<email, canceladoEm>` guardando o cancelamento mais recente por pessoa.
3. **Puxar coorte B (compras avulsas pagas)** via `dashboard_my_sales` do cancelamento mais antigo até hoje, com `paid` + `OneTime`. Sem filtro de produto — "avulso" é qualquer produto não-recorrente.
4. **Intersectar com ordem temporal** (`compra > cancelamento`) e agregar por pessoa: nº de compras de retorno, primeira/última, valor total, `daysFromCancelToReturn`.
5. **Formato:** lista classificada por `firstReturnPurchaseAt` desc (mais quente primeiro), cap 30 com "+N mais". Motivo do cancelamento e cupom de volta apenas como acompanhamento opt-in.

## Guia de execução

Usar `execute` porque o job exige duas leituras, corte de data client-side, interseção com comparação de timestamps e agregação por pessoa.

**Entradas padrão:**

- `windowDays = 60`
- `maxRows = 2000`
- `topN = 30`

**Formato de saída esperado:**

- `period`
- `canceledSubscriptionsInWindow`
- `oneTimePaidRows`
- `resultCount`
- `results`

**Código de exemplo:**

```js
async () => {
  const windowDays = 60;
  const topN = 30;
  const today = new Date();
  const toIso = (d) => d.toISOString();

  // Janela default: cancelamentos dos últimos 60 dias.
  const from = new Date(today);
  from.setDate(today.getDate() - windowDays);
  from.setHours(0, 0, 0, 0);
  today.setHours(23, 59, 59, 999);

  const fromMs = from.getTime();
  const toMs = today.getTime();

  // FASE 1 — pull: assinaturas canceladas de cliente final.
  // A API não tem filtro de "cancelado entre X e Y" — corta-se client-side.
  const canceled = await codemode.subscriptions_list({
    status: ['canceled'],
    perPage: 2000,
    page: 1
  });
  const canceledRows = canceled?.data || [];

  // Map<email, cancelamento mais recente> dentro da janela.
  const cohortA = new Map();
  for (const row of canceledRows) {
    const rawCanceled = row.canceledAt || row.cancelledAt || row.updatedAt || null;
    if (!rawCanceled) continue;
    const ts = new Date(rawCanceled).getTime();
    if (ts < fromMs || ts > toMs) continue;

    const email = (row.contactEmail || row.subscriber?.email || row.buyer?.email || '').toLowerCase();
    if (!email) continue;

    const existing = cohortA.get(email);
    if (!existing || ts > existing.canceledAtMs) {
      cohortA.set(email, {
        canceledAtMs: ts,
        canceledAtIso: rawCanceled,
        subscriptionId: row.id || null,
        name: row.contactName || row.subscriber?.name || row.buyer?.name || '—'
      });
    }
  }

  if (cohortA.size === 0) {
    return {
      period: { from: toIso(from), to: toIso(today) },
      canceledSubscriptionsInWindow: 0,
      oneTimePaidRows: 0,
      resultCount: 0,
      results: []
    };
  }

  // FASE 2 — pull: compras avulsas pagas desde o cancelamento mais antigo da coorte A.
  const earliestCancelMs = Array.from(cohortA.values())
    .reduce((min, v) => (v.canceledAtMs < min ? v.canceledAtMs : min), Number.POSITIVE_INFINITY);

  const oneTimePaid = await codemode.dashboard_my_sales({
    filters: {
      transactionStatus: ['paid'],
      transactionRecurrence: 'OneTime',
      transactionPeriod: { from: toIso(new Date(earliestCancelMs)), to: toIso(today) }
    },
    perPage: 2000,
    column: 'createdAt',
    order: 'desc'
  });
  const oneTimeRows = oneTimePaid?.data || [];

  // FASE 3 — cruzamento + agregação: interseção por e-mail COM ordem temporal
  // (compra estritamente depois do cancelamento) e agregado por pessoa.
  const byEmail = new Map();
  for (const row of oneTimeRows) {
    const email = (row.contactEmail || row.buyer?.email || '').toLowerCase();
    if (!email) continue;

    const cancelInfo = cohortA.get(email);
    if (!cancelInfo) continue;

    const purchasedAtMs = row.createdAt ? new Date(row.createdAt).getTime() : 0;
    if (purchasedAtMs <= cancelInfo.canceledAtMs) continue; // win-back exige compra DEPOIS

    const amountCents = Number(row.value || row.amount || 0);
    const existing = byEmail.get(email);

    if (!existing) {
      byEmail.set(email, {
        name: row.contactName || row.buyer?.name || cancelInfo.name || '—',
        email: row.contactEmail || row.buyer?.email || null,
        canceledSubscriptionId: cancelInfo.subscriptionId,
        cancellationDate: cancelInfo.canceledAtIso,
        firstReturnPurchaseAt: row.createdAt || null,
        lastReturnPurchaseAt: row.createdAt || null,
        returnPurchaseCount: 1,
        totalReturnValueCents: amountCents,
        lastReturnProductName: row.productName || row.offer?.name || null,
        daysFromCancelToReturn: Math.max(0, Math.round((purchasedAtMs - cancelInfo.canceledAtMs) / 86400000)),
        _firstTs: purchasedAtMs,
        _lastTs: purchasedAtMs
      });
    } else {
      existing.returnPurchaseCount += 1;
      existing.totalReturnValueCents += amountCents;
      if (purchasedAtMs < existing._firstTs) {
        existing._firstTs = purchasedAtMs;
        existing.firstReturnPurchaseAt = row.createdAt || existing.firstReturnPurchaseAt;
        existing.daysFromCancelToReturn = Math.max(0, Math.round((purchasedAtMs - cancelInfo.canceledAtMs) / 86400000));
      }
      if (purchasedAtMs > existing._lastTs) {
        existing._lastTs = purchasedAtMs;
        existing.lastReturnPurchaseAt = row.createdAt || existing.lastReturnPurchaseAt;
        existing.lastReturnProductName = row.productName || row.offer?.name || existing.lastReturnProductName;
      }
    }
  }

  // FASE 4 — sort + cap: retorno mais recente primeiro (win-back mais quente).
  const results = Array.from(byEmail.values())
    .sort((a, b) => b._firstTs - a._firstTs)
    .map(({ _firstTs, _lastTs, ...rest }) => rest);

  return {
    period: { from: toIso(from), to: toIso(today) },
    canceledSubscriptionsInWindow: cohortA.size,
    oneTimePaidRows: oneTimeRows.length,
    resultCount: results.length,
    results: results.slice(0, topN)
  };
};
```

**Notas:**

- O nome do campo de cancelamento pode variar (`canceledAt` vs `cancelledAt`, com fallback `updatedAt`) — verificar contra a linha real antes de trocar.
- Os shapes de `GetSubscriptionsBody` e `GetDashboardMySalesBody` vêm do SDK gerado e não estão documentados campo a campo — confirme via `load_execute_methods` e ajuste nomes de campo se a validação reclamar.
- Ajustar somente filtros (janela, recorte de produto), fallbacks de campo ou o cap. A estrutura é intencional.
- O motivo do cancelamento, quando existir, vem por assinatura via `subscriptions_get` (drill-down): `cancellationReason` é enum classificado e `reason` é texto livre. Oferecer como follow-up curado, não buscar em loop pela coorte.
- Chamar toda capability da Clickmax via `codemode.*`.

## Relatório

- Abrir com a premissa entre aspas: *"Leads que cancelaram assinatura nos últimos 60 dias e fizeram pelo menos uma compra avulsa paga (`transactionRecurrence: 'OneTime'`) depois da data do cancelamento."*
- Lista de pessoas, cap 30, ordenada por `firstReturnPurchaseAt` desc, com "+N more" quando `resultCount > 30`.
- Destacar `daysFromCancelToReturn` — quem voltou em menos de ~30 dias é o candidato mais forte a reassinar.
- Valores monetários convertidos de centavos para R$.
- Tom de referência (números são exemplo de saída, nunca fixos): *"12 pessoas cancelaram a mensalidade e voltaram a comprar avulso — querem estar com você, só não nesse formato."*
- A segmentação por motivo do cancelamento (preço → semestral com desconto; sem tempo → pausa de 2 meses; sem motivo → CS liga) entra como leitura sugerida, condicionada a existir o motivo registrado — oferecer o drill-down via `subscriptions_get` como opt-in.
- `canceledSubscriptionsInWindow` / `oneTimePaidRows` aparecem uma vez como contexto, não como manchete.
- Follow-ups só como opt-in via `question`: cupom "volte com 30% off por 3 meses" com link único por pessoa (`flows_create`), tag `win-back-candidate` (`tags_create` + `crm_tags_apply_to_leads`), ampliar janela ou restringir a um produto. Nunca executar mutação sem confirmação explícita.

## Avisos

- "Mensalidade" = assinatura de cliente final → `subscriptions_*`. Nunca `plans_*` (SaaS do workspace).
- "Avulso" = `'OneTime'`. Nunca `'Recurrent'` — devolve assinantes ainda ativos, a coorte oposta.
- A janela de 60 dias vale para quando o cancelamento aconteceu, não para a compra de retorno. Compra de HOJE para cancelamento de 59 dias atrás qualifica.
- Ordem temporal é obrigatória: `compra.createdAt > assinatura.canceledAt`. Sem ela, entra quem já comprava avulso DURANTE a assinatura (comprador misto, não win-back).
- `transactionStatus: ['paid']` já exclui transações estornadas depois — não duplicar filtro.
- Motivo do cancelamento: `cancellationReason` é enum classificado e `reason` é texto livre — o enum pode não ter sido registrado, e o texto não é classificável automaticamente; a divisão preço/tempo/sem-motivo é curadoria humana sobre os dois campos.
- Valores em centavos — converter para R$ só na exibição.
- Read-only: nada de `subscriptions_cancel`, reembolso, mensagem, tag ou mutação de lista sem follow-up explícito.

## Antipadrões

- Buscar a coorte A em `plans_*` — plano SaaS do workspace, não assinaturas dos clientes dele.
- Filtrar `transactionRecurrence: 'Recurrent'` porque o usuário falou "mensalidade" — devolve assinantes ativos, o oposto do pedido.
- Pular a ordem temporal e devolver todo cancelado-que-também-comprou-alguma-vez — vira ruído de compradores mistos.
- Incluir `['canceled', 'active']` na coorte A — assinatura ativa não é lapsed.
- Subtrair quem ainda tem QUALQUER assinatura ativa em outro produto — o usuário pediu "cancelou esta e voltou avulso", não "sem nenhuma assinatura em lugar nenhum". Estreita demais.
- Loopar `subscriptions_get` ou lookups por lead pela coorte inteira para buscar o motivo — drill-down é opt-in, sob demanda.
- Inventar a segmentação por motivo (5 preço / 4 tempo / 3 sem motivo) sem o dado existir — os números da /v10 são ilustração, não saída garantida.
- Pedir `workspaceId` / `ownerId` ou confirmar a janela quando 60 dias é o default explícito.
- Retornar contagem quando pediram a lista — sempre renderizar as pessoas, capadas, com totais como contexto.
