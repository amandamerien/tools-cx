/**
 * Os 25 documentos de domínio (resources/**.md) — a semântica de campos e
 * parametrização que o worker carrega como contexto das tools.
 * Conteúdo cru em src/content/domain-docs/<dominio>.md, importado via ?raw.
 */
import { toolDomains, type ToolDomain } from "@/data/tools";

const raw = import.meta.glob("../content/domain-docs/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** markdown por slug de domínio (deriva o slug do nome do arquivo). */
const bySlug: Record<string, string> = {};
for (const [path, content] of Object.entries(raw)) {
  const slug = path.split("/").pop()!.replace(/\.md$/, "");
  bySlug[slug] = content;
}

export interface DomainDoc {
  domain: ToolDomain;
  markdown: string;
}

/**
 * Ordem dos docs = ordem dos diretórios no monorepo (resources/**.md),
 * alfabética por diretório: crm, editor3, fluxos, funis, membros,
 * pagamentos, produtos, temis(era).
 */
const docOrder = [
  "crm",
  "editor3",
  "fluxos",
  "funis",
  "membros",
  "pagamentos",
  "produtos",
  "era",
];

export const domainDocs: DomainDoc[] = docOrder
  .map((slug) => toolDomains.find((d) => d.slug === slug))
  .filter((d): d is ToolDomain => !!d && !!bySlug[d.slug])
  .map((domain) => ({ domain, markdown: bySlug[domain.slug] }));

export function getDomainDoc(slug: string): string | undefined {
  return bySlug[slug];
}
