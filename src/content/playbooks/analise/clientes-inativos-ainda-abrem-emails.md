## Quando isso se aplica

O usuário quer a **lista de clientes que já compraram, pararam de comprar há 6+ meses, mas continuam abrindo os e-mails** do workspace — segmentada por valor histórico (ouro / prata / bronze). Saída é uma coorte de pessoas com tier, não totais agregados.

### Desambiguação dos vizinhos

- **cooled-leads-by-funnel** — LEADS que esfriaram **sem nunca comprar**, agrupados por funil. Aqui eles são CLIENTES: exigem pelo menos uma compra paga.
- **canceled-purchase-not-returned** — compra paga e depois revertida (`refunded` / `chargeback`). Aqui a compra ficou; a pessoa só parou de comprar de novo.
- **cross-product-upsell-candidates** — mapa agregado da esteira de produtos. Aqui é coorte de reativação, pessoa a pessoa.

## Principais pressupostos

- "Cliente" exige ao menos 1 transação `paid` no histórico. Lead que nunca comprou está fora desta coorte.
- "Parou de comprar" = nenhuma `paid` nos últimos 180 dias (default). Agnóstico de produto e de método de pagamento.
- "Abre e-mail" = evento de **abertura** nos últimos 30 dias — não `sent`, não `clicked`. Abertura é sim/não por mensagem (timestamp da primeira abertura); **"abriu 4 vezes" não existe no dado** — não prometa contadores.
- Tiers por **gasto histórico acumulado em centavos**: ouro ≥ 150000 (R$ 1.500), prata 50000–149999 (R$ 500–1.500), bronze < 50000. O filtro V2 de `leads_search` expõe `lifeTimeValue` e `lastPurchaseDate` como folhas (bom cross-check da coorte), mas o tier daqui usa a soma das `paid` computada dos rows — precisa dos centavos exatos e do último produto por cliente.
- `transactionStatus: ['paid']` já exclui transações estornadas depois — não filtrar `refunded` em cima.
- Ponte de identidade: `buyer.leadId` inline nos rows de `dashboard_my_sales` → `leadId` dos eventos de e-mail; fallback por e-mail minúsculo.
- Playbook read-only. Disparo de oferta/flow só como follow-up opt-in.

## Processo de pensamento

1. **Coorte A — clientes sumidos.** Puxar todas as `paid` SEM filtro de período, agrupar por e-mail, computar última compra + gasto acumulado. Manter quem tem última compra anterior ao cutoff de 180 dias.
2. **Coorte B — aberturas recentes.** Eventos de abertura de e-mail dos últimos 30 dias via `lead_activities_system_list`; reduzir à última abertura por lead.
3. **Cruzar identidade.** Interseção por `leadId` (fallback e-mail) = cliente sumido-mas-engajado.
4. **Tier decide a abordagem.** Classificar por gasto acumulado (ouro/prata/bronze) — o tier ordena a resposta, não a recência de compra.
5. **Formato.** Ouro primeiro; dentro do tier, abertura mais recente primeiro. Cap 50 com "+N more".

## Guia de execução

Usar `execute` porque o playbook precisa de duas leituras, interseção entre chaves diferentes (e-mail × leadId), agregação por cliente e classificação em tiers.

**Entradas padrão:**

- `lapsedDays = 180`
- `openWindowDays = 30`
- `maxRows = 2000`
- `topN = 50`
- `goldMinCents = 150000` / `silverMinCents = 50000`

**Formato de saída esperado:**

- `period`
- `paidRows`
- `openRows`
- `lapsedBuyerCount`
- `tierSummary`
- `resultCount`
- `results`

**Código de exemplo:**

