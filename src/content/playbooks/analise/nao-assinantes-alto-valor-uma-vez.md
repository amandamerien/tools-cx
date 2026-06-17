## Quando isso se aplica

Usuário quer a **lista de quem fez compra avulsa de alto valor** (ex.: > R$5K em produto único) **e não está em nenhuma assinatura ativa** — os clientes mais lucrativos, sem nenhum compromisso recorrente. Saída é de pessoas, priorizando quem está na **janela ideal de 90-120 dias** desde a primeira compra qualificada.

Desambiguação de vizinhos:

- **ticket-band-upsell-recommendation** — banda `[min, max]` + cluster + produto recomendado por comprador. Aqui é threshold aberto `>= R$X`, sem recomendação de produto — a rota é humana (1:1).
- **low-ticket-upsell-readiness** — engajamento de quem comprou **barato**. Aqui o qualificador é valor alto numa compra avulsa.
- **canceled-purchase-not-returned** — cobre `refunded` / `chargeback`; aqui o comprador continua satisfeito com a transação.

## Principais pressupostos

- Dinheiro = centavos inteiros. R$5K = `500000`, não `5000`. Multiplicar os reais do usuário por 100 antes de qualquer filtro e repetir a conversão no cabeçalho da resposta.
- "Produto único" é ambíguo — escolher um caminho e declarar:
  - **Path A** (default — transação única) = um `saleValue >= threshold`. Leitura literal, mais barata.
  - **Path B** (acumulado num produto) = soma de pagas por `(comprador, produto) >= threshold`. Só quando o usuário pedir "soma/acumulado".
- `transactionRecurrence: 'OneTime'` — NÃO `'Recurrent'`. "Produto único" = compra avulsa, não "um produto de assinatura".
- `transactionStatus: ['paid']` apenas — já exclui estornadas; não duplo-filtrar.
- Sem `transactionPeriod` por default — comprador de alto valor de qualquer época é alvo de recorrência; o usuário pode estreitar (ex.: últimos 18 meses).
- "Não está em nenhuma assinatura" = assinaturas **ativas** (`status: ['active']`). Ex-assinante (`canceled`) continua sendo bom alvo — exibir a escolha no Report.
- `subscriptions_list` = assinatura do **cliente final** (produtos do produtor). O plano SaaS do próprio workspace no Clickmax é outro sistema de assinatura — conjunto errado.
- Janela ideal = 90-120 dias desde a PRIMEIRA compra qualificada — heurística de timing (momento de pensar "preciso da próxima estrutura"); prioriza, não exclui.
- Identidade e venda (`buyer.*`, `productId`, `saleValue`, `paymentMethod`, `createdAt`) já vêm inline nas linhas — não fazer fan-out por linha.
- Read-only. Criar tarefa/card pro vendedor sênior é opt-in.

## Processo de pensamento

1. **Confirmar o caminho.** Default = Path A (transação única `>= threshold`). Trocar pra Path B só se o usuário disser "soma"/"acumulado no produto"; `question` apenas quando ambíguo.
2. **Travar filtros do pedido:** `paid` + `OneTime` + threshold em centavos. Sem período por default.
3. **Subtrair assinantes ativos** via `subscriptions_list` com `status: ['active']`, por e-mail.
4. **Dedupe por e-mail** com a compra qualificadora (maior transação no A, melhor soma-produto no B) + calcular `daysSinceFirstQualifying` e marcar a janela ideal de 90-120 dias.
5. **Ordenar: janela ideal primeiro, depois valor desc; top 30.** A venda aqui é humana (1:1 com vendedor sênior) — citar como opt-in, nunca criar card automaticamente.

## Guia de execução

Use `execute` porque o playbook precisa de duas leituras, subtração de conjuntos, agregação por comprador com matemática de centavos e cálculo da janela ideal.

**Entradas padrão:**

- `thresholdReais = 5000` (→ `500000` centavos; ajustar ao valor dado pelo usuário)
- `idealWindowDays = [90, 120]` (desde a primeira compra qualificada)
- `maxRows = 2000`
- `topN = 30`

