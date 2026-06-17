## temis/projects.ts — Projetos Temis

**Finalidade** = registro de projetos em nível de espaço de trabalho para páginas, funis, cloakers e ativos relacionados.

**Escopo** = um projeto pertence a um espaço de trabalho

**Entidade:**

| campo | significado |
|---|---|
| `id` | UUID do projeto |
| `slug` | Identificador estável e visível para humanos, usado pela maioria das rotas do projeto |
| `name` | Nome de exibição |
| `active` | O projeto está ativo? |
| `isDefault` | Projeto padrão para o espaço de trabalho |
| `isImported` | Projeto originado do fluxo de importação/migração |
| `metrics.pageCount` | Número de páginas relacionadas |
| `metrics.funnelCount` | Número de funis relacionados |
| `metrics.cloakerCount` | Número de capas relacionadas |

**Regras:**
- A função `list + get` retorna apenas projetos não excluídos.
- `set default` alterna exatamente um projeto de espaço de trabalho para `isDefault=true` quando o slug existe.
- A exclusão de um projeto é abrangente | ela exclui logicamente várias entidades relacionadas em diversos produtos.
- O slug é o identificador mais seguro para chamadas de ferramentas MCP.

**Dicas para o consumidor:**
- Utilize `slug` como referência estável do projeto em operações e integrações subsequentes.
- Analise a quantidade de dependências antes de excluir ou reestruturar um projeto.
- Trate as alterações do projeto padrão como um comportamento de todo o espaço de trabalho, e não apenas como uma preferência da interface do usuário.
