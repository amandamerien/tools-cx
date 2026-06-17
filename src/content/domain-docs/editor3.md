## editor3/pages.ts — Visão geral das páginas

**Objetivo** = gerenciar páginas do editor3 | páginas do construtor + páginas externas | script bootstrap para páginas externas

**Escopo** = listar/obter/criar/atualizar/clonar/excluir páginas | publicar/cancelar publicação de páginas do construtor | gerar script SDK do navegador pronto para colar em páginas externas

**Tipos de página:**

| tipo | significado | campos-chave | restrições |
|---|---|---|---|
| construtor | Página hospedada no Clickmax editada no construtor | `editorVersion='v2'`/`'v3'` | — |
| externo | Página de terceiros rastreada pelo SDK do navegador Clickmax | `editorVersion='external'` | `externalUrl` |

**Regras:**
- Prefira o fluxo de página externa quando o usuário desejar conectar um site existente / página de destino / Framer / Webflow / página HTML personalizada ao Clickmax.
- `createPage` cria apenas o registro da página; esta superfície MCP ainda não expõe as operações de salvar/editar conteúdo do construtor.
- `publish`/`unpublish` são exclusivas do construtor; páginas externas rejeitam ambas.
- `updatePageConfig` é exclusivo do construtor; páginas externas o rejeitam.
- Páginas externas podem ser atualizadas: `name`/`description`/`type`/`projectId`/`externalUrl`/`externalConfig`.
- Páginas externas não podem alterar `path` ou anexar um `domainId` personalizado.
- `pages_get_external_script` resolve a página `pageId` e retorna um trecho de código `<head>` com `projectSlug` + `pagePath` já injetado; o SDK do navegador não usa `pageId` diretamente no carregador.

**Notas sobre scripts externos:**
- instale o trecho de código antes de `</head>`
- Adicione a página externa a um funil quando o roteamento/navegação da próxima etapa seguir as dicas do Clickmax.
- Os formulários podem ser usados tanto `form[data-cx-ingest-form]` em HTML existente quanto `[data-cx-form-widget]` em um widget renderizado pelo Clickmax.
- A precedência do redirecionamento começa com `data-cx-redirect-url`, seguida pelas dicas de backend/funil.

**Dicas para o consumidor:**
- use `pages_create_external` primeiro, depois `pages_get_external_script` para entregar ao usuário um script pronto + exemplos.
- Use `pages_get` antes das mutações quando precisar confirmar `editorVersion`, `projectSlug`, `path` atual ou `externalUrl`.
- Se o usuário solicitar ajuda com a instalação, retorne apenas o script gerado e um exemplo de formulário; evite exibir todos os trechos de código, a menos que sejam solicitados.