```js
async () => {
  const today = new Date();
  const toIso = (d) => d.toISOString();

  // Janelas padrão: 180d sem compra, 30d de aberturas recentes.
  const lapsedCutoff = new Date(today);
  lapsedCutoff.setDate(today.getDate() - 180);
  const openFrom = new Date(today);
  openFrom.setDate(today.getDate() - 30);
  openFrom.setHours(0, 0, 0, 0);
  today.setHours(23, 59, 59, 999);
  const openPeriod = { from: toIso(openFrom), to: toIso(today) };

  // FASE 1 — pull: todas as transações pagas, SEM filtro de período.
  // (Filtrar transactionPeriod = últimos 180d daria o conjunto OPOSTO.)
  const paid = await codemode.dashboard_my_sales({
    filters: { transactionStatus: ['paid'] },
    perPage: 2000,
    column: 'createdAt',
    order: 'desc'
  });
  const paidRows = paid?.data || [];

  // Agrupar por e-mail: última compra + gasto acumulado em CENTAVOS.
  const byEmail = new Map();
  for (const row of paidRows) {
    const email = (row.contactEmail || '').toLowerCase();
    if (!email) continue;
    const ts = row.createdAt ? new Date(row.createdAt).getTime() : 0;
    const cents = Number(row.value || row.amount || 0);
    const leadId = row.buyer?.leadId || row.leadId || null;
    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, {
        leadId,
        name: row.contactName || row.buyer?.name || '—',
        email: row.contactEmail,
        purchases: 1,
        lifetimeValueCents: cents,
        lastPurchaseAt: row.createdAt || null,
        lastProductName: row.productName || row.offer?.name || null,
        _lastTs: ts
      });
    } else {
      existing.purchases += 1;
      existing.lifetimeValueCents += cents;
      if (!existing.leadId && leadId) existing.leadId = leadId;
      if (ts > existing._lastTs) {
        existing._lastTs = ts;
        existing.lastPurchaseAt = row.createdAt || existing.lastPurchaseAt;
        existing.lastProductName =
          row.productName || row.offer?.name || existing.lastProductName;
      }
    }
  }

  // FASE 2 — corte: só quem tem a última compra ANTES do cutoff de 180d.
  const lapsedCutoffMs = lapsedCutoff.getTime();
  const lapsed = Array.from(byEmail.values()).filter(
    (b) => b._lastTs && b._lastTs < lapsedCutoffMs
  );

  // FASE 3 — cruzamento: aberturas de e-mail dos últimos 30 dias.
  // `categories` e `dateRange` são documentados; o facet de nome de evento vem
  // do shape gerado pelo SDK (conferir no worker). Se vier vazio, amostrar 1
  // página só com categories pra descobrir o literal real.
  const opens = await codemode.lead_activities_system_list({
    categories: ['Email'],
    eventNames: ['email_opened'],
    dateRange: openPeriod,
    perPage: 2000
  });
  const openRows = opens?.data || [];

  const lastOpenByLead = new Map();
  const lastOpenByEmail = new Map();
  for (const ev of openRows) {
    const leadId = ev.leadId || ev.lead?.id || null;
    const email = (ev.email || ev.lead?.email || '').toLowerCase();
    const at = ev.createdAt || ev.occurredAt || null;
    const ms = at ? new Date(at).getTime() : 0;
    if (leadId) {
      const prev = lastOpenByLead.get(leadId);
      if (!prev || ms > prev._ms) lastOpenByLead.set(leadId, { at, _ms: ms });
    }
    if (email) {
      const prev = lastOpenByEmail.get(email);
      if (!prev || ms > prev._ms) lastOpenByEmail.set(email, { at, _ms: ms });
    }
  }

  // FASE 4 — agregação: interseção + tier por gasto histórico + sort + cap.
  const goldMinCents = 150000; // R$ 1.500 em centavos
  const silverMinCents = 50000; // R$ 500 em centavos
  const todayMs = today.getTime();
  const matched = [];
  for (const b of lapsed) {
    const open =
      (b.leadId && lastOpenByLead.get(b.leadId)) ||
      lastOpenByEmail.get(b.email.toLowerCase()) ||
      null;
    if (!open) continue;
    const tier =
      b.lifetimeValueCents >= goldMinCents
        ? 'ouro'
        : b.lifetimeValueCents >= silverMinCents
          ? 'prata'
          : 'bronze';
    matched.push({
      tier,
      leadId: b.leadId,
      name: b.name,
      email: b.email,
      purchases: b.purchases,
      lifetimeValueCents: b.lifetimeValueCents,
      lastPurchaseAt: b.lastPurchaseAt,
      daysSinceLastPurchase: Math.floor((todayMs - b._lastTs) / 86400000),
      lastEmailOpenAt: open.at,
      daysSinceLastOpen: open._ms ? Math.floor((todayMs - open._ms) / 86400000) : null,
      lastProductName: b.lastProductName,
      _openMs: open._ms
    });
  }

  // Ordenar: ouro → prata → bronze; dentro do tier, abertura mais recente.
  const tierRank = { ouro: 0, prata: 1, bronze: 2 };
  matched.sort((a, b) => tierRank[a.tier] - tierRank[b.tier] || b._openMs - a._openMs);

  const tierSummary = {};
  for (const t of ['ouro', 'prata', 'bronze']) {
    const group = matched.filter((m) => m.tier === t);
    const total = group.reduce((s, m) => s + m.lifetimeValueCents, 0);
    tierSummary[t] = {
      count: group.length,
      totalLifetimeValueCents: total,
      avgLifetimeValueCents: group.length ? Math.round(total / group.length) : 0
    };
  }

  return {
    period: { lapsedCutoff: toIso(lapsedCutoff), opens: openPeriod },
    paidRows: paidRows.length,
    openRows: openRows.length,
    lapsedBuyerCount: lapsed.length,
    tierSummary,
    resultCount: matched.length,
    results: matched.slice(0, 50).map(({ _openMs, ...rest }) => rest)
  };
};
```

