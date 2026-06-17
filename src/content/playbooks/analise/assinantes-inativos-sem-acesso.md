## Quando isso se aplica

O usuário quer os **assinantes ativos (cliente final) que continuam pagando mas não entram na área de membros** há N dias (default 14; crítico acima de 30). É o alerta antecipado de churn: a cobrança ainda passa, o engajamento é que morreu — receita recorrente (MRR) em risco. A saída é uma lista de pessoas dividida por gravidade, não um total agregado.

Desambiguação dos vizinhos:

- **trial-ending-not-yet-converted** — a pessoa ainda não pagou nada (trial). Aqui ela já paga.
- **lapsed-subscriber-bought-one-time** — a assinatura já foi cancelada. Aqui ela ainda está ativa — este playbook é o aviso ANTES do cancelamento.
- **subscription-renewal-failed** — a cobrança recorrente falhou. Aqui a cobrança vai bem; o conteúdo está sendo ignorado.

## Principais pressupostos

- "Assinantes" = assinaturas de cliente final → `subscriptions_list`. Nunca `plans_*` (esse é o plano SaaS do próprio workspace na Clickmax). No schema são dois sistemas distintos (`payments.Subscriptions` vs `payments.CxSubscriptions`).
- Status ativos: o doc de domínio lista `active`, `canceled`, `pending`, `past_due` (lista aberta) como valores de `status`; workspaces com trial granular podem expor `active_paid` / `active_trial` / `active_trial_expired`. O shape exato do body (`GetSubscriptionsBody`) vem do SDK gerado — confirme via `load_execute_methods(['subscriptions_list'])` antes de rodar. Nunca incluir `'canceled'`.
- O sinal é `lastLoginAt` de `member_users_list` — não progresso de curso nem recência de transação. No schema, `members.MemberUsers.lastLoginAt` é o único registro de acesso (não existe tabela de sessões).
- Junte-se por e-mail minúsculo. Linhas de assinatura expõem `subscriber.email`, não `leadId` — não tente cruzar por identidade de lead da lista.
- Limiares: dormente = sem login há mais de 14 dias; **crítico = mais de 30 dias**; alerta = 15–30 dias. `lastLoginAt = null` é sub-coorte própria ("nunca acessou") — no mínimo tão crítica quanto 30d+.
- `price` vem em centavos. MRR em risco é somado em centavos e exibido em R$ (dividir por 100) só na resposta.
- Read-only. Nenhum cancelamento, envio de link, tag ou mutação de lista de forma automática.

## Processo de pensamento

1. **Travar os limiares.** Default 14 dias (dormente) e 30 dias (crítico). Usar `question` só se o pedido for ambíguo sobre quantos dias.
2. **Caminho padrão = duas listas + join por e-mail.** Puxar assinaturas ativas e membros matriculados (ordenados por `lastAccess` asc — NULLS LAST deixa quem nunca logou no fim, não some).
3. **Classificar cada assinante:** crítico (>30d), alerta (15–30d), nunca acessou (`null`), engajado (descartar). Assinante sem cadastro de membro = produto não-members, fora da coorte (anotar no contexto, não na lista).
4. **Quantificar o risco.** Somar o `price` das assinaturas da coorte = MRR em risco. É o número que dá urgência à resposta.
5. **Formato do resultado:** três sub-coortes capadas em 50, críticos primeiro. Follow-up (CS humano, fluxo de re-engajamento) só como opt-in via `question`.

## Guia de execução

Use `execute` porque o job exige duas leituras, join por e-mail, conta de dias e classificação em três faixas.

**Entradas padrão:**

- `dormancyDays = 14`
- `criticalDays = 30`
- `maxRows = 2000`
- `topN = 50`

**Formato de saída esperado:**

- `thresholds`
- `totalActiveSubscribers`
- `totalEnrolledMembers`
- `criticalCount`
- `warningCount`
- `neverAccessedCount`
- `mrrAtRiskCents`
- `critical`
- `warning`
- `neverAccessed`

**Código de exemplo:**

