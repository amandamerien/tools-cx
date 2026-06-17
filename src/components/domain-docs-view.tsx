import { domainDocs } from "@/data/domain-docs";
import { MarkdownView } from "@/components/markdown";

/**
 * Renderiza os 25 documentos de domínio, agrupados por domínio.
 * Cada doc traz a semântica de campos/parametrização das tools do domínio.
 */
export function DomainDocsView() {
  return (
    <div className="flex flex-col gap-12">
      {domainDocs.map(({ domain, markdown }) => (
        <section key={domain.slug} id={domain.slug} className="scroll-mt-20">
          <h2 className="mb-1 flex items-center gap-2 text-xl font-semibold text-foreground">
            <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-sm">
              {domain.slug}
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {domain.label}
            </span>
          </h2>
          <MarkdownView>{markdown}</MarkdownView>
        </section>
      ))}
    </div>
  );
}
