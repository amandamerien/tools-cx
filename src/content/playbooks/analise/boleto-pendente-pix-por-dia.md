## Quando isso se aplica

O usuário quer a **lista de quem gerou Pix ou boleto e ainda não pagou**, separada por **faixas de idade da cobrança** (`<1d`, `1-2d`, `2-3d`, `3d+`) — porque cada faixa pede um canal de abordagem diferente. Pergunta típica: "Quem gerou Pix ou boleto e ainda não pagou — separa por dias." A coorte é `pending` direto: **não há passo de subtração**.

Diferenciar dos playbooks vizinhos:

- **card-declined-recovery-list** — tentativas de **cartão** que falharam (`refused` / `failed`), com subtração de quem pagou depois. Aqui é método assíncrono parado em `pending`.
- **checkout-abandonment-by-product** — lifecycle `abandoned_cart`; inclui quem nem gerou cobrança.
- **canceled-purchase-not-returned** — pagou e foi revertido (`refunded` / `chargeback`). Aqui o dinheiro nunca entrou.

## Principais pressupostos

- `transactionType: ['pix', 'boleto']` apenas — "Pix OU boleto" é OR entre os métodos assíncronos, **não** OR incluindo cartão.
- `transactionStatus: ['pending']` apenas — é o estado "aguardando pagamento" dos métodos assíncronos. Nunca `paid`, `failed`, `refused`, `refunded`, `chargeback`.
- Janela padrão = 30 dias. Cobre o prazo típico de boleto e descarta Pix velho demais pra converter.
- Faixas calculadas pela **cobrança mais recente de cada pessoa**: `<1d`, `1-2d`, `2-3d`, `3d+`. Uma pessoa = uma faixa (decisão anti-spam: ninguém recebe duas abordagens), somando o valor de todas as suas pendências.
- Canal por faixa é **recomendação do Report**, não ação: e-mail (`<1d`), WhatsApp (`1-2d`, converte ~3× mais que e-mail nessa janela), ligação (`2-3d`), comercial (`3d+`).
- "Ainda não pagou" é o estado presente da transação — **não** rodar segunda query sobre a vida de compras do lead.
- Identidade (`contactEmail` / `contactName`) vem inline nas linhas de `dashboard_my_sales`.
- Playbook read-only. Nenhum disparo de sequência sem confirmação.

## Processo de pensamento

1. **Travar os filtros do pedido** (pix+boleto, `pending`, 30 dias) e rodar — os valores são conhecidos, sem perguntas prévias.
2. **Uma leitura só**; as faixas de idade são derivadas client-side a partir de `createdAt`. Não existe groupBy de faixa na API.
3. **Dedupe global por e-mail antes de distribuir nas faixas** — a faixa vem da cobrança mais recente do lead. Sem isso, a mesma pessoa aparece em duas faixas e recebe duas réguas.
4. **Formato fixo de 4 blocos** na ordem da faixa mais nova pra mais antiga, cada um com canal sugerido, contagem, valor total e leads capados.
5. **Engajamento ("abriu o lembrete") é drill-down opt-in**, não parte do default — roda sobre o stream de atividades (`lead_activities_system_list`, evento `email_opened`), e a métrica disponível é abriu sim/não, nunca um contador de aberturas.

## Guia de execução

Use `execute` porque o job precisa de uma leitura mais dedupe, cálculo de idade e agregação em faixas.

**Entradas padrão:**

- `windowDays = 30`
- `maxRows = 2000`
- `perBandCap = 12` (4 faixas × 12 = até 48 leads listados)

**Formato de saída esperado:**

- `period`
- `totalSourceRows`
- `uniqueLeads`
- `totalPendingValue`
- `bands` — conjunto de `{ band, channelHint, leadCount, totalPendingValue, leads, hiddenCount }`

**Código de exemplo:**

