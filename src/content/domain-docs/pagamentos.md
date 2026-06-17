## pagamentos/compradores.ts — Comprador de Espaço de Trabalho (Faturamento Clickmax SaaS)

**Objetivo** = inspecionar e gerenciar os instrumentos de pagamento e o histórico de compras vinculados ao registro do comprador no espaço de trabalho da plataforma Clickmax SaaS.

**Escopo** = local do espaço de trabalho | o "comprador" aqui é o próprio espaço de trabalho em sua função de cliente da plataforma Clickmax

**Desambiguação terminológica:**
- comprador (este módulo) = o espaço de trabalho que atua como cliente do Clickmax; os cartões listados aqui pagam pela assinatura SaaS do Clickmax e pelos complementos do espaço de trabalho.
- `sale.buyer` (módulo de transações) = cliente final do vendedor do espaço de trabalho; rastreado em vendas/transações para os produtos do espaço de trabalho.
- Os dois não compartilham gravações nem instrumentos.

**Entidade (cartão):**

| campo | significado |
|---|---|
| `id` | UUID do cartão |
| `holderName` | Nome de exibição do titular do cartão |
| `brand` | Bandeira do cartão (Visa, Mastercard, …) |
| `last4` | Últimos quatro dígitos — PAN mascarado |
| `expiration` | Mês/ano de validade |
| `isDefault` | Se este cartão é o padrão para novas cobranças na plataforma |

**Entidade (compras):**

| campo | significado |
|---|---|
| `plans` | Compras ativas de planos SaaS realizadas por este comprador |
| `addons` | Compras de complementos ativos mantidas por este comprador |

**Regras:**
- Exatamente uma carta está presente com `isDefault=true` a qualquer momento; definir um novo valor padrão inverte o valor anterior.
- A exclusão de um cartão é permanente; se ele era o cartão padrão e existem outros cartões, a plataforma escolhe um cartão padrão substituto.
- A criação de cartões requer dados brutos do cartão e tokenização compatível com PCI — processos realizados pela interface de checkout e não expostos como uma ferramenta MCP.

**Uso seguro:**
- Liste os cartões antes de alterar o padrão para confirmar qual `cardId` promover.
- Inspecione as compras com `buyers_purchases_list` para saber quais compromissos ativos de SaaS dependem do cartão padrão antes de excluí-lo.
- Para gerenciar assinaturas de clientes (a receita recorrente do vendedor), use o módulo de assinaturas — este módulo controla apenas a cobrança da plataforma do próprio espaço de trabalho.

## pagamentos/painel.ts — Painel de Pagamentos

**Finalidade** = KPIs de pagamento agregados e listas paginadas de vendas/assinaturas para o espaço de trabalho, com formato de filtro compartilhado.

**Escopo** = local do espaço de trabalho

**Visualizações:**

| visualizar | forma |
|---|---|
| KPIs de alto nível | totais + saldo do espaço de trabalho + saldo da conta, definidos por filtros |
| lista de transações paginadas | Linhas por transação com informações sobre a oferta |
| lista de assinaturas paginada | Linhas por assinatura com informações sobre a oferta |
| lista de vendas de afiliados paginada | linhas por transação atribuídas a afiliados |
| pesquisas de filtro | Valores que preenchem as listas suspensas de cliente/projeto/produto/status |
| minhas-vendas (POST) | Consulta my-sales mais completa com corpo de filtro integral |
| vendas externas / gráfico externo | Vendas capturadas por meio de gateways externos + suas séries de gráficos |

**Formato do filtro:**
- `range` ∈ `today` \| `yesterday` \| `oneWeek` \| `twoWeeks` \| `month` \| `all` para listas paginadas; `range` ∈ enumeração com intervalos de tempo para KPIs.
- `status` filtra por status da transação.
- `projectId`, `productId`, `client` (estado de assinatura) escopo restrito.
- As listas aceitam `page`, `perPage`, `column`, `order` para navegação baseada em cursor/página.
- `my-sales` utiliza um corpo de requisição POST com o conjunto completo de filtros; prefira esta opção quando os filtros forem complexos ou incluírem arrays.

**Uso seguro:**
- Comece visualizando `dashboard_get` para os números principais e o saldo, depois explore a visualização em lista se precisar de uma análise mais detalhada.
- Utilize `dashboard_filters` uma vez por sessão para descobrir os valores de filtro disponíveis em vez de tentar adivinhar.
- `dashboard_transactions_list` e o módulo de transações `transactions_list` se sobrepõem; prefira a variante do painel quando precisar de paginação/filtros e a variante de transações para uma janela recente limitada sem filtragem.
- As ferramentas de vendas externas exibem campos específicos de cada plataforma; comparações entre diferentes plataformas podem ser enganosas.
- A plataforma também expõe endpoints de exportação CSV para download humano; estes não estão intencionalmente presentes na interface do agente.

