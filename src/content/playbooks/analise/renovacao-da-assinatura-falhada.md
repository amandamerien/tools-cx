## Quando isso se aplica

O usuário quer a **lista de assinantes ativos cuja cobrança recorrente falhou no último ciclo**, separada pela **causa da falha** (cartão expirado / sem saldo / bloqueado) — porque cada causa tem um play diferente. É o *silent churn*: a assinatura segue ativa, mas o dinheiro parou de entrar e some do caixa sem ninguém ver. Pergunta típica: "Quem teve falha na cobrança da mensalidade no último ciclo?"

Diferenciar dos playbooks vizinhos:

- **canceled-purchase-not-returned** — pagou e foi revertido (`refunded` / `chargeback`); o cliente já saiu. Aqui ele ainda é assinante ativo.
- **card-declined-recovery-list** — tentativa **avulsa** de cartão que falhou; a pessoa ainda não era cliente pagante. Aqui ela já paga todo mês — a renovação é que travou.
- **pending-pix-boleto-by-day** — código assíncrono pendente; nada a ver com recorrência.

## Principais pressupostos

- `past_due` existe no vocabulário de status da assinatura (doc de domínio: `active`, `canceled`, `pending`, `past_due`, …) e `subscriptions_list` aceita filtro de `status` no body — é o atalho quando o usuário só quer uma lista de inadimplentes. O padrão desse playbook continua **ancorado em transações recorrentes falhas**, porque é o que traz o motivo do gateway e os retries inline — sem isso não há separação por causa.
- `transactionRecurrence: 'Recurrent'` é **obrigatório** — sem ele, recusas de compra avulsa contaminam a coorte (essas pertencem ao **card-declined-recovery-list**).
- `transactionStatus: ['refused', 'failed']` — a renovação falhou antes do dinheiro entrar. Não `refunded` nem `chargeback`.
- `subscriptionStatus: ['active']` — queremos os recuperáveis, não quem já cancelou.
- Janela padrão = 35 dias (cobre ciclo mensal + janela típica de retries de dunning).
- Causa da falha classificada pelo **texto do motivo do gateway** (heurística): expirado (`expir` / `vencid`), sem saldo (`insuf` / `saldo` / `limite` / `funds`), bloqueado (`bloq` / `block` / `restri` / `lost` / `stolen`). O motivo é **texto livre, varia por gateway** (iopay/ticto) — sem o de-para real mapeado, o que não bater cai em "desconhecido", honestamente.
- "Mensalidade" é coloquial em PT-BR para qualquer assinatura — **não** filtrar intervalo por default; estreitar só se o usuário disser "anual"/"trimestral".
- Retries no mesmo loop = várias linhas → dedupe por **assinatura**, não por transação.
- Identidade, produto e motivo vêm inline nas linhas de `dashboard_my_sales` — não loopar `subscriptions_get` por linha.
- Playbook read-only. Nunca atualizar cartão, cancelar, reagendar ou disparar mensagem sem confirmação explícita.

## Processo de pensamento

1. **Confirmar que é recorrência** e travar os filtros: `Recurrent` + `refused` / `failed` + `active` + 35 dias. Pedido direto → rodar sem perguntar.
2. **Puxar falhas e subtrair as recuperadas**: segunda leitura com `paid` recorrente no mesmo período; assinatura que recuperou no retry sai — é o falso positivo nº 1 de lista de dunning.
3. **Dedupe por assinatura**, salvando a tentativa mais recente, o nº de retries no ciclo e o motivo do gateway.
4. **Classificar a causa em 4 grupos** (expirado / sem saldo / bloqueado / desconhecido) — cada um com play próprio: expirado resolve com fluxo de atualização de cartão (ou troca direta via `subscriptions_update_card` quando o cliente já tem outro cartão salvo — sempre opt-in); sem saldo pede retry em 3-5 dias; bloqueado só vira com CS humano.
5. **Dimensionar o vazamento**: MRR em risco (soma das mensalidades falhas), com anualização ×12 apenas como ilustração no Report.

