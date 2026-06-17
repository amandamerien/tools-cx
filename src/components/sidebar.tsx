import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
import {
  navigation,
  containsPath,
  type NavSection,
  type NavNode,
} from "@/config/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SidebarProps {
  /** Fecha o menu no mobile ao navegar */
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Busca */}
      <div className="px-3 pt-4 pb-2">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-background/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Search className="size-4 shrink-0" />
          <span>Buscar na documentação…</span>
          <kbd className="ml-auto hidden rounded border border-sidebar-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-0.5">
          {navigation.map((section) => (
            <SectionRow
              key={section.slug}
              section={section}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </nav>

      {/* Rodapé */}
      <div className="flex items-center justify-between border-t border-sidebar-border px-5 py-3 text-xs text-muted-foreground">
        <span>v0.1.0</span>
        <NavLink
          to="/insight"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn("transition-colors hover:text-brand", isActive && "text-brand")
          }
        >
          Sistema de Insight ↗
        </NavLink>
      </div>
    </div>
  );
}

/** Área de topo: emoji + label + count, expansível. */
function SectionRow({
  section,
  onNavigate,
}: {
  section: NavSection;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const active =
    pathname === section.href ||
    section.children.some((c) => containsPath(c, pathname));
  const [open, setOpen] = useState(active);
  const Icon = section.icon;

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md pr-2 transition-colors",
          active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60",
        )}
      >
        <ExpandToggle open={open} onToggle={() => setOpen((o) => !o)} />
        <NavLink
          to={section.href}
          end
          onClick={onNavigate}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 py-2 text-sm transition-colors",
            active
              ? "font-medium text-sidebar-accent-foreground"
              : "text-muted-foreground group-hover:text-sidebar-accent-foreground",
          )}
        >
          <Icon
            className={cn(
              "size-4 shrink-0 transition-colors",
              active ? "text-brand" : "text-muted-foreground group-hover:text-foreground",
            )}
            strokeWidth={2}
          />
          <span className="truncate">{section.label}</span>
        </NavLink>
        {section.count != null && <CountBadge value={section.count} />}
      </div>

      {open && section.children.length > 0 && (
        <ul className="mb-1 ml-[1.15rem] mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-1.5">
          {section.children.map((node) => (
            <TreeNode
              key={node.title}
              node={node}
              depth={1}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Nó recursivo: grupo (expansível) ou item (link). */
function TreeNode({
  node,
  depth,
  onNavigate,
}: {
  node: NavNode;
  depth: number;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const isGroup = !!node.children;
  const active = containsPath(node, pathname);
  const [open, setOpen] = useState(active);

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  // Item folha → link
  if (!isGroup) {
    return (
      <li>
        <NavLink
          to={node.href ?? "#"}
          end
          onClick={onNavigate}
          title={node.title}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-md py-1.5 pr-2 text-sm transition-colors",
              isActive
                ? "font-medium text-brand"
                : "text-muted-foreground hover:text-foreground",
            )
          }
          style={{ paddingLeft: `${depth * 0.5 + 0.25}rem` }}
        >
          <NodeIcon node={node} />
          <span className="truncate">{node.title}</span>
          {node.count != null && <CountBadge value={node.count} />}
        </NavLink>
      </li>
    );
  }

  // Grupo → cabeçalho expansível
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title={node.title}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-sm transition-colors",
          "text-muted-foreground hover:text-foreground",
        )}
        style={{ paddingLeft: `${depth * 0.5 - 0.25}rem` }}
      >
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
        <NodeIcon node={node} />
        <span className="truncate text-left">{node.title}</span>
        {node.count != null && <CountBadge value={node.count} />}
      </button>

      {open && node.children!.length > 0 && (
        <ul className="ml-[0.65rem] flex flex-col gap-0.5 border-l border-sidebar-border pl-1">
          {node.children!.map((child) => (
            <TreeNode
              key={child.title}
              node={child}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Ícone de linha (estilo MyIcons) do nó; cai pro emoji legado se não houver. */
function NodeIcon({ node }: { node: NavNode }) {
  if (node.icon) {
    const Icon = node.icon;
    return <Icon className="size-3.5 shrink-0" strokeWidth={2} />;
  }
  if (node.emoji) {
    return <span className="shrink-0 text-sm leading-none">{node.emoji}</span>;
  }
  return null;
}

function ExpandToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={open ? "Recolher" : "Expandir"}
      aria-expanded={open}
      onClick={onToggle}
      className="flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
    >
      <ChevronRight
        className={cn("size-3.5 transition-transform", open && "rotate-90")}
      />
    </button>
  );
}

function CountBadge({ value }: { value: number }) {
  return (
    <Badge
      variant="muted"
      className="ml-auto shrink-0 px-1.5 text-[10px] leading-none"
    >
      {value}
    </Badge>
  );
}
