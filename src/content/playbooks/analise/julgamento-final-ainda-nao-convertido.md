## Quando isso se aplica

O usuário quer a **lista de quem está em trial gratuito de cliente final prestes a expirar e ainda não foi cobrado com sucesso** — segmentada por urgência (acaba em ≤3, ≤7, ≤14 dias) e cruzada com engajamento (logou na área de membros ou não). Cada janela pede uma abordagem diferente; quem expira em 3 dias E não loga é o churn mais certo da semana. Saída é gente, ordenada do mais urgente pro menos.

### Desambiguação dos vizinhos

- **subscription-renewal-failed** — assinatura paga cuja cobrança recorrente falhou. Aqui nunca houve cobrança bem-sucedida; a pessoa ainda testa.
- **dormant-subscribers-no-member-access** — já paga e parou de usar. Aqui ainda não pagou nada.
- **lapsed-subscriber-bought-one-time** — já cancelou. Aqui o trial está vivo.

## Principais pressupostos

- **Trial de cliente final** → `subscriptions_*` com `active_trial`. Nunca `plans_*` (trial do plano SaaS do próprio workspace na Clickmax).
- **`['active_trial']` é o ÚNICO status da coorte.** Ele já codifica "assinatura ativa E nenhuma transação paga" — não combinar com filtros de `transactionStatus` para "conferir". O enum real e o shape do body (`GetSubscriptionsBody`) vêm do SDK gerado — confirme via `load_execute_methods(['subscriptions_list'])`; se o workspace só expor `active`, puxe os ativos e identifique trial client-side pelos campos de trial da linha.
- **Janelas default = 3 / 7 / 14 dias, calculadas client-side.** A API não tem filtro "expira em N dias". Fim do trial = `expiresTrialAt` (canônico) ou fallback `activationDate + freeTrialPeriodInDays` (em DIAS). Nunca calcular a partir de `createdAt`.
- **Engajamento = `lastLoginAt`** via `member_users_list`, join por e-mail minúsculo. Trial sem cadastro de membro → engajamento **desconhecido**, mas o lead **fica na coorte** (diferente do dormant-subscribers, onde sem-membro sai).
- Na área de membros, acesso com `expiresAt = null` é **vitalício — não é trial.** O trial canônico deste job vem da assinatura, não da janela de acesso do members.
- `price` em centavos → exibir em R$ só na resposta.
- **Read-only.** Nenhuma mensagem, bônus, tag ou mutação de forma automática.

## Processo de pensamento

1. **Travar o status:** `['active_trial']`, sem `transactionStatus` e sem `transactionPeriod` — a linha do tempo é a do trial de cada assinatura, não um período de calendário.
2. **Duas leituras:** `subscriptions_list` (trials) + `member_users_list` (login) — cruzar por e-mail para anotar engajamento.
3. **Calcular `daysRemaining` client-side** e bucketizar: 🔴 ≤3d, 🟡 4–7d, 🟢 8–14d. Descartar expirado (`daysRemaining <= 0` — isso é `active_trial_expired`, outra coorte) e acima de 14d.
4. **Marcar engajamento por pessoa:** logou nos últimos 7 dias = engajada (tende a converter sozinha); login antigo ou nunca = fria (prioridade de toque humano). Sem cadastro de membro = sem sinal.
5. **Formato:** 1 linha por pessoa (trial mais urgente prevalece), `daysRemaining` asc e fria antes da engajada no mesmo dia, cap 50. Mensagem por janela só como opt-in.

## Guia de execução

Usar `execute` porque o job exige duas leituras, conta de datas client-side, bucketização por janela, cruzamento de engajamento e agrupamento por pessoa.

**Entradas padrão:**

- `windowsDays = [3, 7, 14]`
- `engagementDays = 7`
- `maxRows = 2000`
- `topN = 50`

**Formato de saída esperado:**

- `windows`
- `totalActiveTrials`
- `bucket3dCount`
- `bucket7dCount`
- `bucket14dCount`
- `lowEngagement3dCount`
- `resultCount`
- `results`

**Código de exemplo:**