## pagamentos/planos.ts — Planos Clickmax (assinatura SaaS)

**Objetivo** = inspecionar e modificar a assinatura do próprio espaço de trabalho na plataforma Clickmax (o plano SaaS), distinta das assinaturas dos clientes finais.

**Escopo** = local do espaço de trabalho para ferramentas de autoatendimento; ferramentas administrativas entre espaços de trabalho exigem escopo de administrador da plataforma.

**Desambiguação terminológica:**
- plano aqui = o plano de assinatura Clickmax SaaS que um espaço de trabalho paga (Gratuito, Inicial, Pro, …)
- Assinatura no módulo de assinaturas = pagamentos recorrentes do cliente final capturados pelo vendedor do espaço de trabalho.
- Os dois são sistemas de faturamento separados; não os confunda.

**Visualizações:**

| visualizar | significado |
|---|---|
| lista de atualizações | planos disponíveis para migrar do plano atual |
| resumo da assinatura do usuário | Plano atual + métricas de uso em uma única resposta |
| métricas do usuário | Apenas métricas de utilização (vendas, leads, mensagens, etc.) |
| resumo da fatura | Fatura atual + taxas projetadas |
| histórico de transações | transações de faturamento anteriores da plataforma Clickmax |
| lista de solicitações de cancelamento/pausa | As alterações pendentes de cancelamento/pausa ainda não entraram em vigor |
| cancelar pré-visualização | Impacto em dólares + vencimento programado se o cancelamento ocorrer agora |

**Mutações:**
- `plans_cancel_subscription` cancela a assinatura Clickmax do espaço de trabalho atual; retorna `scheduledExpirationDate`. Use `plans_cancel_preview` primeiro para ver o impacto.
- `plans_admin_cancel_by_workspaces` cancela as assinaturas de vários espaços de trabalho (escopo de administrador da plataforma).
- `plans_admin_cancel_by_id` cancela um registro de plano específico por ID (escopo de administrador da plataforma).
- A plataforma também expõe um endpoint de pausa, intencionalmente não apresentado aqui porque o formato da resposta do backend é indefinido.

**Uso seguro:**
- Ligue sempre `plans_cancel_preview` antes de `plans_cancel_subscription` para que o usuário entenda o impacto proporcional.
- As ferramentas de cancelamento administrativo se propagam por toda a atividade do vendedor no espaço de trabalho — confirme `workspaceIds`/`planId` cuidadosamente.
- As métricas de utilização refletem os totais do período de faturamento atual, e não números cumulativos históricos.
- Para gerenciar as assinaturas de produtos do vendedor (faturamento do cliente final), use o módulo de assinaturas.

## pagamentos/relatórios.ts — Relatórios de Pagamentos

**Objetivo** = gerar relatórios filtráveis de registros de assinaturas e transações em um intervalo de datas e/ou para IDs de registro específicos.

**Escopo** = local do espaço de trabalho

**Relatórios:**

| relatório | forma | filtros |
|---|---|---|
| assinaturas | Linhas por assinatura com campos de ciclo de vida e faturamento | `ids[]` (IDs de assinatura), `startDate`, `endDate` |
| transações | Linhas por transação com campos de estado de venda + pagamento | `ids[]` (IDs de transação), `startDate`, `endDate` |

**Regras de filtro:**
- `startDate` e `endDate` são sequências de datas inclusivas (data ISO 8601 ou data e hora).
- `ids[]` restringe o relatório a registros específicos; sem `ids`, o relatório retorna todo o intervalo de datas.
- Omitir ambos `ids` e os parâmetros de data retorna a janela padrão do espaço de trabalho (que pode ser grande — prefira reduzi-la).

**Uso seguro:**
- Sempre passe uma janela `startDate`/`endDate` para melhorar o desempenho em espaços de trabalho grandes.
- Utilize `transactions_chart` do módulo de transações para séries temporais agregadas; os relatórios retornam dados por linha e crescem linearmente com o volume.
- Os endpoints de exportação para CSV na API HTTP para download por humanos estão intencionalmente excluídos aqui (fluxo binário, sem valor de agente).

## pagamentos/assinatura.ts — Assinaturas

**Objetivo** = inspecionar, modificar o instrumento de pagamento e cancelar assinaturas recorrentes; consultar grupos de assinaturas e gerar gráficos de séries.

**Escopo** = local do espaço de trabalho

**Entidade:**

