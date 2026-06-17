import {
  toolsByDomain,
  safetyLabels,
  type Tool,
  type ToolDomain,
  type ToolSafety,
} from "@/data/tools";
import { cn } from "@/lib/utils";

/** Estilo do badge de safety por nível de risco. */
const safetyBadge: Record<ToolSafety, string> = {
  read: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  write: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  idempotent: "border-sky-500/30 bg-sky-500/10 text-sky-500",
  approval: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  destructive: "border-red-500/30 bg-red-500/10 text-red-500",
};

/** Cor da borda esquerda por nível de risco. */
const safetyBorder: Record<ToolSafety, string> = {
  read: "border-l-emerald-500/50",
  write: "border-l-amber-500/60",
  idempotent: "border-l-sky-500/60",
  approval: "border-l-violet-500/60",
  destructive: "border-l-red-500/60",
};

function SafetyBadge({ safety }: { safety: ToolSafety }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none",
        safetyBadge[safety],
      )}
    >
      {safetyLabels[safety]}
    </span>
  );
}

function groupByFile(items: Tool[]): { file: string; tools: Tool[] }[] {
  const map = new Map<string, Tool[]>();
  for (const tool of items) {
    const list = map.get(tool.file) ?? [];
    list.push(tool);
    map.set(tool.file, list);
  }
  return [...map.entries()].map(([file, tools]) => ({ file, tools }));
}

/**
 * Lista as tools de um domínio, agrupadas por arquivo, no estilo da
 * documentação de referência (nome · safety + Título/entrada/desc).
 */
export function ToolList({ domain }: { domain: ToolDomain }) {
  const items = toolsByDomain(domain.slug);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        📦 <strong className="text-foreground">0 de {domain.count}</strong>{" "}
        tools carregadas para{" "}
        <strong className="text-foreground">{domain.label}</strong> — aguardando
        os dados deste domínio.
      </div>
    );
  }

  const groups = groupByFile(items);

  return (
    <div className="flex flex-col gap-10">
      {groups.map((group) => (
        <section key={group.file}>
          <h3 className="font-mono text-sm font-medium text-foreground">
            {group.file}
          </h3>
          <hr className="mb-4 mt-2 border-border" />
          <div className="flex flex-col gap-5">
            {group.tools.map((tool) => (
              <ToolRow key={tool.name} tool={tool} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ToolRow({ tool }: { tool: Tool }) {
  return (
    <div className={cn("border-l-2 pl-4", safetyBorder[tool.safety])}>
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-xs text-foreground">
          {tool.name}
        </code>
        <SafetyBadge safety={tool.safety} />
      </div>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        <li>
          <strong className="font-medium text-foreground">Título:</strong>{" "}
          <span className="text-muted-foreground">{tool.title}</span>
        </li>
        <li>
          <strong className="font-medium text-foreground">entrada:</strong>{" "}
          {tool.input ? (
            <code className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[0.8em] text-foreground">
              {tool.input}
            </code>
          ) : (
            <span className="text-muted-foreground">(sem input)</span>
          )}
        </li>
        {tool.description && (
          <li>
            <strong className="font-medium text-foreground">desc:</strong>{" "}
            <span className="text-muted-foreground">{tool.description}</span>
          </li>
        )}
      </ul>
    </div>
  );
}