```js
async () => {
  const windowsDays = [3, 7, 14];
  const maxWindow = 14;
  const engagementDays = 7;
  const topN = 50;
  const DAY_MS = 24 * 60 * 60 * 1000;

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const todayMs = today.getTime();

  // FASE 1 — pull: trials ativos de cliente final.
  // 'active_trial' já significa "ativa e sem cobrança paga" — sem transactionStatus.
  const trials = await codemode.subscriptions_list({
    status: ['active_trial'],
    perPage: 2000,
    page: 1
  });
  const trialRows = trials?.data || [];

  // FASE 1b — pull: membros pra cruzar engajamento (lastLoginAt), indexados por e-mail.
  const members = await codemode.member_users_list({
    active: true,
    orderBy: 'lastAccess',
    orderByMode: 'desc',
    perPage: 2000,
    page: 1
  });
  const memberByEmail = new Map();
  for (const m of (members?.data || [])) {
    const email = (m.email || '').toLowerCase();
    if (email) memberByEmail.set(email, m);
  }

  // FASE 2 — cruzamento: fim do trial, janela de urgência e engajamento por linha.
  const enriched = [];
  for (const row of trialRows) {
    const subscriber = row.subscriber || {};
    const email = (subscriber.email || '').toLowerCase();
    if (!email) continue;

    // expiresTrialAt é canônico; fallback = activationDate + freeTrialPeriodInDays (em DIAS).
    let endsAtMs = null;
    if (row.expiresTrialAt) {
      endsAtMs = new Date(row.expiresTrialAt).getTime();
    } else if (row.activationDate && row.freeTrialPeriodInDays) {
      endsAtMs = new Date(row.activationDate).getTime() + Number(row.freeTrialPeriodInDays) * DAY_MS;
    }
    if (!endsAtMs) continue;

    const daysRemaining = Math.ceil((endsAtMs - todayMs) / DAY_MS);
    // <= 0 já expirou (coorte do active_trial_expired); > 14 ainda não é urgente.
    if (daysRemaining <= 0 || daysRemaining > maxWindow) continue;

    const bucket = daysRemaining <= windowsDays[0] ? '3d'
      : daysRemaining <= windowsDays[1] ? '7d'
      : '14d';

    // Engajamento: logou nos últimos engagementDays?
    // null = sem cadastro de membro (sinal desconhecido — NÃO excluir da coorte).
    const member = memberByEmail.get(email);
    let engaged = null;
    let lastLoginAt = null;
    if (member) {
      lastLoginAt = member.lastLoginAt || null;
      engaged = lastLoginAt
        ? (todayMs - new Date(lastLoginAt).getTime()) / DAY_MS <= engagementDays
        : false;
    }

    enriched.push({
      name: subscriber.name || '—',
      email,
      productName: row.plan || null,
      priceCents: Number(row.price || 0),
      paymentMethod: row.paymentMethod || null,
      trialEndsAt: new Date(endsAtMs).toISOString(),
      daysRemaining,
      bucket,
      lastLoginAt,
      engaged
    });
  }

  // FASE 3 — agregação: 1 linha por pessoa (pode haver trials em produtos diferentes);
  // o trial mais urgente define a janela do lead.
  const byEmail = new Map();
  for (const t of enriched) {
    const existing = byEmail.get(t.email);
    const trialEntry = {
      productName: t.productName,
      trialEndsAt: t.trialEndsAt,
      daysRemaining: t.daysRemaining,
      priceCents: t.priceCents
    };
    if (!existing) {
      byEmail.set(t.email, { ...t, trials: [trialEntry] });
    } else {
      existing.trials.push(trialEntry);
      if (t.daysRemaining < existing.daysRemaining) {
        existing.daysRemaining = t.daysRemaining;
        existing.trialEndsAt = t.trialEndsAt;
        existing.bucket = t.bucket;
      }
    }
  }

  // FASE 4 — sort + cap: mais urgente primeiro; no mesmo dia, frio antes do engajado
  // (o frio evapora se ninguém falar; o engajado converte quase sozinho).
  const results = Array.from(byEmail.values()).sort((a, b) => {
    if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining;
    return (a.engaged === true ? 1 : 0) - (b.engaged === true ? 1 : 0);
  });

  return {
    windows: { buckets: windowsDays, engagementDays },
    totalActiveTrials: trialRows.length,
    bucket3dCount: results.filter((r) => r.bucket === '3d').length,
    bucket7dCount: results.filter((r) => r.bucket === '7d').length,
    bucket14dCount: results.filter((r) => r.bucket === '14d').length,
    lowEngagement3dCount: results.filter((r) => r.bucket === '3d' && r.engaged !== true).length,
    resultCount: results.length,
    results: results.slice(0, topN)
  };
};
```

**Notas:**

- Ajustar somente as janelas, o limiar de engajamento, fallbacks de campo ou o cap. A estrutura (buckets + flag de engajamento) é intencional.
- `expiresTrialAt` é o timestamp canônico de fim de trial; o fallback só entra quando a linha não o traz.
- Os campos de trial (`expiresTrialAt`, `freeTrialPeriodInDays`, `activationDate`, `price`, `plan`) vêm do SDK gerado, não do doc de domínio — confirme o shape via `load_execute_methods` e ajuste os fallbacks se a linha real divergir.
- Calcular o fim a partir de `activationDate`, não de `createdAt` — divergem em upgrades; a ativação é a âncora canônica.
- Chamar toda capability da Clickmax via `codemode.*`.