## Guia de execução

Use `execute` porque o job precisa de duas leituras, subtração de conjuntos, dedupe por assinatura e classificação por causa.

**Entradas padrão:**

- `windowDays = 35`
- `maxRows = 2000`
- `perGroupCap = 12` (4 grupos × 12 = até 48 assinaturas listadas)

**Formato de saída esperado:**

- `period`
- `failedRows`
- `recoveredSubscriptions`
- `resultCount`
- `mrrAtRisk`
- `groups` — conjunto de `{ cause, label, suggestedPlay, count, mrrAtRisk, subscriptions, hiddenCount }`

**Código de exemplo:**

```js
async () => {
  const today = new Date();
  const toIso = (d) => d.toISOString();

  // Janela padrão: últimos 35 dias (ciclo mensal + janela típica de retry).
  const from = new Date(today);
  from.setDate(today.getDate() - 35);
  from.setHours(0, 0, 0, 0);
  today.setHours(23, 59, 59, 999);

  const transactionPeriod = { from: toIso(from), to: toIso(today) };

  // FASE 1 — pull: cobranças recorrentes que falharam em assinaturas AINDA ativas.
  const failed = await codemode.dashboard_my_sales({
    filters: {
      transactionRecurrence: 'Recurrent',
      transactionStatus: ['refused', 'failed'],
      subscriptionStatus: ['active'],
      transactionPeriod
    },
    perPage: 2000,
    column: 'createdAt',
    order: 'desc'
  });

  const failedRows = failed?.data || [];

  // FASE 2 — cruzamento: recorrentes PAGAS no mesmo período. Assinatura que
  // recuperou no retry sai da lista — o falso positivo clássico de dunning.
  const earliestFailed = failedRows
    .map((r) => (r.createdAt ? new Date(r.createdAt).getTime() : null))
    .filter((t) => t !== null)
    .reduce((min, t) => (min === null || t < min ? t : min), null);

  const recoveredFrom = earliestFailed ? new Date(earliestFailed) : from;

  const paid = await codemode.dashboard_my_sales({
    filters: {
      transactionRecurrence: 'Recurrent',
      transactionStatus: ['paid'],
      subscriptionStatus: ['active'],
      transactionPeriod: { from: toIso(recoveredFrom), to: toIso(today) }
    },
    perPage: 2000,
    column: 'createdAt',
    order: 'desc'
  });

  const recoveredSubs = new Set(
    (paid?.data || [])
      .map((r) => r.subscriptionId || r.subscription?.id || null)
      .filter(Boolean)
  );

  // FASE 3 — agregação: dedupe por assinatura (retries = várias linhas) e
  // classificação da causa pelo texto do motivo do gateway (heurística —
  // o motivo é texto livre e varia por gateway).
  const causeOf = (reason) => {
    const r = (reason || '').toLowerCase();
    if (!r) return 'desconhecido';
    if (r.includes('expir') || r.includes('vencid')) return 'expirado';
    if (r.includes('insuf') || r.includes('saldo') || r.includes('limite') || r.includes('funds')) return 'sem_saldo';
    if (r.includes('bloq') || r.includes('block') || r.includes('restri') || r.includes('lost') || r.includes('stolen')) return 'bloqueado';
    return 'desconhecido';
  };

  const bySub = new Map();
  for (const row of failedRows) {
    const subId = row.subscriptionId || row.subscription?.id || null;
    if (!subId || recoveredSubs.has(subId)) continue;

    const createdAtMs = row.createdAt ? new Date(row.createdAt).getTime() : 0;
    const amount = Number(row.value || row.amount || 0);
    const reason = row.gatewayReason || row.refusedReason || null;
    const existing = bySub.get(subId);

    if (!existing) {
      bySub.set(subId, {
        subscriptionId: subId,
        name: row.contactName || row.buyer?.name || '—',
        email: row.contactEmail || row.buyer?.email || null,
        productName: row.productName || row.offer?.name || null,
        attemptsInCycle: 1,
        lastAttemptAt: row.createdAt || null,
        failedAmount: amount,
        gatewayReason: reason,
        cause: causeOf(reason),
        _lastTs: createdAtMs
      });
    } else {
      existing.attemptsInCycle += 1;
      if (createdAtMs > existing._lastTs) {
        existing._lastTs = createdAtMs;
        existing.lastAttemptAt = row.createdAt || existing.lastAttemptAt;
        existing.failedAmount = amount || existing.failedAmount;
        existing.productName = row.productName || row.offer?.name || existing.productName;
        if (reason) {
          existing.gatewayReason = reason;
          existing.cause = causeOf(reason);
        }
      }
    }
  }

  // FASE 4 — sort + cap: agrupar por causa (cada uma tem um play diferente),
  // mais recente primeiro, 12 assinaturas por grupo.
  const groupDefs = [
    { cause: 'expirado', label: 'Cartão expirado', suggestedPlay: 'fluxo de atualização de cartão — resolve quase sozinho' },
    { cause: 'sem_saldo', label: 'Sem saldo no momento', suggestedPlay: 'reagendar a cobrança em 3-5 dias' },
    { cause: 'bloqueado', label: 'Cartão bloqueado', suggestedPlay: 'CS humano liga — não vira com e-mail' },
    { cause: 'desconhecido', label: 'Motivo não mapeado', suggestedPlay: 'revisar o motivo do gateway antes de agir' }
  ];

  const all = Array.from(bySub.values());
  const groups = groupDefs
    .map((def) => {
      const subs = all
        .filter((s) => s.cause === def.cause)
        .sort((a, b) => b._lastTs - a._lastTs)
        .map(({ _lastTs, cause, ...rest }) => rest);
      return {
        cause: def.cause,
        label: def.label,
        suggestedPlay: def.suggestedPlay,
        count: subs.length,
        mrrAtRisk: subs.reduce((s, x) => s + x.failedAmount, 0),
        subscriptions: subs.slice(0, 12),
        hiddenCount: Math.max(0, subs.length - 12)
      };
    })
    .filter((g) => g.count > 0);

  return {
    period: transactionPeriod,
    failedRows: failedRows.length,
    recoveredSubscriptions: recoveredSubs.size,
    resultCount: all.length,
    mrrAtRisk: all.reduce((s, x) => s + x.failedAmount, 0),
    groups
  };
};
```

