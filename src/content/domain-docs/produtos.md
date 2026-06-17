## produtos/ofertas.ts — Ofertas

**Objetivo** = controlar as variantes comercializáveis de um produto — preço, moeda, métodos de pagamento, configuração de finalização de compra e status do ciclo de vida.

**Escopo** = local do espaço de trabalho | cada oferta pertence a um produto

**Entidade:**

| campo | significado |
|---|---|
| `id` | UUID da oferta |
| `productId` | Produto proprietário |
| `name` | Nome de exibição da oferta |
| `isMain` | `true` = a oferta padrão para o produto (criada com o produto) |
| `type` | Tipo de finalização de compra: `internal` (Checkout Clickmax) ou `external` (URL de terceiros) |
| `currency` | Código de moeda ISO |
| `originalPrice` | Preço base na menor unidade monetária |
| `newPrice` | Preço promocional opcional |
| `status` | Estado do ciclo de vida: `draft`, `pending_approval`, `active`, `archived` |
| `hash` | Identificador público curto usado em URLs de finalização de compra |
| `externalUrl` | URL de destino quando `type=external` |
| `isRecurrent` | Sinalizador de assinatura/cobrança recorrente |
| `quantityItems` | Quantidade de itens para ofertas físicas/com limite de quantidade |
| `incompleteReason` | Texto explicando por que uma oferta ainda não está disponível para ser publicada |

**Regras:**
- Existe apenas uma oferta por produto com `isMain=true`, criada automaticamente com o produto.
- Os preços, moedas e opções de pagamento são exibidos nas ofertas, não no produto.
- ciclo de vida da oferta = `draft → pending_approval → active`; a aprovação é acionada explicitamente via `offers_send_to_approval`.
- `getIncompleteReason` enumera os obstáculos (descrição ausente, contato de suporte, entregáveis, etc.) para ofertas que ainda não estão qualificadas para serem ativadas.
- Arquivar ≠ excluir | Arquivar oculta a oferta dos fluxos ativos e é reversível.
- A exclusão é destrutiva | falha quando existem transações na oferta.
- `clone_main_offer` duplica a oferta principal de um produto em uma nova variante do mesmo produto, preservando a maioria dos campos.

**Uso seguro:**
- Inspecione `offers_get_incomplete_reason` antes de enviar uma proposta para aprovação para prever a rejeição do revisor.
- Prefira `offers_archive` a `offers_delete` quando a oferta já tiver sido vinculada a um funil/checkout.
- Ao alterar os preços, atualize via `offers_update` em vez de recriar; os links de finalização de compra existentes mantêm o mesmo ID da oferta.
- `offers_clone_main_offer` é a forma segura de criar preços alternativos ou configurações de pagamento diferentes para o mesmo produto.

## produtos/produtos.ts — Catálogo de Produtos

**Objetivo** = gerenciar o catálogo de produtos comercializáveis de um espaço de trabalho, incluindo metadados do catálogo e a oferta padrão criada para cada produto.

**Escopo** = local do espaço de trabalho | os produtos sempre pertencem a um `projectId`

**Entidade:**

| campo | significado |
|---|---|
| `id` | UUID do produto |
| `name` | Nome de exibição |
| `productType` | Formato da distribuição (ex: `digital`, `physical`, `subscription`, `service`) |
| `class` | Taxonomia de classes de catálogo |
| `category` | Taxonomia de categoria de catálogo |
| `isArchived` | `true` = oculto do catálogo ativo, mantido para histórico |
| `totalOffersCount` | Número de ofertas associadas a este produto |
| `status` | dica de disponibilidade calculada |
| `offers[]` | Ofertas associadas ao produto (preços, moeda, configuração de checkout, transações/cupons) |

**Regras:**
- um produto está vinculado a um `projectId` por toda a sua vida útil.
- A criação de um produto sempre gera uma oferta inicial juntamente com ele (retornada como `offer`).
- Os preços são baseados em ofertas, não em produtos | `originalPrice`/`newPrice` de nível de catálogo aplicam-se somente à oferta inicial.
- Arquivar ≠ excluir | Arquivar oculta do catálogo ativo e pode ser revertido via desarquivar.
- A exclusão é destrutiva | permitida somente quando o produto não possui transações em suas ofertas.
- `getProduct` aceita `checkoutType` = `internal` | `external` para refinar a lista de ofertas e `internalUrl` a renderização.

**Uso seguro:**
- A lista antes da mutação serve para confirmar o produto correto quando apenas parte do nome é conhecida.
- Prefira arquivar em vez de excluir quando o produto já tiver sido usado em funis/fluxos de pagamento.
- Inspecione `offers[].hasTransaction` e `offers[].hasCoupon` antes da exclusão, para antecipar o impacto em cascata.
- Ao criar um produto, defina `productType` e preços intencionalmente — os valores padrão variam por `productType` e influenciam o comportamento da oferta subsequente.