**Formato de saída esperado:**

- `assumptionsHeader`
- `path` (`'A'` ou `'B'`)
- `thresholdCentavos`
- `highValueRows`
- `activeSubscriberCount`
- `idealWindowCount`
- `resultCount`
- `results`

**Código de exemplo:**

```js
async () => {
  // Conversão de moeda: reais do usuário × 100 = centavos.
  const thresholdReais = 5000;
  const thresholdCentavos = thresholdReais * 100;

  // Path A (default) = uma transação única >= threshold. Path B = soma por (comprador, produto).
  const path = 'A';

  // ===== FASE 1 — pull: coorte de alto valor avulso =====
  // O pré-filtro valueOfLastPurchase olha a ÚLTIMA compra — pode perder quem teve a
  // maior compra antes da última. Remova-o pra cobertura total (mais linhas, mais lento).
  const highValue = await codemode.dashboard_my_sales({
    filters: {
      transactionStatus: ['paid'],
      transactionRecurrence: 'OneTime',
      ...(path === 'A' ? { valueOfLastPurchase: { min: thresholdCentavos } } : {})
    },
    perPage: 2000,
    column: 'saleValue',
    order: 'desc'
  });
  const highValueRows = highValue?.data || [];

  // ===== FASE 2 — subtract: assinantes ativos saem da lista =====
  // Shape do body vem do SDK (GetSubscriptionsBody) — confirme via load_execute_methods.
  // Se o enum expor estados ativos granulares (active_paid/active_trial/...), inclua todos.
  const subs = await codemode.subscriptions_list({
    status: ['active'],
    perPage: 2000,
    page: 1
  });
  const activeSubEmails = new Set(
    (subs?.data || [])
      .map((s) => (s.buyer?.email || s.contactEmail || '').toLowerCase())
      .filter(Boolean)
  );

  // ===== FASE 3 — agregação: dedupe por e-mail com a compra qualificadora =====
  const byEmail = new Map();

  if (path === 'A') {
    for (const row of highValueRows) {
      const email = (row.buyer?.email || '').toLowerCase();
      if (!email || activeSubEmails.has(email)) continue;
      const amount = Number(row.saleValue || 0);
      if (amount < thresholdCentavos) continue;

      const atual = byEmail.get(email);
      if (!atual) {
        byEmail.set(email, {
          contactName: row.buyer?.name || '—',
          contactEmail: row.buyer?.email,
          contactDocument: row.buyer?.document || null,
          leadId: row.buyer?.leadId || null,
          qualifyingValue: amount,
          qualifyingProductId: row.productId || null,
          qualifyingProductName: row.product || null,
          qualifyingPaymentDate: row.createdAt || null,
          qualifyingPaymentMethod: row.paymentMethod || null,
          qualifyingPurchaseCount: 1,
          firstQualifyingAt: row.createdAt || null
        });
      } else {
        atual.qualifyingPurchaseCount += 1;
        if (amount > atual.qualifyingValue) {
          atual.qualifyingValue = amount;
          atual.qualifyingProductId = row.productId || atual.qualifyingProductId;
          atual.qualifyingProductName = row.product || atual.qualifyingProductName;
          atual.qualifyingPaymentDate = row.createdAt || atual.qualifyingPaymentDate;
          atual.qualifyingPaymentMethod = row.paymentMethod || atual.qualifyingPaymentMethod;
        }
        if (
          row.createdAt &&
          (!atual.firstQualifyingAt || new Date(row.createdAt) < new Date(atual.firstQualifyingAt))
        ) {
          atual.firstQualifyingAt = row.createdAt;
        }
      }
    }
  } else {
    // Path B: somar por (e-mail, produto) e qualificar pela soma.
    const porPar = new Map();
    for (const row of highValueRows) {
      const email = (row.buyer?.email || '').toLowerCase();
      const productId = row.productId || null;
      if (!email || !productId || activeSubEmails.has(email)) continue;
      const amount = Number(row.saleValue || 0);
      const key = email + '::' + productId;
      const atual = porPar.get(key);
      if (!atual) {
        porPar.set(key, {
          email,
          productId,
          contactName: row.buyer?.name || '—',
          contactEmail: row.buyer?.email,
          contactDocument: row.buyer?.document || null,
          leadId: row.buyer?.leadId || null,
          productName: row.product || null,
          sum: amount,
          count: 1,
          lastDate: row.createdAt || null,
          lastMethod: row.paymentMethod || null,
          firstDate: row.createdAt || null
        });
      } else {
        atual.sum += amount;
        atual.count += 1;
        if (row.createdAt && (!atual.lastDate || new Date(row.createdAt) > new Date(atual.lastDate))) {
          atual.lastDate = row.createdAt;
          atual.lastMethod = row.paymentMethod || atual.lastMethod;
        }
        if (row.createdAt && (!atual.firstDate || new Date(row.createdAt) < new Date(atual.firstDate))) {
          atual.firstDate = row.createdAt;
        }
      }
    }
    for (const par of porPar.values()) {
      if (par.sum < thresholdCentavos) continue;
      const atual = byEmail.get(par.email);
      if (!atual || par.sum > atual.qualifyingValue) {
        byEmail.set(par.email, {
          contactName: par.contactName,
          contactEmail: par.contactEmail,
          contactDocument: par.contactDocument,
          leadId: par.leadId,
          qualifyingValue: par.sum,
          qualifyingProductId: par.productId,
          qualifyingProductName: par.productName,
          qualifyingPaymentDate: par.lastDate,
          qualifyingPaymentMethod: par.lastMethod,
          qualifyingPurchaseCount: par.count,
          firstQualifyingAt: par.firstDate
        });
      }
    }
  }

  // ===== FASE 4 — janela ideal (90-120d desde a 1ª compra qualificada) + sort + cap =====
  const agora = Date.now();
  const todos = Array.from(byEmail.values());
  for (const r of todos) {
    r.daysSinceFirstQualifying = r.firstQualifyingAt
      ? Math.floor((agora - new Date(r.firstQualifyingAt).getTime()) / 86400000)
      : null;
    r.inIdealWindow =
      r.daysSinceFirstQualifying !== null &&
      r.daysSinceFirstQualifying >= 90 &&
      r.daysSinceFirstQualifying <= 120;
  }
  todos.sort(
    (a, b) =>
      Number(b.inIdealWindow) - Number(a.inIdealWindow) || b.qualifyingValue - a.qualifyingValue
  );

  const assumptionsHeader =
    'Compradores com compra avulsa (OneTime) >= R$' +
    thresholdReais.toLocaleString('pt-BR') +
    ' (' + thresholdCentavos + ' centavos), sem assinatura ativa. Path ' + path +
    '. Janela ideal = 90-120 dias desde a primeira compra qualificada. Conversão: R$1 = 100 centavos.';

  return {
    assumptionsHeader,
    path,
    thresholdCentavos,
    highValueRows: highValueRows.length,
    activeSubscriberCount: activeSubEmails.size,
    idealWindowCount: todos.filter((r) => r.inIdealWindow).length,
    resultCount: todos.length,
    results: todos.slice(0, 30)
  };
};
```

