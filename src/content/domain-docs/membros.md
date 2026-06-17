## membros/sala de aula.ts — Salas de aula

**Objetivo** = gerenciar contêineres de cursos dentro de portais; uma sala de aula agrupa conteúdos (cursos) nos quais os membros podem se inscrever.

**Escopo** = local do espaço de trabalho | cada sala de aula pertence a um portal

**Hierarquia:** `portal → classroom → content (course) → module → lesson`

**Entidade:**

| campo | significado |
|---|---|
| `id` | UUID da sala de aula |
| `portalId` | Portal dos pais |
| `name` | Nome de exibição mostrado aos membros |
| `image` | Miniatura opcional |
| `contents[]` | Cursos vinculados a esta sala de aula |
| `membersCount` | Número de usuários membros atualmente inscritos |
| `createdAt` | Carimbo de data/hora da auditoria |

**Regras:**
- Uma sala de aula está vinculada a um único portal durante toda a sua existência.
- A vinculação de um conteúdo (curso) é feita por meio de `classroom_add_content` (idempotente para o mesmo `contentId`).
- `copy_members_from` matricula todos os membros de uma turma de origem em uma turma de destino; útil para clonar padrões de acesso.
- A exclusão é destrutiva — remove inscrições e links de conteúdo; os usuários membros mantêm o acesso ao portal (até serem removidos separadamente).

**Uso seguro:**
- Liste as salas de aula para um portal antes de realizar a mutação para confirmar o ID correto.
- Utilize `classroom_details` para inspecionar o conteúdo e suas lições em uma única chamada ao planejar alterações.
- Prefira `copy_members_from` à inscrição manual em massa quando a turma-alvo deve refletir um público existente.
- Para inscrever/cancelar a inscrição de membros individuais, use o módulo de usuários-membros ou a ferramenta de atualização em massa da turma (`add_to_classroom`/`remove_from_classroom`).

## membros/conteúdo.ts — Conteúdo para membros (cursos)

**Objetivo** = gerenciar as entidades de conteúdo (cursos) na área de membros; um conteúdo é a unidade de nível superior na qual os alunos se matriculam e progridem.

**Escopo** = local do espaço de trabalho

**Hierarquia:** `portal → classroom → content (course) → module → lesson`

Um conteúdo é o que os usuários finais geralmente chamam de "curso". Cada conteúdo agrupa módulos e lições. As salas de aula fazem referência aos conteúdos por meio de `classroom_add_content`.

**Entidade:**

| campo | significado |
|---|---|
| `id` | UUID do conteúdo |
| `name`/`title` | Nome de exibição mostrado aos membros |
| `description` | Texto de marketing/introdução |
| `enabled` | Se o conteúdo está visível para os membros nas salas de aula às quais está vinculado |
| `coverImages` | Arte da capa horizontal/vertical |
| `modules[]` | Módulos dentro deste curso (retornados por `content_get` e `content_list`) |

**Regras:**
- Um conteúdo pode ser vinculado a várias salas de aula (via `classroom_add_content`); excluí-lo remove os links.
- `content_list` retorna conteúdo paginado com seus módulos; ponto de entrada preferencial para descobrir cursos em todo o espaço de trabalho sem navegar por portais → salas de aula.
- `content_toggle_enabled` aceita um lote de `{ contentId, enabled }` pares — útil para alterações de visibilidade em massa.
- A exclusão é destrutiva — o efeito se propaga para módulos e lições dentro do conteúdo.

**Uso seguro:**
- Para encontrar um curso pelo nome, prefira `content_list` e selecione localmente em vez de adivinhar os IDs.
- Combine `content_get` com `member_users_get_course_progress` para verificar o progresso em um curso.
- A ativação/desativação de conteúdo é reversível; a exclusão não é — prefira a opção de alternar para remoções temporárias.

**Dicas para o consumidor:**
- O gerenciamento de imagens (`updateContentImage`) é tratado por um auxiliar de upload dedicado e, intencionalmente, não é exposto como uma ferramenta MCP.

## membros/lição.ts — Lições

**Objetivo** = gerenciar lições individuais dentro de um módulo; lições são a unidade de entrega de conteúdo aos membros.

**Escopo** = local do espaço de trabalho | cada lição pertence a um módulo

**Hierarquia:** `portal → classroom → content (course) → module → lesson`

**Entidade:**

| campo | significado |
|---|---|
| `id` | UUID da lição |
| `moduleId` | Módulo pai |
| `name` | Nome de exibição |
| `position` | Ordenação dentro do módulo (baseado em 1) |
| `url` | URL do vídeo/conteúdo |
| `enabled` | Se a aula está visível para os membros |
| `images` | Imagens de capa (vertical/horizontal) |
| `attachments` | Recursos para download anexados à lição |