**Notas:**

- O exemplo assume `subscriptionId`, `contactEmail`, `contactName`, `productName` e o motivo do gateway inline na linha; quando faltar, caia nos objetos aninhados `subscription` / `buyer` / `offer`.
- O body de `dashboard_my_sales` (`GetDashboardMySalesBody`) e o de `subscriptions_list` (`GetSubscriptionsBody`) são schemas zod gerados pelo SDK, fora do catálogo — os campos usados aqui (`transactionRecurrence`, `subscriptionStatus`, `status`) vêm desse shape; se a chamada rejeitar um campo, confira o schema no worker em vez de inventar variação.
- Cross-check opcional: `codemode.subscriptions_list` filtrando status `past_due` valida o tamanho da coorte vinda das transações — útil quando os números parecerem baixos.
- Ajuste só filtros (janela; intervalo via `subscriptionPlan` quando o usuário pedir), fallbacks de campo ou o cap por grupo.
- Sempre chame as capacidades do Clickmax via `codemode.*`.
- `subscriptions_get` só quando o usuário pedir o drill de uma assinatura específica (status atual, instrumento de pagamento, metadados de billing — dá pra corroborar cartão expirado pontualmente) — nunca por linha.
- `question` fica fora do `execute` e só para follow-up de mutação (atualizar cartão, reagendar, disparar fluxo) — nunca automático.

## Relatório