**Notas:**

- Ajustar só filtros (janelas, literal do evento de abertura, thresholds de tier), fallbacks de campo ou o cap. A forma é intencional — manter a resposta compacta.
- Sempre chamar capacidades do Clickmax via `codemode.*`.
- `question` fora do `execute` só para mutações de follow-up (disparar reativação via `flows_create`, marcar a coorte via `tags_create` + `crm_tags_apply_to_leads`) — nunca automático.

## Relatório

- Abrir com a premissa entre aspas: *"Clientes com última compra paga há mais de 180 dias (qualquer produto, qualquer método) que abriram ao menos um e-mail nos últimos 30 dias. Tiers por gasto histórico acumulado: ouro ≥ R$ 1.500, prata R$ 500–1.500, bronze < R$ 500."*
- Renderizar a coorte em pessoas, cap 50, ordem ouro → prata → bronze e abertura mais recente dentro do tier. Mencionar "+N more" quando `resultCount > 50`.
- Usar o `tierSummary` como contexto de apoio uma vez (formato típico: *"23 'ouro' com ticket histórico médio de R$ 4.137"* — números da /v10 são EXEMPLOS de saída, nunca prometa esses valores).
- Converter `lifetimeValueCents` para R$ na exibição.
- Citar o caveat de bots quando a coorte parecer grande demais (aberturas infladas por prefetch de imagem).
- Follow-ups só como opt-in via `question`: oferta personalizada nos ouro (com ângulos distintos por perfil), sequência de reativação nos prata (`flows_create`), funil de aquecimento nos bronze, marcar a coorte com tag (`tags_create` + `crm_tags_apply_to_leads`), ou ajustar janelas (90/180/365 de compra; 7/30/90 de abertura). Nunca atire sem confirmação explícita.

## Avisos

- `lifeTimeValue` e `lastPurchaseDate` existem como folhas do filtro V2 (`leads_search`) e servem de cross-check da coorte — mas o tier daqui usa a soma das `paid` em centavos computada dos rows, que dá valor exato + último produto. Não misture as duas medidas no mesmo report.
- Abertura é o timestamp da primeira abertura por mensagem, não um contador. Nunca reporte "abriu N vezes a mesma mensagem". Bots de prefetch inflam aberturas — citar uma vez quando a coorte parecer grande demais.
- `transactionPeriod: { from: hoje-180d }` na coorte A dá o oposto do desejado (quem comprou recentemente). A coorte certa é: última `paid` anterior ao cutoff.
- Thresholds de tier são em centavos (150000 = R$ 1.500). Errar a unidade joga todo mundo pro ouro.
- Read-only. Nenhum disparo, tag ou segmento sem follow-up explícito.

## Antipadrões

- Incluir quem nunca comprou mas abre e-mails — é outra coorte (nunca-compradores), não reativação de cliente.
- Usar evento de envio/clique no lugar de abertura — o usuário disse "abrem".
- Janela de aberturas larga (90 dias) — abertura velha vira "ainda abre" e polui a coorte.
- Classificar tier pelo valor da última compra em vez do gasto acumulado — rebaixa cliente recorrente de ticket baixo.
- Hardcode dos números da /v10 (207 clientes, 23 ouro, R$ 4.137) no código — são ilustração de Report.
- Fan-out de `leads_payments` por cliente — `dashboard_my_sales` já traz valor e identidade inline.
- Pedir `workspaceId` / `ownerId` ao usuário.
- Retornar contagem quando pediram a lista de pessoas.