| campo | significado |
|---|---|
| `id` | UUID da assinatura |
| `status` | `active`, `canceled`, `pending`, `past_due`, etc. |
| `gatewayBuyerId` | Referência do comprador do processador subjacente |
| `gatewayRecurrenceId` | Referência de recorrência do processador subjacente |
| `cardId` | Cartão de pagamento vinculado à assinatura |
| `reason` | Motivo do cancelamento em texto livre (definido quando cancelada ou pendente) |
| `cancellationReason` | Enumeração de cancelamento classificada (`fraud`, `requested_by_customer`, …) |

**Mutações:**
- `subscriptions_update_card` troca a cobrança da assinatura para `cardId`; idempotente pelo mesmo `cardId`.
- `subscriptions_cancel` cancela uma assinatura; permanente no processador, motivo opcional classificado + descrição em texto livre.
- `subscriptions_mass_manage` executa `cancel` ou `renew` abrangendo assinaturas vinculadas a um `productId`, opcionalmente restringido por `leadIds`; cascata destrutiva em todo o espaço de trabalho.

**Consultas:**
- `subscriptions_list` é baseado em POST com um corpo de filtro completo (status, intervalo, projeto/produto/cliente, paginação, classificação).
- `subscriptions_chart` retorna totais agrupados por tempo usando o mesmo formato de filtro (sem paginação).
- Para obter linhas por assinatura em um intervalo de datas, prefira `reports_subscriptions` do módulo de relatórios.

**Uso seguro:**
- Sempre `subscriptions_get` confirme o `cardId` atual antes de cancelar `status`.
- `operation=cancel` no gerenciamento em massa é a abordagem mais destrutiva; exija confirmação de `productIds` e use `leadIds` para restringir o escopo sempre que possível.
- A troca do cartão `subscriptions_update_card` mantém a assinatura ativa no novo aparelho e pode ser revertida com outra troca de cartão.
- O módulo do painel também expõe uma lista paginada de assinaturas (`dashboard_subscriptions_list`); use-a para navegar dentro do filtro do painel e `subscriptions_list` quando precisar do corpo do filtro de assinaturas mais completo.

## pagamentos/transações.ts — Transações e Vendas

**Finalidade** = inspecionar, reembolsar e mapear a atividade de pagamento (transações individuais, registros de vendas e séries temporais agregadas).

**Escopo** = local do espaço de trabalho

**Terminologia:**
- Transação = um único registro do estado de um pagamento (cobrança, reembolso, estorno, etc.) — o que o processador de pagamentos vê.
- venda = um registro comercial de nível superior que pode agregar uma ou mais transações para a mesma compra.
- Venda externa = venda registrada por meio de um gateway/integração externa; alguns campos são específicos do gateway.
- dívida = taxas de plataforma pendentes devidas pelo espaço de trabalho.

**Destaques da entidade:**

| conceito | significado |
|---|---|
| `transação.id` | UUID que identifica um registro de estado de pagamento |
| `venda.id` | UUID que identifica um registro de venda comercial |
| motivo do cancelamento | Classificação de reembolso (`fraud`, `duplicated`, `requested_by_customer`, …) |
| `status` | Ciclo de vida da transação (`authorized`, `paid`, `refunded`, `chargeback`) |
| `utms` | Fonte/meio/campanha associada à venda original |
| dívida | Taxas de plataforma pendentes agregadas em todo o espaço de trabalho |

**Regras de reembolso:**
- Reembolso único = `transactions_refund` referente a um ID de transação, com motivo opcional.
- Reembolso em massa = `transactions_mass_refund` delimitado por `productIds` (opcionalmente restringido por `leadIds`); destrutivo e em cascata para cancelamentos de assinatura.
- O reembolso bem-sucedido é permanente e aciona a reversão do pagamento no processador.

**Endpoint do gráfico:**
- `transactions_chart` recebe `defaults` (intervalo de tempo) e `filters` (formato do filtro de vendas do painel) e retorna os totais agrupados por período.
- Prefira usar o módulo de painel de controle para KPIs de alto nível; utilize-o apenas quando forem necessárias análises mais detalhadas.

**Uso seguro:**
- Sempre inspecione uma transação/venda com `transactions_get` antes de `sales_get_details` de iniciar um reembolso.
- Reembolsos em massa são válidos para todo o espaço de trabalho especificado em `productIds` — confirme o escopo antes de ligar; combinar com `leadIds` restringe a busca a leads específicos.
- A divisão entre comprador e UTMs (`sales_get_buyer`, `sales_get_utms`) existe porque os registros subjacentes residem em armazenamentos diferentes; os agentes geralmente desejam os três juntos (`sales_get_details` primeiro, e depois detalhar o comprador/UTMs somente se necessário).
- `transactions_debt` reflete as taxas de plataforma acumuladas atualmente, não os totais históricos.
