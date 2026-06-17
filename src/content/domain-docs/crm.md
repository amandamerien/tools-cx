## crm/analytics.ts — Análise de CRM

**Objetivo** = análise de dados em formato de painel de controle para funis de vendas, produtos, páginas, fluxos, leads e mensagens.

**Escopo** = camada de métricas de visão geral somente leitura | principalmente com escopo de espaço de trabalho, com filtros opcionais de projeto/funil/página/data

**Regras:**
- Todas as ferramentas de análise são somente leitura.
- Os campos de comparação e conversão podem ser razões numéricas em vez de porcentagens formatadas.
- As métricas de comparação geralmente dependem dos parâmetros de consulta do período atual e do período anterior.
- As análises em painéis são orientadas para uma visão geral e são mais adequadas para identificar onde é necessária uma investigação mais aprofundada ao nível do registo.

**Dicas para o consumidor:**
- Compare os períodos atual e anterior usando a mesma escala para identificar diferenças significativas.
- Interprete os valores percentuais e de crescimento como proporções numéricas, a menos que estejam explicitamente formatados em outro local.
- Use métricas gerais para identificar onde é necessária uma investigação mais aprofundada antes de agir em relação a leads, tags ou listas.

## crm/lead-activities.ts — Liderar atividades

**Objetivo** = inspecionar a linha do tempo bruta de eventos de atividade gerados por leads (e pelo espaço de trabalho como um todo) — visualizações de checkout, abandonos de carrinho, resultados de pagamento, engajamento na área de membros, aberturas/cliques de e-mail, interações via WhatsApp/Instagram/SMS, alterações de tags/listas, atualizações de campos personalizados, etc.

**Escopo** = local do espaço de trabalho | muitas ferramentas também aceitam `leadId` detalhamento por lead

**Por que este módulo existe?** Os eventos de atividade são a base sobre a qual todo o Clickmax é construído:
- O Funnels4 reage a `Funnels4TriggerType` valores (`checkout_viewed`, `cart_abandoned`, `purchase_approved`, `purchase_declined`, `card_declined`, `pix_generated`, `pix_expired`, `boleto_generated`, `boleto_expired`, `email_opened`, `members_area_accessed`, `lesson_completed`, `tag_added`…) — e esses gatilhos são acionados por eventos de atividade.
- O ciclo de vida do CRM (`LeadStatus`) é derivado do fluxo de atividade cumulativa.
- As ferramentas do módulo Tags `tags_system_*` oferecem uma visão mais restrita: apenas os eventos que foram promovidos a marcadores de tags do sistema. Este módulo apresenta uma visão mais ampla dos eventos brutos — prefira-o quando a pergunta for "leads que realizaram o evento X" / "leads que realizaram X, mas não Y".

**Ferramentas em resumo**

| Ferramenta | Âncora | Devoluções |
|---|---|---|
| `lead_activities_list` | espaço de trabalho | Atividades de leads registrados paginadas (personalizadas + do sistema, todas as categorias) |
| `lead_activities_list_by_lead` | uma liderança | mesma forma, dimensionada para um `leadId` |
| `lead_activities_system_list` | espaço de trabalho | Atividades paginadas do sistema (o fluxo "X aconteceu para levar a Y") |
| `lead_activities_system_by_lead` | uma liderança | mesma forma, com escopo |
| `lead_activities_owner_stats` | espaço de trabalho | Estatísticas agregadas ao nível do proprietário (ativo/engajado no período) |
| `lead_activities_owner_timeseries` | espaço de trabalho | A atividade é contabilizada ao longo de um `dateRange` período `granularity` (dia/semana/…) |
| `lead_activities_owner_count` | espaço de trabalho | Contagem de atividades agrupadas por tipo/categoria de atividade |
| `lead_activities_metrics_by_lead` | uma liderança | Contagem de atividades ao longo do tempo para um lead, opcional `startDate`/`endDate` |
| `lead_activities_opportunity_list` | uma carta | atividades para um cartão de oportunidade `cardId` |

