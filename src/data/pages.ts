/**
 * Páginas de conteúdo em Markdown cru (rota → markdown), renderizadas via
 * MarkdownView. Bom para conteúdo pesado em código, evitando o MDX.
 */
import executarEQuestionar from "@/content/pages/executar-e-questionar.md?raw";

export const markdownPages: Record<string, string> = {
  "/tools/executar-e-questionar": executarEQuestionar,
};

export function getMarkdownPage(pathname: string): string | undefined {
  return markdownPages[pathname];
}
