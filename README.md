# Documentação Max — "Playbooks fazem Max"

Documentação estilo shadcn (React + Vite + Tailwind v4) da plataforma Clickmax / Max.

## Conteúdo

- **🧰 Ferramentas para Max** — as 261 tools reais do monorepo, por domínio, com badges de safety (ler · escrever · escrita idempotente · aprovação-escrita · destrutivo).
- **Docs de domínio** — os 25 documentos de semântica de campos/parametrização.
- **Executar e questionar** — semântica do `execute` (codemode) e do `question`.
- **Playbooks** (Análise, Furion, Melhorias, Prompts, Bilhon OS) — cada um com gatilhos, perguntas, guia de execução e componentes de resultado.

## Stack

Vite · React 18 · TypeScript · Tailwind v4 · MDX + react-markdown · react-router-dom.

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de produção
```

## Estrutura

```
src/
├─ config/navigation.ts     # menu (6 áreas) — fonte única
├─ data/                    # tools.ts, domain-docs, playbooks-data, pages
├─ content/                 # .md/.mdx (docs de domínio, playbooks, páginas)
├─ components/              # sidebar, playbook-view, results, markdown, ui/
└─ pages/                   # home (hero) + doc-page (roteador de conteúdo)
```
