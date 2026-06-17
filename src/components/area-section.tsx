import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { NavSection } from "@/config/navigation";
import { MdxContent } from "@/components/mdx";

/**
 * Seção de uma área no corpo da home: cabeçalho + subtítulo + divisor +
 * conteúdo MDX. Tem âncora (id = slug) para o menu rolar até ela.
 */
export function AreaSection({ section }: { section: NavSection }) {
  return (
    <section id={section.slug} className="scroll-mt-20">
      <div className="group flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
            <span>{section.emoji}</span>
            <Link to={section.href} className="hover:underline">
              {section.label}
            </Link>
          </h2>
          {section.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {section.description}
            </p>
          )}
        </div>
        <Link
          to={section.href}
          aria-label={`Abrir ${section.label}`}
          className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-accent hover:text-foreground group-hover:opacity-100"
        >
          <ArrowUpRight className="size-4" />
        </Link>
      </div>

      <hr className="my-5 border-border" />

      <MdxContent pathname={section.href} title={section.label} />
    </section>
  );
}