```js
async () => {
  const dormancyDays = 14;
  const criticalDays = 30;
  const topN = 50;
  const DAY_MS = 24 * 60 * 60 * 1000;

  const today = new Date();
  const todayMs = today.getTime();

  // FASE 1 — pull: assinaturas ativas de cliente final.
  // Shape do body vem do SDK (GetSubscriptionsBody) — confirme via load_execute_methods.
  // Se o enum expor o trio granular (active_paid/active_trial/active_trial_expired), use-o.
  const subs = await codemode.subscriptions_list({
    status: ['active'],
    perPage: 2000,
    page: 1
  });
  const subRows = subs?.data || [];

  // FASE 1b — pull: membros matriculados, do login mais antigo pro mais novo.
  // NULLS LAST: quem nunca logou aparece no fim — não parar a paginação cedo.
  const members = await codemode.member_users_list({
    active: true,
    orderBy: 'lastAccess',
    orderByMode: 'asc',
    perPage: 2000,
    page: 1
  });
  const memberRows = members?.data || [];

  // FASE 2 — cruzamento: indexar membros por e-mail minúsculo.
  // Linhas de assinatura não trazem leadId — o join é sempre por e-mail.
  const memberByEmail = new Map();
  for (const m of memberRows) {
    const email = (m.email || '').toLowerCase();
    if (!email) continue;
    memberByEmail.set(email, m);
  }

  // FASE 3 — agregação: classificar cada assinante por recência de login
  // e acumular o MRR em risco (centavos).
  const critical = [];
  const warning = [];
  const neverAccessed = [];
  let mrrAtRiskCents = 0;

  for (const s of subRows) {
    const email = (s.subscriber?.email || '').toLowerCase();
    if (!email) continue;

    const member = memberByEmail.get(email);
    // Assinante sem cadastro de membro = produto não-members → fora da coorte.
    if (!member) continue;

    const row = {
      contactName: s.subscriber?.name || member.name || '—',
      contactEmail: s.subscriber?.email || member.email,
      subscriptionId: s.id || null,
      subscriptionPlan: s.plan || null,
      subscriptionStatus: s.status || null,
      subscriptionStartedAt: s.activationDate || null,
      monthlyValueCents: Number(s.price || 0),
      lastAccessAt: member.lastLoginAt || null,
      daysSinceLastAccess: null
    };

    if (!member.lastLoginAt) {
      // Nunca logou: sub-coorte própria, no mínimo tão crítica quanto 30d+.
      neverAccessed.push(row);
      mrrAtRiskCents += row.monthlyValueCents;
      continue;
    }

    const days = Math.floor((todayMs - new Date(member.lastLoginAt).getTime()) / DAY_MS);
    if (days <= dormancyDays) continue; // engajado — fora da coorte

    row.daysSinceLastAccess = days;
    mrrAtRiskCents += row.monthlyValueCents;
    if (days > criticalDays) critical.push(row);
    else warning.push(row);
  }

  // FASE 4 — sort + cap: mais dias parado primeiro;
  // nunca-acessou ordenado pela assinatura mais antiga (paga há mais tempo sem usar).
  critical.sort((a, b) => (b.daysSinceLastAccess || 0) - (a.daysSinceLastAccess || 0));
  warning.sort((a, b) => (b.daysSinceLastAccess || 0) - (a.daysSinceLastAccess || 0));
  neverAccessed.sort((a, b) => {
    const aTs = a.subscriptionStartedAt ? new Date(a.subscriptionStartedAt).getTime() : 0;
    const bTs = b.subscriptionStartedAt ? new Date(b.subscriptionStartedAt).getTime() : 0;
    return aTs - bTs;
  });

  return {
    thresholds: { dormancyDays, criticalDays, asOf: today.toISOString() },
    totalActiveSubscribers: subRows.length,
    totalEnrolledMembers: memberRows.length,
    criticalCount: critical.length,
    warningCount: warning.length,
    neverAccessedCount: neverAccessed.length,
    mrrAtRiskCents,
    critical: critical.slice(0, topN),
    warning: warning.slice(0, topN),
    neverAccessed: neverAccessed.slice(0, topN)
  };
};
```

**Notas:**

- Ajustar somente o trio de status, os limiares, a paginação ou o cap. A estrutura (3 sub-coortes + MRR) é intencional.
- `member_users_get_by_lead` existe para drill-down individual — nunca em loop pela coorte; a lista já devolve `lastLoginAt` por linha.
- `lead_activities_system_list` é o stream bruto e paginado de eventos de sistema (bom pra coortes "fez o evento X"), mas pra recência de login o sinal canônico continua sendo `lastLoginAt` de `member_users_list` — uma chamada, sem varrer o stream.
- Os shapes de `GetSubscriptionsBody` e `ListMemberUsersQueryParams` (inclusive `orderBy: 'lastAccess'`) vêm do SDK gerado e não estão documentados campo a campo — confirme via `load_execute_methods` e ajuste os nomes se a validação reclamar.
- Chamar toda capability da Clickmax via `codemode.*`.

