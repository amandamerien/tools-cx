import { useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

/** Extrai o texto puro de uma árvore de nós React (para copiar). */
function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

/** Bloco de código com botão de copiar. */
function Pre({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(extractText(children).replace(/\n$/, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group/code relative">
      <button
        type="button"
        onClick={copy}
        aria-label="Copiar código"
        className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border border-border bg-background/80 px-2 py-1 text-xs text-muted-foreground opacity-70 backdrop-blur transition-all hover:bg-accent hover:text-foreground hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? (
          <>
            <Check className="size-3.5 text-brand" />
            copiado
          </>
        ) : (
          <>
            <Copy className="size-3.5" />
            copiar
          </>
        )}
      </button>
      <pre>{children}</pre>
    </div>
  );
}

const components = { pre: Pre };

/** Renderiza uma string Markdown (GFM: tabelas, etc.) na prosa de documentação. */
export function MarkdownView({ children }: { children: string }) {
  return (
    <div className="prose-doc">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </Markdown>
    </div>
  );
}