## Relatório

- Abrir com a premissa entre aspas: *"Assinantes em `active_trial` (assinatura ativa, nenhuma cobrança paga ainda) com trial terminando em até 14 dias — segmentados por urgência (3/7/14 dias) e cruzados com login na área de membros. Valores em centavos exibidos em R$."*
- Renderizar por bucket, do mais urgente pro menos, cap 50 no total com "+N more":
  - 🔴 **Acabam em ≤3 dias** — dentro do bucket, quem não loga vem primeiro (evapora sem contato); destacar `lowEngagement3dCount`.
  - 🟡 **Acabam em 4–7 dias** — janela de incentivo (ex.: 1ª mensalidade com desconto).
  - 🟢 **Acabam em 8–14 dias** — janela de prova de valor (cases, conteúdo).
- Por linha: nome | e-mail | produto | `trialEndsAt` | `daysRemaining` | logou? | valor R$.
- Tom de referência (números são exemplo de saída, nunca fixos): *"89 pessoas testando agora; 14 acabam em 3 dias e 6 delas quase não logaram — essas evaporam se ninguém falar hoje."*
- `totalActiveTrials` aparece uma vez como contexto, não como manchete.
- Follow-ups só como opt-in via `question`: mensagem urgente para o bucket de 3d, bônus para o de 7d, cases para o de 14d (`flows_list` / `flows_create`), reenviar o link de acesso do portal pra quem nunca logou (`member_users_send_access_link`), mudar janelas ou incluir `active_trial_expired`. Nunca executar mutação sem confirmação explícita.

## Avisos

- `['active_trial']` é o único status. Somar `'active_paid'` mistura quem já converteu; somar `'active_trial_expired'` mistura trials já encerrados sem conversão — coorte de outro playbook (subscription-renewal-failed / reativação).
- Não adicionar nenhum `transactionStatus`: `paid` esvazia o resultado (active_trial exclui pagos por definição); `refused` / `failed` desvia para a coorte de cobrança fracassada.
- `freeTrialPeriodInDays` está em dias — não tratar como horas/segundos.
- Trial expirado (`daysRemaining <= 0`) sai da coorte — o usuário disse "chegando ao fim", não "já acabou".
- `freeTrialPeriodInDays = 0` não é trial — colapsa para `daysRemaining <= 0` e o filtro exclui sozinho; não criar caso especial.
- Trial do SaaS Clickmax ≠ trial do cliente final. E na área de membros, acesso com `expiresAt = null` é vitalício, não trial — o sinal canônico deste job é a assinatura.
- Trial sem cadastro de membro tem engajamento desconhecido — fica na coorte com `engaged: null`. Excluir aqui descartaria exatamente quem nunca entrou.
- `price` em centavos — converter para R$ só na exibição.
- Read-only: nada de envio de mensagem, bônus, tag ou mutação de segmento sem follow-up explícito.

## Antipadrões

- Usar `plans_*` porque o usuário falou "trial" — esse é o trial do plano SaaS do workspace, não o dos clientes dele.
- Adicionar `transactionStatus: ['refused', 'failed']` achando que "trial = sem cobrança" — isso devolve trials cuja primeira cobrança falhou, que é o playbook subscription-renewal-failed.
- Adicionar `transactionStatus: ['paid']` para "conferir" — esvazia o resultado por definição do enum.
- Calcular o fim do trial a partir de `createdAt` em vez de `activationDate` — divergem em upgrades.
- Incluir `active_trial_expired` porque "chegando ao fim" soou como "no fim" — esses trials já acabaram sem converter; coorte diferente.
- Excluir da coorte o trial sem cadastro de membro (como faz o dormant-subscribers-no-member-access) — aqui o sem-membro é justamente o lead mais frio, o primeiro da fila.
- Loopar `member_users_get_progress_by_lead` ou `leads_payments` por linha para medir engajamento ou "confirmar que não pagou" — `lastLoginAt` da lista e o status `active_trial` já respondem.
- Filtrar por `transactionPeriod` genérico — a janela é intrínseca a cada trial, não um período de calendário.
- Devolver os 3 buckets como um número só — a segmentação por janela É o produto; cada bucket tem ação própria.
- Pedir `workspaceId` / `ownerId`; confirmar no máximo as janelas, e somente se o pedido for ambíguo.
