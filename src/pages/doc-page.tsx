import { useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { findNode, navigation } from "@/config/navigation";
import { getDomain } from "@/data/tools";
import { getMarkdownPage } from "@/data/pages";
import { getPlaybook } from "@/data/playbooks-data";
import { MdxContent } from "@/components/mdx";
import { MarkdownView } from "@/components/markdown";
import { ToolList } from "@/components/tool-list";
import { DomainDocsView } from "@/components/domain-docs-view";
import { PlaybookView } from "@/components/playbook-view";

/**
 * Página de conteúdo.
 * Resolve a área/trilha pela rota, mostra cabeçalho + breadcrumb e
 * renderiza o MDX correspondente (ou um placeholder, se ainda não houver).
 */
export function DocPage() {
  const { pathname } = useLocation();
  const match = findNode(pathname) ?? { section: navigation[0], trail: [] };
  const { section, trail } = match;

  const isAreaRoot = trail.length === 0;
  const current = trail.length > 0 ? trail[trail.length - 1] : null;
  const title = current?.title ?? section.label;
  const SectionIcon = section.icon;

  // Página de domínio de tools (ex: /tools/crm) → lista de tools.
  const domain =
    section.slug === "tools" && trail.length === 1
      ? getDomain(pathname.replace("/tools/", ""))
      : undefined;

  const markdownPage = getMarkdownPage(pathname);
  const playbook = getPlaybook(pathname);

  const description = domain?.summary ?? (isAreaRoot ? section.description : undefined);

  return (
    <article>
      {/* Breadcrumb */}
      <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <SectionIcon className="size-3.5 shrink-0" strokeWidth={2} />
          {section.label}
        </span>
        {trail.map((node, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <ChevronRight className="size-3.5 opacity-50" />
            <span
              className={i === trail.length - 1 ? "text-foreground" : undefined}
            >
              {node.title}
            </span>
          </span>
        ))}
      </nav>

      {playbook ? (
        <PlaybookView playbook={playbook} />
      ) : (
        <>
          <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight text-foreground">
            {isAreaRoot && <SectionIcon className="size-7 shrink-0 text-brand" strokeWidth={2} />}
            <span>{title}</span>
            {domain && (
              <span className="rounded-full border border-brand/30 bg-brand-muted px-2.5 py-0.5 text-xs font-medium text-brand">
                {domain.count} ferramentas
              </span>
            )}
          </h1>

          {description && (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}

          <hr className="my-6 border-border" />

          {/* Corpo */}
          {pathname === "/tools/docs-de-dominio" ? (
            <DomainDocsView />
          ) : domain ? (
            <ToolList domain={domain} />
          ) : markdownPage ? (
            <MarkdownView>{markdownPage}</MarkdownView>
          ) : (
            <MdxContent pathname={pathname} title={title} />
          )}
        </>
      )}
    </article>
  );
}
