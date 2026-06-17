## funis/funis4.ts — Funis

**Objetivo** = gerenciar funis (fluxos de visitantes com várias etapas) no nível do funil: criar, configurar, publicar, desativar e analisar dados do funil.

**Escopo** = local do espaço de trabalho | um funil pertence a um projeto

**Campos do funil:**

| campo | significado |
|---|---|
| `id` | UUID do funil |
| `name` | Nome de exibição |
| `description` | Notas opcionais (podem ser anuladas) |
| `status` | `draft` \| `published` \| `unpublished_changes` \| `disabled` |
| `projectId` | Proprietário do projeto |
| `settings` | Configuração em nível de funil |
| `publishedAt` | Quando o funil foi publicado pela última vez (permitido que seja nulo) |

**Significado do status:**
- `draft` = nunca publicado
- `published` = ao vivo
- `unpublished_changes` = Existe uma versão ativa, mas o gráfico foi alterado desde então; publique novamente para aplicar.
- `disabled` = retirado do ar por meio de desativação

**Modelo gráfico:**
- Um funil contém nós (páginas e etapas lógicas) conectados por gatilhos (arestas).
- tipos de nós = `page` \| `draft` \| `notes` \| `traffic_source` \| `ab_test` \| `conditional` \| `workflow` \| `external_link`
- Um gatilho é um evento em um nó de origem (por exemplo `button_click`, `purchase_approved`, `contact_captured`) roteado para um nó de destino; os gatilhos residem no nó e se tornam uma aresta assim que conectados a um destino.
- Os IDs de nó e os IDs de gatilho são UUIDs atribuídos pelo servidor; sempre os leia de volta de uma chamada de criação/estrutura antes de conectar.

**Construindo o grafo (incremental, nó por nó):**
- `funnels_sequence_create` = estruturar um modelo completo (`sales`, `lead-magnet`, `webinar`, `tripwire`, `vsl-auto`, `upsell-downsell`) com nós já interconectados — o início mais rápido
- `funnels_node_create` = adiciona um nó com seus gatilhos (o servidor atribui IDs de gatilho); `userHelpMessage` anexa uma nota vinculada
- `funnels_structure_get` = visualização compacta do grafo (nós + gatilhos + arestas) para aprender os IDs reais antes da edição
- `funnels_triggers_connect` = enviar gatilhos para nós de destino em lote (ou desconectar com `target: null`)
- `funnels_node_triggers_update` = corrigir os gatilhos de um nó (`toDelete`/`toCreate`)
- `funnels_node_connect_page` = vincula uma página do editor a um nó; retorna gatilhos que ainda precisam de um ID de elemento
- `funnels_node_delete` = remover um nó e limpar as conexões que apontam para ele
- `funnels_validate` = relatar gatilhos pendentes/desconectados, nós órfãos e nós de página sem página

**Fluxo recomendado** = `funnels_create` → `funnels_sequence_create` ou `funnels_node_create` → `funnels_triggers_connect` → `funnels_node_connect_page` → `funnels_validate` → `funnels_publish`

**Regras:**
- A criação de um funil requer um `name` e um `projectId`; `description` e `domainId` personalizados são opcionais (podem ser nulos).
- Atualizar um funil altera `name`/`description` somente.
- A publicação utiliza os IDs dos nós para enviar os dados ao vivo e configura `publishedAt`.
- Editar o gráfico no construtor move um funil `published` até `unpublished_changes` que ele seja publicado novamente.
- A desativação tira um funil ativo do ar (`disabled`).
- Excluir um funil é permanente.

**Dicas para o consumidor:**
- Primeiro, resolva o objetivo `projectId` (liste os projetos); a listagem de funis sempre se limita a um projeto e é paginada.
- Use o recurso de busca de funil único para inspecionar nós e gatilhos antes de publicar ou desativar.
- A ferramenta de análise aceita um parâmetro opcional `startDate`/`endDate` (data e hora ISO) e retorna visitas, visitantes únicos, cadastros, compradores, receita e valor médio do ticket.