**Notas:**

- O sample assume `buyer.email` / `buyer.name` / `product` / `productId` / `saleValue` / `paymentMethod` / `createdAt` inline nas linhas de `dashboard_my_sales`; se algum faltar, use os fallbacks aninhados já presentes.
- Os shapes de `GetDashboardMySalesBody` (ex.: `valueOfLastPurchase`, `transactionRecurrence`) e `GetSubscriptionsBody` vêm do SDK gerado e não estão documentados campo a campo — confirme via `load_execute_methods` antes de rodar e ajuste nomes de campo se a validação reclamar.
- Ajuste só `thresholdReais`, a flag `path`, a janela ideal e fallbacks de campo. Mantenha a forma — resposta compacta.
- Sempre chame as capacidades do Clickmax via `codemode.*`.
- `question` fora do `execute` pra: trocar pro Path B, incluir ex-assinantes (`canceled`), estreitar pra uma janela (ex.: 18 meses), ou criar tarefa/card pro vendedor sênior — nunca automático.

## Relatório

- Abrir com o `assumptionsHeader` retornado pelo execute, entre aspas: "Compradores com compra avulsa (OneTime) >= R$5.000 (500000 centavos), sem assinatura ativa. Janela ideal = 90-120 dias desde a primeira compra qualificada."
- Destacar `idealWindowCount`: "X estão na janela ideal AGORA" — é o grupo do 1:1 imediato (a /v10 ilustra: "5 estão na janela ideal", "+R$ 33.852/ano se metade fechar" — exemplo de tom, não promessa).
- Lista cap 30, classificada por janela ideal primeiro e depois `qualifyingValue` desc. Colunas: `contactName` | `contactEmail` | `qualifyingValue` (R$) | `qualifyingProductName` | `daysSinceFirstQualifying` | janelaIdeal (s/n).
- Mencionar `+N more` quando `resultCount > 30`.
- `highValueRows` e `activeSubscriberCount` uma vez, como contexto — não como manchete.
- Deixar explícito que a exclusão considerou só assinaturas ativas — oferecer ampliar pra `['active', 'canceled']` se o usuário quis "nunca assinou".
- Follow-up só como opt-in via `question`: criar tarefa/card 1:1 pro vendedor sênior (`cards_create`) com os da janela ideal, trocar pro Path B, estreitar período. Cliente premium não compra em massa — a rota é humana, e mesmo assim só com confirmação.