**Formato do corpo do filtro** — `lead_activities_list*` e `lead_activities_system_*` aceitam um corpo de filtro compartilhado (`ListLeadActivitiesFilterSchema`):
- `page` + `perPage` para paginação
- `categories[]` — restringir a um subconjunto (Lead, Tag, Email, WhatsApp, Membros, Pagamentos, …)
- `dateRange { from, to }` — janela delimitada
- Aspectos adicionais dependem do corpo — inspecione o esquema Zod antes de supor nomes de campos.

**Padrões de coorte** — as duas composições de maior alavancagem:
- "Leads que realizaram o evento X na janela W" → `lead_activities_system_list` com `categories` filtro / nome-do-evento para X em W → desduplicar por `leadId`.
- "Leads que fizeram X, mas não Y em W" → duas chamadas de `lead_activities_system_list` sobre a mesma janela (uma para X, uma para Y), depois subtrair do conjunto por `leadId`.
- O formato `categories` e o nome exato do campo do evento são específicos do espaço de trabalho — em caso de dúvida, inspecione primeiro uma página pequena.

**Relação com os módulos vizinhos:**
- `tags_system_activities` (Módulo de Etiquetas) — mais restrito; apenas eventos promovidos a marcadores de etiqueta do sistema.
- CRM `LeadStatus` — estado derivado. `LeadStatus='abandoned_cart'` é o resultado cumulativo dos eventos de atividade. Prefira `dashboard_my_sales` com `contactStatus='abandoned_cart'` para coorte do ciclo de vida; use este módulo quando precisar da granularidade dos eventos brutos.
- Os gatilhos do Funnels4 — o catálogo `Funnels4TriggerType` é um inventário útil dos eventos de atividade que a plataforma emite.

**Uso seguro:**
- Os dados de atividade podem ser volumosos — as páginas são exibidas em janelas pequenas e agregadas antes de responder.
- A análise detalhada por lead (`*_by_lead`) é mais barata do que buscar todos os leads e filtrá-los.
- As contagens/séries temporais ao nível do proprietário são agregadas — use-as para "o nível de engajamento no espaço de trabalho esta semana", não para identificar leads individuais.

**Dicas para o consumidor:**
- As atividades com escopo definido por cartão exigem um `cardId`. A descoberta de cartões está atualmente limitada via MCP; espera-se que o usuário forneça o ID do cartão ou utilize ferramentas ancoradas em leads.
- A exportação de atividades em formato CSV não é exposta intencionalmente (fluxo binário, incompatível com agentes).
- O `mockLeadActivities` auxiliar de desenvolvimento não está exposto.

## crm/leads.ts — Leads de CRM

**Finalidade** = representar o registro de contato central do CRM usado para identidade, atribuição, engajamento, contexto de vendas e automação operacional.

**Escopo** = entidade de contato local do espaço de trabalho

**Identidade central:**

| campo | significado |
|---|---|
| `id` | UUID principal |
| `name` | Nome do contato, se conhecido |
| `email` | E-mail principal |
| `telephone` | Número de telefone principal |
| `document` | Identificador do documento, como o CPF, quando presente |
| `contactCode` | Referência de contato estável usada em todos os fluxos de trabalho do CRM |

**Ciclo de vida + atribuição:**
- `status` = estágio atual do ciclo de vida, como criado, engajado, comprado, renovado ou cancelado
- `origin` / `subOrigin` = classificação da fonte de aquisição
- `temperatureStatus` = classificação de prontidão comercial, como frio, morno, quente ou cliente
- `score` = pontuação agregada de leads usada para qualificação
- `emailStatus` = estado de validação de e-mail

**Relacionamentos:**
- Os leads podem conter etiquetas manuais e de sistema.
- Os leads podem pertencer a listas manuais e segmentos dinâmicos.
- Os leads podem ter preferências de pagamento, faturas, envios, atividades e mensagens.
- Muitos fluxos de trabalho de CRM de nível superior usam o lead como âncora operacional.

**Regras:**
- Leads não são apenas linhas de identidade; eles acumulam contexto de ciclo de vida, atribuição e comercial ao longo do tempo.
- O mesmo lead pode aparecer em várias listas e segmentos simultaneamente.
- Etiquetas, listas e segmentos são mecanismos de agrupamento em torno do lead, não substitutos do próprio registro do lead.
- As visualizações de pagamento/produto e fatura são projeções comerciais centradas no cliente potencial, e não entidades de clientes separadas.

