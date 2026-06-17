import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * Mapa rota → conteúdo MDX.
 * Adicione uma entrada aqui ao criar um novo arquivo em src/content/.
 * Rotas sem entrada caem no placeholder da DocPage.
 */
export const content: Record<
  string,
  LazyExoticComponent<ComponentType>
> = {
  "/tools": lazy(() => import("@/content/tools.mdx")),
};

export function getContent(pathname: string) {
  return content[pathname] ?? null;
}