```js
async () => {
  const now = new Date();
  const toIso = (d) => d.toISOString();

  // Janela padrão: últimos 30 dias, a menos que o usuário tenha pedido outra.
  const from = new Date(now);
  from.setDate(now.getDate() - 30);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  const transactionPeriod = { from: toIso(from), to: toIso(to) };

  // FASE 1 — pull: Pix e boleto ainda pendentes na janela.
  const pending = await codemode.dashboard_my_sales({
    filters: {
      transactionType: ['pix', 'boleto'],
      transactionStatus: ['pending'],
      transactionPeriod
    },
    perPage: 2000,
    column: 'createdAt',
    order: 'desc'
  });

  const rows = pending?.data || [];

  // FASE 2 — dedupe: uma pessoa = uma entrada, ancorada na cobrança mais
  // recente (a mais recuperável), somando o valor de todas as pendências dela.
  const byEmail = new Map();
  for (const row of rows) {
    const email = (row.contactEmail || '').toLowerCase();
    if (!email || !row.createdAt) continue;

    const createdAtMs = new Date(row.createdAt).getTime();
    const amount = Number(row.value || row.amount || 0);
    const method = row.transactionType || row.paymentMethod || null;
    const existing = byEmail.get(email);

    if (!existing) {
      byEmail.set(email, {
        name: row.contactName || row.buyer?.name || '—',
        email: row.contactEmail,
        method,
        charges: 1,
        totalPendingValue: amount,
        lastChargeAt: row.createdAt,
        lastProductName: row.productName || row.offer?.name || null,
        _lastTs: createdAtMs
      });
    } else {
      existing.charges += 1;
      existing.totalPendingValue += amount;
      if (createdAtMs > existing._lastTs) {
        existing._lastTs = createdAtMs;
        existing.lastChargeAt = row.createdAt;
        existing.lastProductName = row.productName || row.offer?.name || existing.lastProductName;
        existing.method = method || existing.method;
      } else if (method && existing.method && method !== existing.method) {
        existing.method = 'mixed';
      }
    }
  }

  // FASE 3 — agregação: distribuir cada lead na faixa de idade da cobrança
  // mais recente. Cada faixa pede um canal diferente no Report.
  const dayMs = 24 * 60 * 60 * 1000;
  const bands = [
    { band: '<1d', channelHint: 'email', leads: [] },
    { band: '1-2d', channelHint: 'whatsapp', leads: [] },
    { band: '2-3d', channelHint: 'ligacao', leads: [] },
    { band: '3d+', channelHint: 'comercial', leads: [] }
  ];

  for (const lead of byEmail.values()) {
    const ageDays = (Date.now() - lead._lastTs) / dayMs;
    const idx = ageDays < 1 ? 0 : ageDays < 2 ? 1 : ageDays < 3 ? 2 : 3;
    bands[idx].leads.push(lead);
  }

  // FASE 4 — sort + cap: dentro de cada faixa, mais recente primeiro,
  // capado em 12 leads por faixa.
  const result = bands.map((b) => {
    const sorted = b.leads
      .sort((a, z) => z._lastTs - a._lastTs)
      .map(({ _lastTs, ...rest }) => rest);
    return {
      band: b.band,
      channelHint: b.channelHint,
      leadCount: sorted.length,
      totalPendingValue: sorted.reduce((s, l) => s + l.totalPendingValue, 0),
      leads: sorted.slice(0, 12),
      hiddenCount: Math.max(0, sorted.length - 12)
    };
  });

  return {
    period: transactionPeriod,
    totalSourceRows: rows.length,
    uniqueLeads: byEmail.size,
    totalPendingValue: result.reduce((s, b) => s + b.totalPendingValue, 0),
    bands: result
  };
};
```

**Notas:**