## Avisos

- `transactionRecurrence: 'OneTime'`, não `'Recurrent'`. "Produto único" = compra avulsa; inverter dá a coorte oposta.
- R$5K = 500000 centavos. Multiplicar reais por 100 e declarar a conversão no cabeçalho.
- "Não está em nenhuma assinatura" default = assinaturas ativas. "Nunca assinou" → ampliar exclusão pra `['active', 'canceled']`. Se o enum do workspace expor estados ativos granulares (`active_paid`/`active_trial`/`active_trial_expired`), inclua todos no subtract.
- `transactionStatus: ['paid']` já exclui estornadas — não duplo-filtrar, e nunca `['paid', 'authorized']` (authorized não pagou de fato).
- `subscriptions_list` é assinatura do cliente final; o plano SaaS do próprio workspace é outro sistema de assinatura — conjunto errado pra exclusão.
- O pré-filtro `valueOfLastPurchase` olha a última compra — pode perder quem teve a maior compra antes da última; remova-o pra cobertura total.
- A janela 90-120d é heurística de priorização sobre a primeira compra qualificada — quem está fora da janela continua alvo, só desce na fila. Não calcular da última compra.
- Read-only. Nenhuma criação de card/tarefa/disparo sem opt-in explícito.

## Antipadrões

- Passar os reais direto no filtro (`valueOfLastPurchase.min = 5000` em vez de `500000`) — bug silencioso de moeda; promove comprador de ticket baixo a "premium".
- Filtrar `transactionRecurrence: 'Recurrent'` por ter lido errado "produto único" — coorte invertida.
- Pular o subtract de assinantes e devolver todo comprador de alto valor, incluindo quem já paga mensalidade.
- Calcular a janela ideal a partir da última compra em vez da primeira qualificada — muda quem aparece como "agora".
- Devolver transações cruas paginadas em vez de compradores dedupe — pediram QUEM ("quais clientes"), saída é de pessoas.
- `transactionStatus: ['paid', 'authorized']` — `authorized` é pré-finalização de cartão; não pagou.
- Pedir `workspaceId` / `ownerId` ou janela de datas quando o default sem período é razoável.
- Criar o card/tarefa pro vendedor sênior sem confirmação explícita do usuário.