**Regras:**
- `updateLesson` e `getLessonById` ambos exigem `id` (caminho) e `moduleId` (consulta) para localizar a lição — o SDK expõe uma única entrada de ferramenta que combina os dois.
- Para reordenar as lições dentro de um módulo, use `module_organize_lesson_positions` (não uma chamada em nível de lição).
- Mover uma lição entre módulos usa `lesson_move` com um `targetModuleId` e a nova `position`.
- `lesson_toggle_enabled` aceita um lote de `{ lessonId, enabled }` pares; útil para ativar/desativar várias lições de uma só vez.
- A ação de excluir é destrutiva — remove o progresso do membro na lição.

**Uso seguro:**
- Inspecione uma lição com `lesson_get` (passando `moduleId`) antes de atualizar ou mover.
- Prefira alternar a visibilidade (`lesson_toggle_enabled`) em vez de excluir quando a lição puder ser reativada posteriormente.
- `lesson_move` valida `position` em relação ao módulo de destino; posições fora do intervalo são rejeitadas.

**Dicas para o consumidor:**
- Os uploads de imagens e anexos (`updateLessonImage`, `updateLessonAttachment`) são gerenciados por auxiliares de upload dedicados e não são expostos intencionalmente como ferramentas MCP.
- O endpoint "como uma lição" do lado do membro autentica-se como um usuário membro (não um usuário do espaço de trabalho) e é intencionalmente excluído desta interface do agente.

## membros/usuários-membros.ts — Usuários membros (membros inscritos)

**Objetivo** = gerenciar os clientes finais inscritos na área de membros do espaço de trabalho, incluindo identidade, status ativo, atribuições de portal/sala de aula, janelas de acesso, e-mails com links de acesso e relatórios de progresso.

**Escopo** = local do espaço de trabalho

**Terminologia:**
- Usuário membro = um cliente final cadastrado com acesso de login a um ou mais portais.
- Lead = a identidade do CRM para a mesma pessoa; um usuário membro corresponde a um lead por meio de `leadId`.
- portal = a área de membros onde o usuário faz login (consulte o módulo members-portals).
- Sala de aula = um contêiner de curso dentro de um portal (ver módulo de sala de aula).
- Tempo de acesso = um período durante o qual o usuário membro pode consumir conteúdo por um `(classroom, content)` par.

**Destaques da entidade:**

| campo | significado |
|---|---|
| `id` | UUID do usuário membro |
| `leadId` | UUID do lead do CRM vinculado |
| `email`/`name` | Campos de identidade exibidos no portal |
| `active` | Se o membro pode iniciar sessão |
| `portals[]` | Portais nos quais o membro está inscrito |
| `classrooms[]` | Salas de aula em que o membro está matriculado |
| `accessTimes[]` | Janelas de acesso com tempo limitado para `(classroom, content)` pares |

**Mutações:**
- único: `create`, `update`, `enable`/`disable`, `delete` trabalham em um usuário membro.
- Em lote: a maioria das operações de escrita possui uma variante `_bulk_*` que aceita uma matriz de IDs de membros-usuários.
- Suporte para atualizações em massa de portal/sala de aula `action` = `add` ou `remove`.
- As mutações de tempo de acesso são limitadas a um ID de usuário membro e aceitam uma matriz de `(classroom, content)` itens no corpo da requisição.

**Fluxo de link de acesso:**
- `send_access_link` envia por e-mail o URL de login do portal para um membro; útil logo após a criação ou após uma reatribuição do portal.
- `bulk_send_access_link` faz o mesmo para vários usuários membros em um portal.

**Visualizações do progresso:**
- `progress` (por ID de usuário membro) e `progress_by_lead` (por ID de lead) retornam um detalhamento por portal → por sala de aula → por curso.
- `course_progress` amplia os módulos de um curso.
- `certificate_code` retorna o código do certificado de conclusão do curso, se obtido.

**Uso seguro:**
- Prefira `member_users_get_by_lead` quando apenas a identidade do CRM for conhecida.
- Antes de chamadas `bulk_*`, filtre `memberUserIds` cuidadosamente — não há modo de pré-visualização.
- `delete` é destrutivo e se propaga para registros de matrículas, progresso e tempo de acesso; prefira `disable` para revogar o login sem perder o histórico.
- O parâmetro de access-time `reset` limpa o período consumido dos itens selecionados; use `extend` apenas para adicionar mais tempo.
- O endpoint de importação de CSV existe para fluxos humanos na API HTTP e, intencionalmente, não está exposto aqui.

**Dicas para o consumidor:**
- O endpoint "opções de filtro" do painel é um auxiliar de UI para listas suspensas e não é apresentado como ferramenta MCP; os agentes devem usar os filtros de consulta de `member_users_list` diretamente.