## Relatório

- Abrir com a premissa entre aspas: "Assinantes com assinatura ativa (status ativos do enum do workspace — nunca `canceled`) sem login na área de membros há mais de 14 dias. Críticos = mais de 30 dias sem entrar. Assinantes sem cadastro de membro foram excluídos (produto não-members)."
- Três seções, todas em formato de pessoas, cada uma capada em 50 com "+N more" quando passar:
  - 🔴 **Críticos (>30d)** — ordenados por `daysSinceLastAccess` desc. Vêm primeiro: são quem cancela no próximo ciclo.
  - 🟡 **Em alerta (15–30d)** — mesma ordenação. Ainda recuperáveis com fluxo.
  - ⚪ **Nunca acessaram (`lastLoginAt = null`)** — ordenados pela assinatura mais antiga.
- Destacar o MRR em risco em R$ (`mrrAtRiskCents / 100`) como o número de urgência. Tom de referência (números são exemplo de saída, nunca fixos): "34 assinantes não entram há 14+ dias — R$ 10.098/mês na fila pra cancelar; 8 estão críticos (30d+)."
- `totalActiveSubscribers` / `totalEnrolledMembers` entram uma vez como contexto, não como manchete.
- Follow-ups só como opt-in via `question`: tarefa de CS humano para os críticos (e-mail não vira quem está 30d+ fora), fluxo de re-engajamento para os em alerta (`flows_list` / `flows_create`), reenviar o link de acesso do portal pros que nunca acessaram (`member_users_send_access_link` / `member_users_bulk_send_access_link`), ou mudar o limiar. Nunca execute mutação sem confirmação explícita.

## Avisos

- O enum de status vem do SDK: o doc de domínio lista `active`/`canceled`/`pending`/`past_due` (lista aberta), e alguns workspaces expõem o trio granular `active_paid`/`active_trial`/`active_trial_expired`. Confirme via `load_execute_methods` antes de rodar — e nunca inclua `'canceled'`.
- `member_users_list` com `orderBy: 'lastAccess'` ordena com NULLS LAST — quem nunca acessou aparece no final da paginação asc; não concluir que "não existe" antes de varrer tudo.
- `lead_activities_system_list` devolve o stream bruto e paginado de eventos por lead — daria pra inferir acesso via eventos `members_area_accessed`, mas é caro e indireto; `lastLoginAt` de `member_users_list` responde em uma chamada.
- Assinante sem cadastro de membro não é "dormente" — é assinatura de produto fora da área de membros. Sai da coorte silenciosamente.
- `price` em centavos: somar em centavos e converter para R$ só na resposta — senão o MRR em risco sai 100× errado.
- "Assinante" tem dois mundos no schema (produto do produtor vs SaaS Clickmax) — este playbook é sempre o lado do cliente final (`subscriptions_*`).
- Read-only: nada de `subscriptions_cancel`, envio de link de acesso (`member_users_send_access_link`), tag ou mutação de segmento sem follow-up explícito.

## Antipadrões

- Usar `plans_*` porque o usuário disse "assinantes" — isso é o plano SaaS do próprio workspace, não os clientes dele.
- Chutar o enum de status sem confirmar (`load_execute_methods`) — valor fora do enum falha na validação do esquema.
- Medir recência por `member_users_get_progress_by_lead` — progresso é conclusão por curso, não login.
- Loopar `member_users_get_by_lead` por assinante para calcular recência — `member_users_list({ orderBy: 'lastAccess' })` já traz `lastLoginAt` em uma chamada.
- Tentar o join por `leadId` a partir da lista de assinaturas — a linha só expõe `subscriber.{name,email}`; o join é por e-mail minúsculo.
- Tratar `lastLoginAt = null` como "sem dado" e descartar — é a sub-coorte nunca acessou, separada de propósito.
- Incluir `'canceled'` porque o usuário falou "assinantes" — cancelado já é churn consumado; este playbook é prevenção.
- Misturar os 8 críticos com os 26 em alerta numa lista única — a ação é diferente por faixa (CS humano vs fluxo); a classificação é o produto.
- Retornar contagem quando pediram "quais assinantes" — a saída é gente, capada, com totais como contexto.
- Pedir `workspaceId` / `ownerId` ou defaults de paginação ao usuário. Confirmar no máximo o limiar de dias, e só se ambíguo.