**Dicas para o consumidor:**
- Use a busca por leads para localizar grupos e, em seguida, inspecione os leads individuais para obter detalhes operacionais.
- Use origens, sub-origens e o recurso de autocompletar UTM de pagamento para entender os padrões de aquisição antes de criar filtros.
- Considere o status do ciclo de vida e a temperatura como sinais de negócios que podem mudar ao longo do tempo.

## crm/lists-segments.ts — Listas e segmentos de CRM

**Objetivo** = agrupar leads em coleções reutilizáveis por meio de associação manual a listas ou lógica de segmentação dinâmica.

**Escopo** = local do espaço de trabalho

**Tipos de grupo:**
- Lista manual = lista de membros líderes explícita mantida diretamente pelos operadores
- Segmento = definição dinâmica que sincroniza com uma lista de suporte para execução
- Lista de instantâneos = grupo congelado criado quando a composição exata em um determinado momento precisa ser preservada.

**Conceitos fundamentais:**
- lista = unidade de execução para associação real
- segmento = definição de regra dinâmica que atualiza sua lista sincronizada ao longo do tempo
- `leadCount` = número de membros materializados na lista de apoio
- `engagementRate` = sinal de segmento agregado exposto com metadados de segmento

**Regras:**
- As listas manuais podem ser editadas diretamente, adicionando ou removendo leads.
- Os segmentos devem ser entendidos como grupos dinâmicos cuja composição pode mudar conforme suas regras são atualizadas.
- Os metadados de segmento e os metadados de lista sincronizados permanecem bem alinhados, incluindo atualizações de nome e emoji.

**Dicas para o consumidor:**
- Use listas manuais quando a gestão de membros precisar ser feita diretamente.
- Use segmentos quando a associação a grupos deve seguir regras de negócio reutilizáveis.
- Use snapshots quando for necessário preservar a composição exata dos membros em um determinado momento.
- Trate a contagem de leads de segmentos sincronizados como associação operacional, não como uma garantia histórica permanente.

**Modelo de filtro de segmento:**
- Cada nó de filtro possui: `id`, `order`, `field`, `operator`, `negation`, slot de valor opcional, `parentId` opcional
- Os filtros irmãos de nível superior combinam-se como AND implícito, a menos que estejam agrupados em um nó `childrenAnd` / `childrenOr`.
- nós de grupo usam `field = children`

**Opções do operador de grupo:**
- `childrenAnd` = todas as condições dos filhos devem corresponder
- `childrenOr` = qualquer condição de criança pode corresponder

**Slots de valor:**
- `valueString` = campos semelhantes a texto, como `name`, `email`, `city`, `origin`, `productName`, `utmSource`
- `valueNumber` = campos numéricos como `score`, `averageTicket`, `numberOfPurchases`, `lifeTimeValue`
- `valueDate` = campos de data/hora como `createdAt`, `birthday`, `lastPurchaseDate`, `transactionCreatedAt`
- `valueBool` = campos booleanos como `client`, `lgpdApproved`, `messagePreferencesAuthorized`, `messagePreferencesCanceled`
- `valueUuid` = campos de identificação de entidade, como `tagId`, `listId`, `projectId`, `pageId`, `funnelId`, `offerId`, `productId`

**Campos comuns:**
- identidade/contato = `name`, `email`, `telephone`, `document`, `city`, `state`, `address`, `profession`
- ciclo de vida = `status`, `temperatureStatus`, `client`, `score`, `createdAt`, `emailStatus`
- atribuição = `origin`, `subOrigin`, `originOrSubOrigin`, `utmSource`, `utmMedium`, `utmCampaign`, `utmTerm`, `utmContent`
- IDs de agrupamento = `tagId`, `listId`, `projectId`, `pageId`, `funnelId`
- comércio = `productId`, `offerId`, `productName`, `transactionStatus`, `transactionType`, `subscriptionStatus`, `subscriptionPlan`, `transactionRecurrence`
- métricas de valor = `averageTicket`, `lastPurchaseValue`, `lifeTimeValue`, `numberOfPurchases`