- Abrir com a premissa entre aspas: "Considerando cobranças recorrentes com falha (`refused`/`failed`) dos últimos 35 dias em assinaturas ainda ativas, excluindo as que recuperaram no retry."
- Manchete = o tamanho do vazamento: MRR em risco mensal e anualização ×12 como ilustração — ex. de saída ilustrativa (números da /v10, nunca hardcode): "17 assinantes não foram cobrados — R$ 2.380/mês ≈ R$ 28.560/ano saindo do caixa em silêncio; sem ação, viram cancelamento em até 30 dias."
- Um bloco por causa, na ordem expirado → sem saldo → bloqueado → desconhecido, com o `suggestedPlay` no header (ex.: "11 cartões expirados — atualização automática resolve"; "2 bloqueados — CS humano precisa ligar").
- Reforçar o enquadramento: na maioria, não é a pessoa querendo cancelar — é o cartão que não passou.
- Cap de 12 por grupo com `+N more`; `failedRows` e `recoveredSubscriptions` como contexto de apoio, uma vez.
- Follow-ups só como opt-in via `question`: disparar fluxo "Atualização de Cartão" pros expirados (via `flows_list` / `flows_create`) ou, quando o cliente já tiver outro cartão salvo, trocar o instrumento direto com `subscriptions_update_card` (write — uma assinatura por vez, com confirmação); reagendar cobrança dos sem-saldo; abrir tarefa de CS pros bloqueados — nunca automático.

## Avisos

- `past_due` existe no vocabulário de status da assinatura, mas identifica só o estado, não a causa — a separação expirado/saldo/bloqueado exige as transações recorrentes falhas. Use `subscriptions_list` com `status` como cross-check, não como substituto.
- Sem `transactionRecurrence: 'Recurrent'`, recusas avulsas contaminam a lista e colidem com card-declined-recovery-list.
- `subscriptionStatus: ['canceled']` devolve quem já saiu — não é a coorte recuperável.
- `refunded` é reversão pós-pagamento — não é falha de renovação. Mantenha `['refused', 'failed']`.
- O motivo da falha é texto livre por gateway — a classificação por palavra-chave é heurística. "Cartão expirado" pode ser corroborado pontualmente via `subscriptions_get` (instrumento de pagamento e metadados de billing da assinatura), mas isso não escala por linha: o que não bater na heurística cai em "desconhecido", e o Report diz isso.
- Não existe contador de retries no backend — `attemptsInCycle` é derivado das linhas da janela; a janela real de retry vem da configuração de tolerância da recorrência (não exposta na tool).
- Existem dois sistemas de assinatura (produtos do produtor vs. SaaS do próprio Clickmax); estas tools cobrem o lado produtor.
- A anualização ×12 é projeção ilustrativa, não fato — apresente como "se nada for feito".
- Read-only no caminho principal. `subscriptions_update_card` (troca de cartão), `subscriptions_cancel` e `subscriptions_mass_manage` existem na superfície, mas só entram como follow-up confirmado via `question` — nunca no fluxo default.

## Antipadrões

- Usar só `subscriptions_list` com status `past_due` e entregar sem causa — o pedido é separado por causa, e ela vem das transações recorrentes falhas.
- Esquecer `transactionRecurrence: 'Recurrent'` — o erro que mistura compra avulsa com mensalidade.
- Pular a subtração das recuperadas — deixa na lista assinatura que já pagou no retry (o falso positivo clássico de dunning).
- Filtrar `subscriptionPlan: ['monthly']` por default porque o usuário disse "mensalidade" — coloquialismo; todos os intervalos entram até que ele estreite.
- Loopar `subscriptions_get` por linha quando a linha já traz assinatura, contato, produto e motivo.
- Prometer o corte exato expirado/saldo/bloqueado quando o motivo não veio ou não bateu na heurística — é "desconhecido", não chute.
- Disparar o fluxo de atualização de cartão automaticamente "porque é óbvio" — mutação é sempre opt-in.
- Retornar contagem quando pediram a lista; pedir `workspaceId` / `ownerId` ao usuário.