- O exemplo assume `contactEmail` / `contactName` / `productName` / `transactionType` inline na linha; quando faltar, caia nos objetos aninhados `buyer` / `offer`.
- O body de `dashboard_my_sales` (`GetDashboardMySalesBody`) é schema zod gerado pelo SDK, fora do catálogo — se a chamada rejeitar um campo de filtro, confira o schema no worker em vez de inventar variação.
- Drills opt-in via `codemode.lead_activities_system_list`: evento `email_opened` (quem abriu o lembrete) e eventos `pix_expired` / `boleto_expired` (código já morto). O facet exato de evento no body vem do schema gerado — inspecione uma página pequena do payload antes de fixar o filtro, como recomenda o doc de lead-activities.
- Ajuste só filtros (janela, conjunto de métodos), fallbacks de campo ou o cap por faixa. O shape de 4 faixas é o contrato do playbook.
- Sempre chame as capacidades do Clickmax via `codemode.*`.
- `question` fica fora do `execute` e só para acompanhamento de mutação (disparar as sequências, marcar conexão) — nunca automático.

## Relatório

- Abrir com a premissa entre aspas: "Considerando Pix/boleto em `pending` dos últimos 30 dias, separados pela idade da cobrança mais recente de cada pessoa."
- Renderizar os 4 blocos na ordem `<1d` → `3d+`, cada um com canal sugerido, contagem e valor no topo — ex. de saída ilustrativa (números da /v10, nunca hardcode): "Há 1 a 2 dias — 18 pessoas · R$ 4.108 — momento crítico: WhatsApp converte ~3× mais que e-mail nessa faixa."
- Mencionar `+N more` quando `hiddenCount > 0`; omitir faixa vazia.
- Caveat de validade uma vez, no rodapé: Pix expira em minutos/horas e boleto em dias — `pending` não prova que o código ainda está vivo; cobranças `3d+` podem exigir gerar código novo, não só lembrar. Drill opt-in: cruzar com os eventos `pix_expired` / `boleto_expired` via `lead_activities_system_list` pra separar pendência viva de código morto.
- Oferecer o drill de engajamento como opt-in ("quer que eu verifique quem já abriu o lembrete?") — via `lead_activities_system_list` (evento `email_opened`), deixando claro que a métrica é abriu sim/não.
- Disparo das 4 sequências (uma por faixa, canal certo por faixa) só como opt-in via `question`, citando que a execução seria via flow (`flows_list` / `flows_create`) — nunca automática.

## Avisos

- Nunca incluir `'credit'` — "Pix ou boleto" não é "qualquer pagamento que não entrou". Cartão recusado é card-declined-recovery-list.
- "Abriu o e-mail 4 vezes" não existe no dado: a abertura registrada é o timestamp da primeira visualização, não um contador. Prometa só "abriu (sim/não)".
- O vencimento do boleto/Pix não é coluna tipada (mora num Json de detalhes da transação) — idade da cobrança ≠ validade do código. O stream de atividades registra `pix_expired` / `boleto_expired`: use esses eventos no drill opt-in em vez de adivinhar validade. Seja explícito no Report.
- A faixa é da cobrança mais recente do lead: pessoa com boleto velho + Pix novo aparece na faixa nova. É deliberado (uma régua por pessoa) — não "corrija" duplicando.
- "Ainda não pagou" é estado da transação; não rode segunda query sobre o histórico de compras do lead.
- Read-only. Nenhuma tool de envio/tag/lista sem follow-up explícito.

## Antipadrões

- Devolver lista plana quando o usuário pediu explicitamente "separa por dias".
- Incluir falhas de cartão porque o bot misturou "Pix ou boleto" com "qualquer pagamento que falhou".
- Incluir `refunded`/`chargeback` por confundir "pendente" com "estornado".
- Deixar a mesma pessoa em duas faixas por agrupar cobrança por cobrança em vez de deduplicar por lead primeiro.
- Inventar contador de aberturas de e-mail pra ranquear quem está "quente".
- Pedir `workspaceId` / janela de datas antes de entregar — o default de 30 dias é razoável; mencione e rode.
- Retornar contagens quando a pergunta foi "quem" — os leads aparecem por nome/e-mail dentro de cada faixa.