**Operadores comuns:**
- texto = `equals`, `contains`, `startsWith`, `endsWith`
- numérico/data = `equals`, `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual`
- booleanos = geralmente `equals`
- lógica de grupo = `childrenAnd`, `childrenOr`
- Qualquer filtro pode ser invertido com `negation = true`

**Valores de exemplo de enumeração:**
- `status` = `created`, `engaged`, `purchased`, `renewed`, `churned`
- `temperatureStatus` = `cold`, `warm`, `hot`, `customer`
- `transactionStatus` = `paid`, `pending`, `failed`, `canceled`
- `transactionType` = `pix`, `boleto`, `credit`, `free`
- `subscriptionStatus` = `active`, `canceled`
- `offerCurrency` = `BRL`, `USD`, `EUR`

**Exemplo: consulta AND simples**

```json
{
  "filters": [
    { "id": "11111111-1111-4111-8111-111111111111", "order": 0, "field": "email", "operator": "contains", "negation": false, "valueString": "@gmail.com" },
    { "id": "22222222-2222-4222-8222-222222222222", "order": 1, "field": "status", "operator": "equals", "negation": false, "valueString": "purchased" }
  ]
}
```

significado = leads cujo e-mail contém `@gmail.com` E cujo status do ciclo de vida é `purchased`

**Exemplo: agrupado OU dentro de E externo**

```json
{
  "filters": [
    { "id": "33333333-3333-4333-8333-333333333333", "order": 0, "field": "children", "operator": "childrenOr", "negation": false },
    { "id": "44444444-4444-4444-8444-444444444444", "order": 0, "field": "temperatureStatus", "operator": "equals", "negation": false, "valueString": "hot", "parentId": "33333333-3333-4333-8333-333333333333" },
    { "id": "55555555-5555-4555-8555-555555555555", "order": 1, "field": "temperatureStatus", "operator": "equals", "negation": false, "valueString": "customer", "parentId": "33333333-3333-4333-8333-333333333333" },
    { "id": "66666666-6666-4666-8666-666666666666", "order": 1, "field": "numberOfPurchases", "operator": "greaterThanOrEqual", "negation": false, "valueNumber": 2 }
  ]
}
```

significado = leads que são (`hot` OU `customer`) E têm pelo menos 2 compras

**Exemplo: exclusão por negação**

```json
{
  "filters": [
    { "id": "77777777-7777-4777-8777-777777777777", "order": 0, "field": "origin", "operator": "equals", "negation": true, "valueString": "Mailchimp" }
  ]
}
```

significado = leads cuja origem NÃO é `Mailchimp`

## crm/pipelines.ts — Pipelines de CRM

**Objetivo** = gerenciar os funis de vendas, seus estágios e as oportunidades (negócios) que percorrem esses funis.

**Escopo** = local do espaço de trabalho

**Vocabulário:**
- pipeline = um quadro que agrupa etapas ordenadas
- estágio = uma coluna dentro de um pipeline | os cartões ficam em exatamente um estágio
- Cartão = uma oportunidade/negócio | sempre pertence a um funil de vendas + uma etapa e faz referência a pelo menos um lead

**Campos de pipeline:**

| campo | significado |
|---|---|
| `id` | UUID do Pipeline |
| `name` | Nome de exibição |
| `description` | Notas opcionais |
| `color` | Cor hexadecimal opcional (`#RRGGBB`, ≤7 caracteres) |
| `archivedAt` | Definido quando o pipeline é arquivado (quadro oculto) |
| `stages` | Etapas ordenadas pertencentes ao oleoduto |

**Campos de palco:**

| campo | significado |
|---|---|
| `id` | UUID da etapa |
| `name` | Nome de exibição |
| `displayOrder` | Posição do estágio dentro da tubulação (ascendente) |
| `color` | Cor hexadecimal opcional |
| `type` | `not_started` \| `in_progress` \| `won` \| `lost` |

**Campos do cartão:**

| campo | significado |
|---|---|
| `id` | UUID do cartão |
| `pipelineId` | Pipeline proprietário |
| `stageId` | Estágio atual |
| `title` | Rótulo opcional (padrão: líder principal) |
| `value` | Valor monetário como string decimal na moeda do pipeline |
| `status` | `open` \| `won` \| `lost` |
| `priority` | `high` \| `medium` \| `low` \| `none` |
| `temperature` | `hot` \| `warm` \| `cold` \| `frozen` (anulável) |
| `expectedClosingDate` | Data do calendário (`YYYY-MM-DD`), anulável |
| `leads/companies` | Leads e empresas interligadas, uma delas marcada como principal |
| `attendants` | Atendentes designados, opcionalmente digitados + comissionados |

