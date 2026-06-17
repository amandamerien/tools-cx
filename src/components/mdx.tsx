import { Suspense, type ReactNode } from "react";
import { MDXProvider } from "@mdx-js/react";
import { Info, GitCommit, AlertTriangle } from "lucide-react";
import { getContent } from "@/content/registry";
import { cn } from "@/lib/utils";

type CalloutVariant = "info" | "source" | "warning";

const styles: Record<
  CalloutVariant,
  { icon: typeof Info; className: string }
> = {
  info: {
    icon: Info,
    className: "border-border bg-muted/40 text-muted-foreground",
  },
  source: {
    icon: GitCommit,
    className:
      "border-border bg-muted/30 text-muted-foreground font-mono text-[0.8rem]",
  },
  warning: {
    icon: AlertTriangle,
    className:
      "border-brand/30 bg-brand-muted text-foreground [&_code]:bg-brand/15",
  },
};

/** Bloco de destaque para metadados, fontes ou avisos. */
export function Callout({
  variant = "info",
  children,
}: {
  variant?: CalloutVariant;
  children: ReactNode;
}) {
  const { icon: Icon, className } = styles[variant];
  return (
    <div
      className={cn(
        "my-5 flex gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0 opacity-70" />
      <div className="min-w-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
}

/** Mapa de componentes injetados em todo MDX via MDXProvider. */
export const mdxComponents = {
  Callout,
};

/**
 * Renderiza o MDX da rota dentro da prosa de documentação.
 * Sem conteúdo registrado → placeholder.
 */
export function MdxContent({
  pathname,
  title,
}: {
  pathname: string;
  title: string;
}) {
  const Content = getContent(pathname);

  if (!Content) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        📄 Conteúdo de <strong className="text-foreground">{title}</strong>{" "}
        ainda não definido — me envie o material deste item.
      </div>
    );
  }

  return (
    <MDXProvider components={mdxComponents}>
      <div className="prose-doc">
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">Carregando…</p>
          }
        >
          <Content />
        </Suspense>
      </div>
    </MDXProvider>
  );
}
