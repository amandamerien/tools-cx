import { MessageSquareQuote, Zap, Wrench, type LucideIcon } from "lucide-react";
import type { Playbook } from "@/data/playbooks-data";
import { MarkdownView } from "@/components/markdown";
import { getResultComponent } from "@/components/results";

/** Página de um playbook: barra do grupo + card de cabeçalho + corpo. */
export function PlaybookView({ playbook }: { playbook: Playbook }) {
  const Result = playbook.resultId
    ? getResultComponent(playbook.resultId)
    : undefined;
  return (
    <div>
      {/* Barra do grupo */}
      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="text-base leading-none">{playbook.groupEmoji}</span>
        <span className="font-medium text-foreground">{playbook.group}</span>
        {playbook.agent && (
          <span className="text-muted-foreground">· agente: {playbook.agent}</span>
        )}
      </div>

      {/* Card de cabeçalho */}
      <div className="rounded-xl border border-border bg-card/40 p-5">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {playbook.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {playbook.summary}
        </p>

        <hr className="my-4 border-border" />

        <div className="flex flex-col gap-5">
          <PillGroup label="Gatilhos" icon={Zap} count={playbook.gatilhos.length}>
            {playbook.gatilhos.map((g) => (
              <span
                key={g}
                className="inline-flex items-center rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                “{g}”
              </span>
            ))}
          </PillGroup>

          <PillGroup
            label="Ferramentas"
            icon={Wrench}
            count={playbook.ferramentas.length}
          >
            {playbook.ferramentas.map((f) => (
              <span
                key={f}
                className="inline-flex items-center rounded-full border border-brand/30 bg-brand-muted px-3 py-1 font-mono text-xs text-brand transition-colors hover:border-brand/50 hover:bg-brand/15"
              >
                {f}
              </span>
            ))}
          </PillGroup>
        </div>
      </div>

      {/* Corpo */}
      <div className="mt-8">
        <MarkdownView>{playbook.body}</MarkdownView>
      </div>

      {/* Perguntas que o usuário pode fazer */}
      {playbook.perguntas && playbook.perguntas.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-1 text-xl font-semibold tracking-tight text-foreground">
            Perguntas que o usuário pode fazer
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {playbook.perguntas.length} variações que disparam este playbook.
          </p>
          <div className="flex flex-col gap-2.5">
            {playbook.perguntas.map((q, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-border bg-card/40 px-4 py-3 transition-colors hover:border-brand/40"
              >
                <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-brand" />
                <p className="text-sm leading-relaxed text-foreground">“{q}”</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Componente de resultado */}
      {Result && (
        <div className="mt-10">
          <h2 className="mb-1 text-xl font-semibold tracking-tight text-foreground">
            Componente de resultado
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Como a saída deste playbook é renderizada para o usuário.
          </p>
          <Result />
        </div>
      )}
    </div>
  );
}

function PillGroup({
  label,
  icon: Icon,
  count,
  children,
}: {
  label: string;
  icon: LucideIcon;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <Icon className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        {count != null && (
          <span className="flex size-4 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