**Regras:**
- Um cartão requer pelo menos um lead e um pipeline de destino + estágio no momento da criação.
- As cartas são organizadas dentro de um palco; uma jogada pode colocar uma carta no final do palco ou em relação a uma carta vizinha.
- Uma mudança entre fases pode ser bloqueada pelas regras de passagem de fase | uma mudança bloqueada falha e indica quais condições não foram atendidas.
- `won` / `lost` são tipos de estágio terminal; as configurações do pipeline podem exigir um valor e/ou data de fechamento prevista antes que um cartão possa ser ganho.
- A atribuição de atendentes substitui o conjunto completo de atendentes no cartão.
- A reordenação de etapas e a configuração de tipos de atendentes de pipeline substituem o conjunto completo.
- Quando a atribuição automática está ativada, novos cartões são distribuídos automaticamente aos atendentes (`manual` desativa-a).
- As configurações do pipeline incluem limite de inatividade do SLA, ativação/desativação de notificações, motivos de perda, prioridade/temperatura/moeda padrão e configuração de exibição do cartão.
- Excluir um pipeline, estágio ou cartão remove-o do quadro ativo juntamente com os itens que ele contém; prefira arquivar um pipeline ou definir um cartão `won`/`lost` em vez de excluí-lo.

**Dicas para o consumidor:**
- Resolva o alvo `pipelineId` e `stageId` (liste os pipelines e depois os estágios) antes de criar ou mover cartões.
- As listas de etapas e de cartões aceitam os mesmos filtros Kanban (busca, atendente, produto, funil), portanto os totais de cada etapa correspondem aos cartões visíveis.
- Visualize as listas afetadas antes de importar leads como cartões em massa; os relatórios de importação retornam contagens de `create`/`skipped`.
- A função de pesquisa de risco exibe os cartões ociosos além de um `idleDays` limite (padrão 14), útil para triagem de acompanhamento.

## crm/tags.ts — Etiquetas de CRM

**Objetivo** = rotular leads e interpretar o comportamento do ciclo de vida por meio de rótulos manuais e marcadores de atividade gerados pelo sistema.

**Escopo** = local do espaço de trabalho

**Famílias de tags:**
- Etiquetas manuais = etiquetas gerenciadas pelo usuário com nome/cor editáveis e atribuição direta de leads.
- Etiquetas do sistema = marcadores de ciclo de vida/evento derivados da atividade, gerados pelo comportamento da plataforma.

**Campos de etiqueta manual:**

| campo | significado |
|---|---|
| `id` | UUID da tag |
| `name` | Rótulo humano exibido no CRM |
| `color` | string hexadecimal de 6 caracteres sem `#` |
| `system` | `true` = tag gerenciada pela plataforma, `false` = tag gerenciada pelo usuário |
| `leadsCount` | Número de leads que atualmente possuem a etiqueta |
| `createdAt`/`updatedAt` | Registros de data e hora de auditoria |

**Regras:**
- `system=true` As tags são gerenciadas pela lógica de ciclo de vida do Clickmax | falha na atualização e exclusão.
- criar sempre produz `system=false`
- O comando `clone` cria uma nova tag no mesmo espaço de trabalho | o backend a nomeia `<original name> (1)`.
- A exclusão de uma tag manual também remove as atribuições de leads relacionadas e os links Kanban.
- As análises de tags do sistema são resumos derivados de eventos, não registros de tags editáveis manualmente.

**Uso seguro:**
- Prefira a listagem filtrada antes de ações destrutivas quando apenas parte do nome da tag for conhecida.
- Verifique `system` antes de planejar fluxos de atualização/exclusão.
- Prefira ferramentas de atribuição para alterações na classificação de leads; não exclua uma tag apenas para removê-la dos leads selecionados.
- Use o histórico de atividades das tags do sistema para entender padrões de comportamento/ciclo de vida, não como substituto para rótulos de segmentação manual.
