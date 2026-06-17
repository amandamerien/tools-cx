/**
 * Sistema de Insight — tokens semânticos.
 * Um `tone` carrega o significado do dado (risco, oportunidade, prioridade),
 * não só a cor. Use os mesmos tons em checkout, pagamentos, vendas, funis, etc.
 */
import {
  CheckCircle2,
  AlertTriangle,
  OctagonAlert,
  Info,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type Tone =
  | "positive" // saudável / bom desempenho (verde)
  | "attention" // atenção / observar (amarelo)
  | "critical" // crítico / fricção / negativo (vermelho)
  | "neutral" // informação neutra (cinza)
  | "brand"; // oportunidade / destaque (lime)

/** Aliases convenientes do vocabulário do produto → tone canônico. */
export const toneAlias = {
  saudavel: "positive",
  positivo: "positive",
  atencao: "attention",
  critico: "critical",
  negativo: "critical",
  neutro: "neutral",
  oportunidade: "brand",
} as const satisfies Record<string, Tone>;

export interface ToneToken {
  /** texto na cor do tom */
  text: string;
  /** fundo tingido (chips, callouts) */
  bg: string;
  /** borda tingida */
  border: string;
  /** gradiente de barra (from/to do Tailwind) — brand usa a classe gradient-brand */
  bar: string;
  /** ponto/indicador sólido */
  dot: string;
  /** ícone semântico */
  icon: LucideIcon;
  /** rótulo padrão (PT-BR) */
  label: string;
}

export const toneTokens: Record<Tone, ToneToken> = {
  positive: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    bar: "from-emerald-400 to-emerald-300",
    dot: "bg-emerald-400",
    icon: CheckCircle2,
    label: "Saudável",
  },
  attention: {
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    bar: "from-amber-400 to-amber-300",
    dot: "bg-amber-400",
    icon: AlertTriangle,
    label: "Atenção",
  },
  critical: {
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    bar: "from-red-500 to-red-400",
    dot: "bg-red-400",
    icon: OctagonAlert,
    label: "Crítico",
  },
  neutral: {
    text: "text-muted-foreground",
    bg: "bg-muted/50",
    border: "border-border",
    bar: "from-zinc-500 to-zinc-400",
    dot: "bg-muted-foreground",
    icon: Info,
    label: "Neutro",
  },
  brand: {
    text: "text-brand",
    bg: "bg-brand-muted",
    border: "border-brand/30",
    bar: "from-sky-400 to-lime-300", // fallback; o componente usa gradient-brand
    dot: "bg-brand",
    icon: Sparkles,
    label: "Oportunidade",
  },
};

/** Estados especiais do card (fora do fluxo de dados normal). */
export type InsightState =
  | "default"
  | "loading"
  | "empty"
  | "error"
  | "insufficient";