## membros/módulo.ts — Módulos

**Objetivo** = gerenciar os módulos de um curso (conteúdo); um módulo agrupa lições dentro de um curso.

**Escopo** = local do espaço de trabalho | cada módulo pertence a um conteúdo (curso)

**Hierarquia:** `portal → classroom → content (course) → module → lesson`

**Entidade:**

| campo | significado |
|---|---|
| `id` | UUID do módulo |
| `contentId` | Conteúdo principal (curso) |
| `name` | Nome de exibição |
| `position` | Ordem dentro do curso (baseado em 1) |
| `cover` | Imagem de capa opcional |
| `lessons[]` | Lições deste módulo |

**Regras:**
- Os módulos são ordenados dentro de um curso por `position`; reordene através de `module_organize_positions` com a ordem de destino completa.
- Para reordenar as lições dentro de um módulo, use `module_organize_lesson_positions` com o ID do módulo e a ordem das lições.
- A exclusão é destrutiva — o efeito se propaga para todas as lições dentro do módulo.

**Uso seguro:**
- liste os módulos de um curso (`module_list`) antes de reordená-los para construir a matriz de posição alvo.
- `module_organize_positions` aceita o conjunto de ordenação completo, não as variações; as posições são baseadas em 1.
- Para gerenciar as próprias lições (CRUD além de reordenar), use o módulo de lições.

**Dicas para o consumidor:**
- O gerenciamento de imagens (`updateModuleImage`, `uploadModuleCover`) é feito por auxiliares de upload dedicados e, intencionalmente, não é exposto como ferramentas MCP; os fluxos de agentes devem solicitar ao usuário que faça o upload pela interface.

## membros/portal-membros.ts — Portal ↔ Atribuições de Membros

**Objetivo** = gerenciar a relação de associação entre portais e usuários membros a partir da perspectiva do portal.

**Escopo** = local do espaço de trabalho

**Semântica:**
- Um usuário membro pode pertencer a vários portais.
- Um portal pode hospedar muitos usuários membros.
- A inscrição em um portal não garante automaticamente a matrícula em nenhuma de suas salas de aula.
- A atribuição espelha as operações inversas no módulo de usuários-membros; ambas fluem por diferentes serviços internamente.

**Operações:**
- Adicionar um membro a um portal.
- Adicionar vários membros a um portal em massa (retorna o sucesso/falha de cada membro).
- Remover um membro de um portal.
- Listar membros de um portal com filtros e paginação.

**Uso seguro:**
- Este módulo tem escopo de portal; use a ferramenta de portal em massa do módulo de usuários-membros ao alterar vários portais para o mesmo conjunto de membros em uma única chamada.
- A remoção aqui desvincula o membro apenas do portal; as matrículas em sala de aula dentro desse portal seguem o mesmo padrão.
- Em conjunto com `members_send_access_link` nas adições posteriores, o membro deve receber o URL de login por e-mail.

## membros/portais.ts — Portais de membros

**Objetivo** = gerenciar os sites da área de membros da marca onde os clientes finais consomem conteúdo.

**Escopo** = local do espaço de trabalho

**Entidade:**

| campo | significado |
|---|---|
| `id` | UUID do portal |
| `name` | Nome de exibição mostrado aos membros |
| `subdomain` | Segmento de subdomínio exclusivo para o URL público |
| `theme` | Tema visual (claro/escuro, cores, fontes) |
| `images` | Logotipo claro/escuro, capa, miniatura, imagem de login — enviados separadamente |
| `status` | Vida útil (`draft`, `published`, …) |
| `createdAt` | Carimbo de data/hora da auditoria |

**Regras:**
- `subdomain` é exclusivo para todo o espaço de trabalho em todos os portais — use `portals_check_subdomain` antes de criar/alterar.
- Um portal é um contêiner; os membros são conectados através do módulo de portal-membros, e os cursos através de links entre sala de aula e portal.
- A exclusão é destrutiva — afeta as atribuições de membros e os links de conteúdo.
- O upload de imagens é feito através de um endpoint multipart dedicado e não é exposto aqui intencionalmente.

**Uso seguro:**
- `portals_check_subdomain` é seguro verificar antes de `portals_create` ou `portals_update` para evitar o erro 4xx na chamada de escrita.
- usado `portals_list` para descobrir IDs de portal; o mesmo ID de portal é exigido por outros módulos membros (portal-members, classroom, …).
- É preferível desativar um portal (alterar o status) em vez de excluí-lo, quando os clientes finais ainda podem precisar fazer login.

**Dicas para o consumidor:**
- O gerenciamento de imagens para um portal (`updatePortalImage`) é feito por um auxiliar de upload pré-assinado na API HTTP; os fluxos de agentes devem solicitar que o usuário faça o upload pela interface.
