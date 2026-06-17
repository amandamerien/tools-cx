import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Inbox,
  RotateCcw,
  DatabaseZap,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toneTokens, type Tone, type InsightState } from "./tokens";

/* ─────────────────────────── InsightCard ─────────────────────────────
   Shell: moldura pontilhada + card com borda esquerda no tom do risco,
   header de orquestração opcional, slot de estado e pills de tools. */
export interface InsightCardProps {
  tone?: Tone;
  state?: InsightState;
  /** nome da orquestração no header (ex.: CHECKOUT_ABANDONMENT) */
  orchestration?: string;
  /** tag/domínio à direita do header (ex.: Pagamentos) */
  domain?: string;
  tools?: string[];
  /** rodapé (normalmente uma RecommendationCTA) */
  footer?: ReactNode;
  /** mensagens dos estados especiais */
  emptyMessage?: string;
  errorMessage?: string;
  insufficientMessage?: string;
  onRetry?: () => void;
  children?: ReactNode;
  className?: string;
}

export function InsightCard({
  tone = "neutral",
  state = "default",
  orchestration,
  domain,
  tools,
  footer,
  emptyMessage,
  errorMessage,
  insufficientMessage,
  onRetry,
  children,
  className,
}: InsightCardProps) {
  const t = toneTokens[tone];
  return (
    <div>
      <div className="dot-frame p-4 sm:p-6">
        <div
          className={cn(
            "result-surface border-l-2",
            t.border.replace("border-", "border-l-"),
            className,
          )}
        >
          {orchestration && (
            <div className="flex items-center justify-between gap-3 border-b border-border bg-white/[0.02] px-5 py-3">
              <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.04em]">
                <span className={cn("size-[7px] rounded-full shadow-[0_0_8px_currentColor]", t.dot, t.text)} />
                <span className="font-semibold text-foreground">ClickMax</span>
                <span className="text-muted-foreground/80">· {orchestration}</span>
              </div>
              {domain && (
                <span className="shrink-0 rounded-full border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {domain}
                </span>
              )}
            </div>
          )}

          <div className="p-5 sm:p-6">
            {state === "default" && children}
            {state === "loading" && <InsightSkeleton />}
            {state === "empty" && (
              <InsightPlaceholder
                icon={Inbox}
                title="Nada por aqui"
                message={emptyMessage ?? "Nenhum resultado para os filtros atuais."}
              />
            )}
            {state === "insufficient" && (
              <InsightPlaceholder
                icon={DatabaseZap}
                title="Dados insuficientes"
                message={insufficientMessage ?? "Volume baixo demais para um insight confiável. Amplie a janela ou aguarde mais dados."}
              />
            )}
            {state === "error" && (
              <InsightPlaceholder
                tone="critical"
                icon={AlertCircle}
                title="Não foi possível carregar"
                message={errorMessage ?? "Erro ao consultar os dados."}
                action={
                  onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                    >
                      <RotateCcw className="size-3.5" /> Tentar de novo
                    </button>
                  )
                }
              />
            )}
          </div>

          {state === "default" && footer && (
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">{footer}</div>
          )}
        </div>
      </div>

      {tools && tools.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-xs text-muted-foreground">tools:</span>
          {tools.map((x) => (
            <span key={x} className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {x}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── MetricHeader ────────────────────────────
   Eyebrow (contexto) + título + badge de status opcional. */
export function MetricHeader({
  eyebrow,
  title,
  badge,
  className,
}: {
  eyebrow?: string;
  title?: ReactNode;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </p>
        )}
        {title && (
          <h3 className="mt-1 text-base font-semibold leading-tight text-foreground">
            {title}
          </h3>
        )}
      </div>
      {badge}
    </div>
  );
}

/* ─────────────────────────── MetricValue ─────────────────────────────
   Número principal em gradiente, com sufixo, tendência e legenda. */
export function MetricValue({
  value,
  suffix,
  caption,
  trend,
  size = "lg",
  className,
}: {
  value: ReactNode;
  suffix?: ReactNode;
  caption?: ReactNode;
  trend?: { value: string; direction: "up" | "down"; good?: boolean };
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = { md: "text-3xl", lg: "text-4xl", xl: "text-5xl sm:text-6xl" };
  const trendGood = trend?.good ?? trend?.direction === "up";
  return (
    <div className={className}>
      <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className={cn("gradient-text font-bold tracking-tight", sizes[size])}>
          {value}
        </span>
        {suffix && <span className="mb-1.5 text-sm text-muted-foreground">{suffix}</span>}
        {trend && (
          <span
            className={cn(
              "mb-1.5 inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs font-medium",
              trendGood
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-400",
            )}
          >
            {trend.direction === "up" ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {trend.value}
          </span>
        )}
      </div>
      {caption && <p className="mt-1 text-sm text-muted-foreground">{caption}</p>}
    </div>
  );
}

/* ─────────────────────────── StatusBadge ─────────────────────────────
   Pílula semântica. Use `dot` para um indicador minimalista. */
export function StatusBadge({
  tone = "neutral",
  children,
  icon,
  dot,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  icon?: boolean;
  dot?: boolean;
  className?: string;
}) {
  const t = toneTokens[tone];
  const Icon = t.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        t.border,
        t.bg,
        t.text,
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", t.dot)} />}
      {icon && <Icon className="size-3.5" />}
      {children}
    </span>
  );
}

/* ─────────────────────────── ProgressBar ─────────────────────────────
   Barra no tom do dado. brand usa o gradiente ciano→lime da marca. */
export function ProgressBar({
  value,
  tone = "brand",
  size = "md",
  className,
}: {
  value: number; // 0-100
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-3" };
  const t = toneTokens[tone];
  return (
    <div className={cn("overflow-hidden rounded-full bg-muted", heights[size], className)}>
      <div
        className={cn(
          "h-full rounded-full",
          tone === "brand" ? "gradient-brand" : cn("bg-gradient-to-r", t.bar),
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/* ─────────────────────────── AlertIndicator ──────────────────────────
   Callout: o que aconteceu + gravidade + (opcional) ação. */
export function AlertIndicator({
  tone = "attention",
  title,
  children,
  action,
  className,
}: {
  tone?: Tone;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const t = toneTokens[tone];
  const Icon = t.icon;
  return (
    <div className={cn("rounded-lg border p-3.5", t.border, t.bg, className)}>
      <div className={cn("flex items-center gap-2", t.text)}>
        <Icon className="size-4 shrink-0" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {children && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{children}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ─────────────────────────── ProductResultRow ───────────────────────
   Linha de item (produto/campanha/lead): identidade + métrica + badge. */
export function ProductResultRow({
  title,
  subtitle,
  value,
  meta,
  badge,
  alertTone,
  leading,
  onClick,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
  /** se definido, realça a linha (borda no tom) + ícone de alerta */
  alertTone?: Tone;
  leading?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const t = alertTone ? toneTokens[alertTone] : null;
  const Icon = t?.icon;
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card/40 p-3 transition-colors",
        t ? t.border : "border-border",
        onClick && "cursor-pointer hover:border-brand/40",
        className,
      )}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className={cn("size-4 shrink-0", t!.text)} />}
          <span className="truncate text-sm font-medium text-foreground">{title}</span>
          {badge}
        </div>
        {subtitle && <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      <div className="shrink-0 text-right">
        {value && <div className="text-sm font-medium tabular-nums text-foreground">{value}</div>}
        {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
      </div>
    </div>
  );
}

/* ─────────────────────────── RecommendationCTA ──────────────────────
   Ação principal. `primary` usa o gradiente da marca; senão segue o tom. */
export function RecommendationCTA({
  children,
  tone = "brand",
  variant = "primary",
  icon: Icon = ArrowRight,
  className,
  ...props
}: {
  tone?: Tone;
  variant?: "primary" | "soft";
  icon?: LucideIcon;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const t = toneTokens[tone];
  return (
    <button
      type="button"
      className={cn(
        "group/cta flex w-full items-center justify-center gap-2 rounded-[11px] px-4 py-3 text-sm font-semibold transition-colors duration-200",
        variant === "primary" && "bg-foreground text-background hover:bg-foreground/90 active:bg-foreground/80",
        variant === "soft" && cn("border", t.border, t.bg, t.text, "hover:brightness-110"),
        className,
      )}
      {...props}
    >
      {children}
      <Icon className="size-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
    </button>
  );
}

/* ─────────────────────────── Estados ────────────────────────────────── */
function InsightSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-32 rounded bg-muted" />
      <div className="mt-3 h-9 w-40 rounded bg-muted" />
      <div className="mt-2 h-3 w-48 rounded bg-muted" />
      <div className="mt-5 flex flex-col gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-muted/60" />
        ))}
      </div>
    </div>
  );
}

function InsightPlaceholder({
  icon: Icon,
  title,
  message,
  action,
  tone = "neutral",
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: ReactNode;
  tone?: Tone;
}) {
  const t = toneTokens[tone];
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className={cn("flex size-11 items-center justify-center rounded-full border", t.border, t.bg)}>
        <Icon className={cn("size-5", t.text)} />
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
