import { Fragment, type ComponentType, type ReactNode } from "react";
import { ArrowRight, AlertTriangle, GraduationCap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Componentes de resultado — renderizam a SAÍDA de um playbook no estilo
 * "card de orquestração" (header CLICKMAX · TOOL, gradiente ciano→lime,
 * moldura pontilhada). Aqui: 5 variações visuais do mesmo resultado.
 * Dados ilustrativos (a spec proíbe hardcodar os números reais da /v10).
 */

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

interface Person {
  name: string;
  email: string;
  attempts: number;
  lastAttempt: string;
  totalAttemptedValue: number;
  lastProductName: string;
}

const people: Person[] = [
  { name: "Marina Alves", email: "marina.alves@gmail.com", attempts: 3, lastAttempt: "16/06 · 21h", totalAttemptedValue: 197, lastProductName: "Mentoria Pro" },
  { name: "Rafael Souza", email: "rafael.souza@hotmail.com", attempts: 1, lastAttempt: "16/06 · 20h", totalAttemptedValue: 497, lastProductName: "Imersão Vendas" },
  { name: "Beatriz Lima", email: "bia.lima@gmail.com", attempts: 2, lastAttempt: "15/06 · 23h", totalAttemptedValue: 97, lastProductName: "Ebook Tráfego" },
  { name: "Diego Martins", email: "diego.m@outlook.com", attempts: 4, lastAttempt: "15/06 · 19h", totalAttemptedValue: 1297, lastProductName: "Programa Anual" },
  { name: "Camila Rocha", email: "camila.rocha@gmail.com", attempts: 1, lastAttempt: "15/06 · 22h", totalAttemptedValue: 297, lastProductName: "Curso Express" },
  { name: "Lucas Pereira", email: "lucas.pereira@gmail.com", attempts: 2, lastAttempt: "14/06 · 20h", totalAttemptedValue: 197, lastProductName: "Mentoria Pro" },
];

const stats = {
  resultCount: 47,
  failedRows: 58,
  distinct: 47,
  recoverable: 36,
  paidRemoved: 11,
  money: 9236,
  eveningPct: 83,
  endOfMonthPct: 71,
};

/** Moldura: dots + card com header de orquestração + tools pills. */
function ResultFrame({
  children,
  orchestration = "CARD_DECLINED_RECOVERY",
  tag = "Pagamentos",
  tools = ["painel_minhas_vendas", "pergunta", "executar"],
}: {
  children: ReactNode;
  orchestration?: string;
  tag?: string;
  tools?: string[];
}) {
  return (
    <div>
      <div className="dot-frame p-4 sm:p-6">
        <div className="result-surface">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-white/[0.02] px-5 py-3">
            <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.04em]">
              <span className="size-[7px] rounded-full bg-brand shadow-[0_0_8px] shadow-brand/70" />
              <span className="font-semibold text-foreground">ClickMax</span>
              <span className="text-muted-foreground/80">· {orchestration}</span>
            </div>
            <span className="shrink-0 rounded-full border border-border bg-muted/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {tag}
            </span>
          </div>
          <div className="p-5 sm:p-6">{children}</div>
        </div>
      </div>
      {tools.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 px-1.5">
          <span className="text-[11px] text-muted-foreground/70">tools</span>
          {tools.map((t) => (
            <span
              key={t}
              className="rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Premise() {
  return (
    <p className="text-xs italic leading-relaxed text-muted-foreground">
      “Tentativas de cartão recusadas (refused/failed), últimos 7 dias,
      excluindo quem comprou depois.”
    </p>
  );
}

function GradientCTA({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="group/cta mt-6 flex w-full items-center justify-center gap-2 rounded-[11px] bg-foreground px-4 py-3 text-sm font-semibold text-background transition-colors duration-200 hover:bg-foreground/90 active:bg-foreground/80"
    >
      {label}
      <ArrowRight className="size-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
    </button>
  );
}

/* ── Variação 1 — Lista ─────────────────────────────────────────────── */
function V1List() {
  const more = stats.resultCount - people.length;
  return (
    <ResultFrame>
      <Premise />
      <div className="mt-3 flex items-end gap-2">
        <span className="gradient-text text-5xl font-bold tracking-tight">47</span>
        <span className="mb-1.5 text-lg font-medium text-foreground">pessoas</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{BRL(stats.money)}</span> em
        tentativas · {stats.paidRemoved} já compraram depois (removidos)
      </p>
      <div className="mt-5 rounded-lg border border-border bg-card/40 p-3.5">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Limite estourado</span>
          <span className="font-mono text-brand">{stats.eveningPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="gradient-brand h-full rounded-full" style={{ width: `${stats.eveningPct}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          tentaram depois das 18h no fim do mês — recuperar via Pix, não retry de cartão.
        </p>
      </div>
      <ul className="mt-4 flex flex-col gap-px">
        {people.slice(0, 5).map((p) => (
          <li key={p.email} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {initials(p.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
              <div className="truncate text-xs text-muted-foreground">{p.email} · {p.lastProductName}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-medium tabular-nums text-foreground">{BRL(p.totalAttemptedValue)}</div>
              <div className="text-xs text-muted-foreground">{p.attempts} tent. · {p.lastAttempt}</div>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="mt-1 px-2 text-sm font-medium text-brand hover:underline">
        + {more} pessoas
      </button>
      <GradientCTA label="Recuperar via Pix · opt-in" />
    </ResultFrame>
  );
}

/* ── Variação 2 — Métrica (KPI) ─────────────────────────────────────── */
function V2Metric() {
  const rows = [
    { label: "À noite (após 18h)", pct: stats.eveningPct },
    { label: "Fim do mês (após dia 25)", pct: stats.endOfMonthPct },
  ];
  return (
    <ResultFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Pessoas recuperáveis · últimos 7 dias
      </p>
      <div className="mt-2 flex items-end gap-3">
        <span className="gradient-text text-6xl font-bold tracking-tight">47</span>
        <span className="mb-2 text-sm text-muted-foreground">
          {BRL(stats.money)} em<br />tentativas
        </span>
      </div>
      <div className="mt-5 flex flex-col gap-4">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-foreground">{r.label}</span>
              <span className="font-mono text-brand">{r.pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="gradient-brand h-full rounded-full" style={{ width: `${r.pct}%` }} />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">Já compraram depois (removidos)</span>
          <span className="font-medium tabular-nums text-foreground">{stats.paidRemoved}</span>
        </div>
      </div>
      <GradientCTA label="Ver detalhamento da coorte" />
    </ResultFrame>
  );
}

/* ── Variação 3 — Funil ─────────────────────────────────────────────── */
function V3Funnel() {
  const steps = [
    { label: "Tentativas falhas", value: stats.failedRows, pct: 100 },
    { label: "Pessoas distintas", value: stats.distinct, pct: 81 },
    { label: "Recuperáveis", value: stats.recoverable, pct: 62 },
  ];
  return (
    <ResultFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Funil de recuperação · 7 dias
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {steps.map((s) => (
          <div key={s.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{s.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {s.value} · {s.pct}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className="gradient-brand h-full rounded-full" style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        ↳ maior queda: pessoas → recuperáveis ({stats.paidRemoved} já compraram
        depois e saíram da lista)
      </p>
      <GradientCTA label="Ver os 36 recuperáveis" />
    </ResultFrame>
  );
}

/* ── Variação 4 — Tabela ────────────────────────────────────────────── */
function V4Table() {
  return (
    <ResultFrame>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="gradient-text text-2xl font-bold">47 pessoas</span>
        <span className="text-xs text-muted-foreground">
          {BRL(stats.money)} · {stats.paidRemoved} removidos
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Pessoa</th>
              <th className="px-3 py-2 text-center font-medium">Tent.</th>
              <th className="px-3 py-2 text-right font-medium">Valor</th>
              <th className="px-3 py-2 text-right font-medium">Última</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.email} className="border-b border-border last:border-0 hover:bg-accent/40">
                <td className="px-3 py-2">
                  <div className="font-medium text-foreground">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.email}</div>
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">{p.attempts}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{BRL(p.totalAttemptedValue)}</td>
                <td className="px-3 py-2 text-right text-xs text-muted-foreground">{p.lastAttempt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <GradientCTA label="Exportar coorte · opt-in" />
    </ResultFrame>
  );
}

/* ── Variação 5 — Grid de cards ─────────────────────────────────────── */
function V5Grid() {
  return (
    <ResultFrame>
      <div className="mb-4 flex items-baseline gap-2">
        <span className="gradient-text text-2xl font-bold">47 pessoas</span>
        <span className="text-xs text-muted-foreground">recuperáveis · {BRL(stats.money)}</span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {people.map((p) => (
          <div key={p.email} className="rounded-xl border border-border bg-card/40 p-3 transition-colors hover:border-brand/40">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {initials(p.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                <div className="truncate text-xs text-muted-foreground">{p.email}</div>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="rounded-md border border-brand/30 bg-brand-muted px-1.5 py-0.5 font-mono text-xs text-brand">
                {BRL(p.totalAttemptedValue)}
              </span>
              <span className="text-xs text-muted-foreground">
                {p.attempts} tent. · {p.lastAttempt}
              </span>
            </div>
          </div>
        ))}
      </div>
      <GradientCTA label="Recuperar via Pix · opt-in" />
    </ResultFrame>
  );
}

function Variation({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex size-5 items-center justify-center rounded-md border border-border bg-muted/50 font-mono text-[11px] tabular-nums text-muted-foreground">
          {n}
        </span>
        <span className="text-sm font-medium tracking-tight text-foreground">{title}</span>
        <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </div>
      {children}
    </div>
  );
}

/** card-declined-recovery-list → 5 variações visuais para comparar. */
function CardDeclinedRecoveryResult() {
  return (
    <div className="flex flex-col gap-9">
      <Variation n={1} title="Lista"><V1List /></Variation>
      <Variation n={2} title="Métrica (KPI)"><V2Metric /></Variation>
      <Variation n={3} title="Funil"><V3Funnel /></Variation>
      <Variation n={4} title="Tabela"><V4Table /></Variation>
      <Variation n={5} title="Grid de cards"><V5Grid /></Variation>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   pending-pix-boleto-by-day — saída em 4 faixas de idade, canal por faixa
   ════════════════════════════════════════════════════════════════════════ */

const channelMeta: Record<string, { label: string; chip: string; bar: string }> = {
  email: { label: "E-mail", chip: "border-sky-500/30 bg-sky-500/10 text-sky-400", bar: "from-sky-400 to-sky-300" },
  whatsapp: { label: "WhatsApp", chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400", bar: "from-emerald-400 to-emerald-300" },
  ligacao: { label: "Ligação", chip: "border-amber-500/30 bg-amber-500/10 text-amber-400", bar: "from-amber-400 to-amber-300" },
  comercial: { label: "Comercial", chip: "border-violet-500/30 bg-violet-500/10 text-violet-400", bar: "from-violet-400 to-violet-300" },
};

const bandLabel: Record<string, string> = {
  "<1d": "menos de 1 dia",
  "1-2d": "1 a 2 dias",
  "2-3d": "2 a 3 dias",
  "3d+": "3 dias ou mais",
};

interface Lead {
  name: string;
  email: string;
  method: string;
  totalPendingValue: number;
  age: string;
}
interface Band {
  band: string;
  channel: keyof typeof channelMeta;
  leadCount: number;
  totalPendingValue: number;
  hiddenCount: number;
  leads: Lead[];
}

const boletoBands: Band[] = [
  { band: "<1d", channel: "email", leadCount: 14, totalPendingValue: 3940, hiddenCount: 11, leads: [
    { name: "Marina Alves", email: "marina.alves@gmail.com", method: "boleto", totalPendingValue: 197, age: "há 4h" },
    { name: "Rafael Souza", email: "rafael.souza@hotmail.com", method: "pix", totalPendingValue: 497, age: "há 9h" },
    { name: "Beatriz Lima", email: "bia.lima@gmail.com", method: "boleto", totalPendingValue: 97, age: "há 18h" },
  ]},
  { band: "1-2d", channel: "whatsapp", leadCount: 18, totalPendingValue: 4108, hiddenCount: 15, leads: [
    { name: "Diego Martins", email: "diego.m@outlook.com", method: "pix", totalPendingValue: 1297, age: "há 1d" },
    { name: "Camila Rocha", email: "camila.rocha@gmail.com", method: "boleto", totalPendingValue: 297, age: "há 2d" },
    { name: "Lucas Pereira", email: "lucas.pereira@gmail.com", method: "pix", totalPendingValue: 197, age: "há 2d" },
  ]},
  { band: "2-3d", channel: "ligacao", leadCount: 11, totalPendingValue: 2860, hiddenCount: 9, leads: [
    { name: "Fernanda Dias", email: "fe.dias@gmail.com", method: "boleto", totalPendingValue: 497, age: "há 2d" },
    { name: "Bruno Costa", email: "bruno.costa@gmail.com", method: "pix", totalPendingValue: 297, age: "há 3d" },
  ]},
  { band: "3d+", channel: "comercial", leadCount: 9, totalPendingValue: 3912, hiddenCount: 7, leads: [
    { name: "Patrícia Gomes", email: "paty.gomes@gmail.com", method: "boleto", totalPendingValue: 1297, age: "há 5d" },
    { name: "André Luiz", email: "andre.luiz@hotmail.com", method: "boleto", totalPendingValue: 697, age: "há 8d" },
  ]},
];

const boletoTools = ["painel_minhas_vendas", "lista_de_atividades_do_sistema", "pergunta", "executar"];

function BoletoFrame({ children }: { children: ReactNode }) {
  return (
    <ResultFrame orchestration="PENDING_PIX_BOLETO_BY_DAY" tools={boletoTools}>
      {children}
    </ResultFrame>
  );
}

function BoletoPremise() {
  return (
    <p className="text-xs italic leading-relaxed text-muted-foreground">
      “Pix/boleto em pending dos últimos 30 dias, separados pela idade da
      cobrança mais recente de cada pessoa.”
    </p>
  );
}

function ChannelChip({ channel }: { channel: keyof typeof channelMeta }) {
  const ch = channelMeta[channel];
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", ch.chip)}>
      {ch.label}
    </span>
  );
}

/* ── B1 — Faixas (blocos) ───────────────────────────────────────────── */
function BV1Bands() {
  return (
    <BoletoFrame>
      <BoletoPremise />
      <div className="mt-3 flex flex-wrap items-end gap-x-2">
        <span className="gradient-text text-4xl font-bold tracking-tight">52</span>
        <span className="mb-1 text-base font-medium text-foreground">
          pessoas · {BRL(14820)} em aberto
        </span>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {boletoBands.map((b) => (
          <div key={b.band} className="rounded-lg border border-border bg-card/40 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{b.band}</span>
                <span className="text-sm text-muted-foreground">{bandLabel[b.band]}</span>
              </div>
              <ChannelChip channel={b.channel} />
            </div>
            <div className="mt-1.5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{b.leadCount} pessoas</span> · {BRL(b.totalPendingValue)}
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {b.leads.slice(0, 2).map((l) => (
                <li key={l.email} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{l.name} <span className="text-muted-foreground">· {l.method}</span></span>
                  <span className="text-muted-foreground">{BRL(l.totalPendingValue)} · {l.age}</span>
                </li>
              ))}
            </ul>
            {b.hiddenCount > 0 && <div className="mt-1.5 text-xs font-medium text-brand">+ {b.hiddenCount} pessoas</div>}
          </div>
        ))}
      </div>
      <GradientCTA label="Disparar sequências por faixa · opt-in" />
    </BoletoFrame>
  );
}

/* ── B2 — Kanban (4 colunas) ────────────────────────────────────────── */
function BV2Kanban() {
  return (
    <BoletoFrame>
      <BoletoPremise />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {boletoBands.map((b) => (
          <div key={b.band} className="rounded-lg border border-border bg-card/40 p-3">
            <div className="font-mono text-xs text-foreground">{b.band}</div>
            <div className="mt-1"><ChannelChip channel={b.channel} /></div>
            <div className="gradient-text mt-2 text-2xl font-bold">{b.leadCount}</div>
            <div className="text-[11px] text-muted-foreground">{BRL(b.totalPendingValue)}</div>
            <ul className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2">
              {b.leads.slice(0, 2).map((l) => (
                <li key={l.email} className="text-[11px]">
                  <div className="truncate text-foreground">{l.name}</div>
                  <div className="text-muted-foreground">{BRL(l.totalPendingValue)} · {l.age}</div>
                </li>
              ))}
              {b.hiddenCount > 0 && <li className="text-[11px] font-medium text-brand">+ {b.hiddenCount}</li>}
            </ul>
          </div>
        ))}
      </div>
      <GradientCTA label="Abrir board de recuperação" />
    </BoletoFrame>
  );
}

/* ── B3 — Barras por faixa ──────────────────────────────────────────── */
function BV3Bars() {
  const max = Math.max(...boletoBands.map((b) => b.leadCount));
  return (
    <BoletoFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Pendências por faixa · 30 dias
      </p>
      <div className="mt-2 flex items-end gap-2">
        <span className="gradient-text text-5xl font-bold tracking-tight">52</span>
        <span className="mb-1.5 text-sm text-muted-foreground">pessoas · {BRL(14820)}</span>
      </div>
      <div className="mt-5 flex flex-col gap-4">
        {boletoBands.map((b) => (
          <div key={b.band}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs text-foreground">{b.band}</span>
                <ChannelChip channel={b.channel} />
              </span>
              <span className="tabular-nums text-muted-foreground">{b.leadCount} · {BRL(b.totalPendingValue)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full bg-gradient-to-r", channelMeta[b.channel].bar)}
                style={{ width: `${(b.leadCount / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        ↳ pico em 1–2 dias (WhatsApp) — converte ~3× mais que e-mail nessa faixa.
      </p>
      <GradientCTA label="Ver leads por faixa" />
    </BoletoFrame>
  );
}

/* ── B4 — Métrica + breakdown ───────────────────────────────────────── */
function BV4Metric() {
  return (
    <BoletoFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Em aberto · 30 dias
      </p>
      <div className="mt-2">
        <span className="gradient-text text-5xl font-bold tracking-tight">{BRL(14820)}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">52 pessoas · 71 cobranças (pix + boleto)</p>
      <div className="mt-5 flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
        {boletoBands.map((b) => (
          <div key={b.band} className="flex items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-foreground">{b.band}</span>
              <ChannelChip channel={b.channel} />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm tabular-nums text-foreground">{b.leadCount} pessoas</span>
              <span className="w-20 text-right text-sm tabular-nums text-muted-foreground">{BRL(b.totalPendingValue)}</span>
            </div>
          </div>
        ))}
      </div>
      <GradientCTA label="Ver detalhamento por faixa" />
    </BoletoFrame>
  );
}

/* ── B5 — Tabela agrupada ───────────────────────────────────────────── */
function BV5Table() {
  return (
    <BoletoFrame>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="gradient-text text-2xl font-bold">52 pessoas</span>
        <span className="text-xs text-muted-foreground">{BRL(14820)} em aberto · 71 cobranças</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <tbody>
            {boletoBands.map((b) => (
              <Fragment key={b.band}>
                <tr className="bg-muted/40">
                  <td colSpan={3} className="px-3 py-1.5">
                    <span className="font-mono text-xs text-foreground">{b.band}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{bandLabel[b.band]} · {b.leadCount} · {BRL(b.totalPendingValue)}</span>
                    <span className="ml-2 inline-block align-middle"><ChannelChip channel={b.channel} /></span>
                  </td>
                </tr>
                {b.leads.map((l) => (
                  <tr key={l.email} className="border-b border-border last:border-0 hover:bg-accent/40">
                    <td className="px-3 py-1.5">
                      <div className="text-foreground">{l.name}</div>
                      <div className="text-xs text-muted-foreground">{l.email}</div>
                    </td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{l.method}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-foreground">{BRL(l.totalPendingValue)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <GradientCTA label="Exportar por faixa · opt-in" />
    </BoletoFrame>
  );
}

function BoletoPendingByDayResult() {
  return (
    <div className="flex flex-col gap-9">
      <Variation n={1} title="Faixas (blocos)"><BV1Bands /></Variation>
      <Variation n={2} title="Kanban (4 colunas)"><BV2Kanban /></Variation>
      <Variation n={3} title="Barras por faixa"><BV3Bars /></Variation>
      <Variation n={4} title="Métrica + breakdown"><BV4Metric /></Variation>
      <Variation n={5} title="Tabela agrupada"><BV5Table /></Variation>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   checkout-abandonment-by-product — leads por produto + alerta de fricção
   ════════════════════════════════════════════════════════════════════════ */

interface ProdLead {
  name: string;
  email: string;
  value: number;
  age: string;
}
interface Product {
  productName: string;
  leadCount: number;
  paidCount: number;
  ratio: number | null;
  frictionAlert: boolean;
  totalAttemptedValue: number;
  hiddenCount: number;
  leads: ProdLead[];
}

const abandonProducts: Product[] = [
  { productName: "Mentoria Pro", leadCount: 52, paidCount: 48, ratio: 1.1, frictionAlert: false, totalAttemptedValue: 28044, hiddenCount: 50, leads: [
    { name: "Marina Alves", email: "marina.alves@gmail.com", value: 197, age: "há 3h" },
    { name: "Bruno Costa", email: "bruno.costa@gmail.com", value: 297, age: "há 1d" },
  ]},
  { productName: "Curso Express", leadCount: 44, paidCount: 49, ratio: 0.9, frictionAlert: false, totalAttemptedValue: 13068, hiddenCount: 42, leads: [
    { name: "Camila Rocha", email: "camila.rocha@gmail.com", value: 297, age: "há 5h" },
    { name: "Lucas Pereira", email: "lucas.pereira@gmail.com", value: 197, age: "há 2d" },
  ]},
  { productName: "Imersão Vendas", leadCount: 31, paidCount: 8, ratio: 3.9, frictionAlert: true, totalAttemptedValue: 15407, hiddenCount: 29, leads: [
    { name: "Rafael Souza", email: "rafael.souza@hotmail.com", value: 497, age: "há 8h" },
    { name: "Fernanda Dias", email: "fe.dias@gmail.com", value: 497, age: "há 1d" },
  ]},
  { productName: "Ebook Tráfego", leadCount: 29, paidCount: 33, ratio: 0.9, frictionAlert: false, totalAttemptedValue: 6807, hiddenCount: 27, leads: [
    { name: "Beatriz Lima", email: "bia.lima@gmail.com", value: 97, age: "há 4h" },
    { name: "André Luiz", email: "andre.luiz@hotmail.com", value: 97, age: "há 3d" },
  ]},
  { productName: "Programa Anual", leadCount: 28, paidCount: 9, ratio: 3.1, frictionAlert: true, totalAttemptedValue: 36372, hiddenCount: 26, leads: [
    { name: "Diego Martins", email: "diego.m@outlook.com", value: 1297, age: "há 6h" },
    { name: "Patrícia Gomes", email: "paty.gomes@gmail.com", value: 1297, age: "há 2d" },
  ]},
];

const abandonTools = ["painel_minhas_vendas", "leads_search", "leads_produtos_comuns", "executar"];

function AbandonFrame({ children }: { children: ReactNode }) {
  return (
    <ResultFrame orchestration="CHECKOUT_ABANDONMENT_BY_PRODUCT" tools={abandonTools}>
      {children}
    </ResultFrame>
  );
}

function AbandonPremise() {
  return (
    <p className="text-xs italic leading-relaxed text-muted-foreground">
      “Leads em abandoned_cart com tentativa de pagamento nos últimos 30 dias,
      agrupados pelo produto da última tentativa.”
    </p>
  );
}

function RatioChip({ p }: { p: Product }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums",
        p.frictionAlert
          ? "border-red-500/30 bg-red-500/10 text-red-400"
          : "border-border bg-muted/60 text-muted-foreground",
      )}
    >
      {p.ratio != null ? `${p.ratio}× aband./venda` : "sem venda"}
    </span>
  );
}

/* ── A1 — Blocos por produto ────────────────────────────────────────── */
function AV1Blocks() {
  return (
    <AbandonFrame>
      <AbandonPremise />
      <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className="gradient-text text-4xl font-bold tracking-tight">184</span>
        <span className="mb-1 text-base font-medium text-foreground">pessoas · {BRL(99698)} · 5 produtos</span>
        <span className="mb-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">2 com fricção</span>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {abandonProducts.map((p) => (
          <div key={p.productName} className={cn("rounded-lg border bg-card/40 p-3.5", p.frictionAlert ? "border-red-500/30" : "border-border")}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                {p.frictionAlert && <AlertTriangle className="size-4 text-red-400" />}
                {p.productName}
              </span>
              <RatioChip p={p} />
            </div>
            <div className="mt-1.5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{p.leadCount} leads</span> · {p.paidCount} pagas · {BRL(p.totalAttemptedValue)}
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {p.leads.slice(0, 2).map((l) => (
                <li key={l.email} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{l.name}</span>
                  <span className="text-muted-foreground">{BRL(l.value)} · {l.age}</span>
                </li>
              ))}
            </ul>
            {p.hiddenCount > 0 && <div className="mt-1.5 text-xs font-medium text-brand">+ {p.hiddenCount} leads</div>}
          </div>
        ))}
      </div>
      <GradientCTA label="Auditar checkout dos produtos com fricção" />
    </AbandonFrame>
  );
}

/* ── A2 — Alerta de fricção (hero) ──────────────────────────────────── */
function AV2Friction() {
  const friction = abandonProducts.filter((p) => p.frictionAlert).sort((a, b) => (b.ratio || 0) - (a.ratio || 0));
  const max = Math.max(...abandonProducts.map((p) => p.leadCount));
  return (
    <AbandonFrame>
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="size-4" />
          <span className="text-sm font-semibold">{friction.length} produtos com fricção no checkout</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Antes de recuperar esses leads, vale auditar o checkout — recuperar gente
          pra um checkout quebrado queima a melhor lista do mês.
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-4">
        {friction.map((p) => (
          <div key={p.productName}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{p.productName}</span>
              <span className="font-mono text-xs text-red-400">{p.ratio}× aband./venda</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400" style={{ width: `${(p.leadCount / max) * 100}%` }} />
              </div>
              <span className="tabular-nums">{p.leadCount} aband. · {p.paidCount} pagas</span>
            </div>
          </div>
        ))}
      </div>
      <GradientCTA label="Ver leads dos produtos com fricção" />
    </AbandonFrame>
  );
}

/* ── A3 — Barras abandono × venda ───────────────────────────────────── */
function AV3Bars() {
  const max = Math.max(...abandonProducts.flatMap((p) => [p.leadCount, p.paidCount]));
  return (
    <AbandonFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Abandono × venda paga · por produto
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {abandonProducts.map((p) => (
          <div key={p.productName}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                {p.frictionAlert && <AlertTriangle className="size-3.5 text-red-400" />}
                {p.productName}
              </span>
              <RatioChip p={p} />
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-16 text-right text-muted-foreground">abandono</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full bg-gradient-to-r", p.frictionAlert ? "from-red-500 to-red-400" : "from-amber-400 to-amber-300")} style={{ width: `${(p.leadCount / max) * 100}%` }} />
              </div>
              <span className="w-6 tabular-nums text-muted-foreground">{p.leadCount}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px]">
              <span className="w-16 text-right text-muted-foreground">paga</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="gradient-brand h-full rounded-full" style={{ width: `${(p.paidCount / max) * 100}%` }} />
              </div>
              <span className="w-6 tabular-nums text-muted-foreground">{p.paidCount}</span>
            </div>
          </div>
        ))}
      </div>
      <GradientCTA label="Ver leads por produto" />
    </AbandonFrame>
  );
}

/* ── A4 — Tabela ────────────────────────────────────────────────────── */
function AV4Table() {
  return (
    <AbandonFrame>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="gradient-text text-2xl font-bold">184 pessoas</span>
        <span className="text-xs text-muted-foreground">{BRL(99698)} · 5 produtos · 2 com fricção</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Produto</th>
              <th className="px-3 py-2 text-center font-medium">Leads</th>
              <th className="px-3 py-2 text-center font-medium">Pagas</th>
              <th className="px-3 py-2 text-center font-medium">Razão</th>
              <th className="px-3 py-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {abandonProducts.map((p) => (
              <tr key={p.productName} className={cn("border-b border-border last:border-0", p.frictionAlert && "bg-red-500/5")}>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    {p.frictionAlert && <AlertTriangle className="size-3.5 text-red-400" />}
                    {p.productName}
                  </span>
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-foreground">{p.leadCount}</td>
                <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">{p.paidCount}</td>
                <td className="px-3 py-2 text-center">
                  <span className={cn("font-mono text-xs", p.frictionAlert ? "text-red-400" : "text-muted-foreground")}>{p.ratio}×</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{BRL(p.totalAttemptedValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <GradientCTA label="Exportar por produto · opt-in" />
    </AbandonFrame>
  );
}

/* ── A5 — Métrica + ranking ─────────────────────────────────────────── */
function AV5Metric() {
  const max = Math.max(...abandonProducts.map((p) => p.leadCount));
  return (
    <AbandonFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Abandono no checkout · 30 dias
      </p>
      <div className="mt-2">
        <span className="gradient-text text-5xl font-bold tracking-tight">{BRL(99698)}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        184 pessoas em 5 produtos · <span className="text-red-400">2 com fricção</span>
      </p>
      <div className="mt-5 flex flex-col gap-3.5">
        {abandonProducts.map((p) => (
          <div key={p.productName}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-foreground">
                {p.frictionAlert && <AlertTriangle className="size-3.5 text-red-400" />}
                {p.productName}
              </span>
              <span className="flex items-center gap-2">
                <RatioChip p={p} />
                <span className="tabular-nums text-muted-foreground">{p.leadCount}</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", p.frictionAlert ? "bg-gradient-to-r from-red-500 to-red-400" : "gradient-brand")} style={{ width: `${(p.leadCount / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <GradientCTA label="Ver detalhamento por produto" />
    </AbandonFrame>
  );
}

function CheckoutAbandonmentResult() {
  return (
    <div className="flex flex-col gap-9">
      <Variation n={1} title="Blocos por produto"><AV1Blocks /></Variation>
      <Variation n={2} title="Alerta de fricção (hero)"><AV2Friction /></Variation>
      <Variation n={3} title="Barras abandono × venda"><AV3Bars /></Variation>
      <Variation n={4} title="Tabela"><AV4Table /></Variation>
      <Variation n={5} title="Métrica + ranking"><AV5Metric /></Variation>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   canceled-purchase-not-returned — coorte por motivo de cancelamento
   ════════════════════════════════════════════════════════════════════════ */

const groupMeta: Record<string, { chip: string; bar: string; support?: boolean }> = {
  preco: { chip: "border-amber-500/30 bg-amber-500/10 text-amber-400", bar: "from-amber-400 to-amber-300" },
  expectativa: { chip: "border-sky-500/30 bg-sky-500/10 text-sky-400", bar: "from-sky-400 to-sky-300" },
  timing: { chip: "border-violet-500/30 bg-violet-500/10 text-violet-400", bar: "from-violet-400 to-violet-300" },
  acesso: { chip: "border-red-500/30 bg-red-500/10 text-red-400", bar: "from-red-500 to-red-400", support: true },
  sem_motivo: { chip: "border-border bg-muted/60 text-muted-foreground", bar: "from-zinc-500 to-zinc-400" },
};

interface CancelLead {
  name: string;
  email: string;
  value: number;
  product: string;
  age: string;
}
interface CancelGroup {
  group: keyof typeof groupMeta;
  label: string;
  suggestedPlay: string;
  leadCount: number;
  totalCanceledValue: number;
  hiddenCount: number;
  leads: CancelLead[];
}

const cancelGroups: CancelGroup[] = [
  { group: "preco", label: "Achou caro", suggestedPlay: "oferecer produto mais barato", leadCount: 8, totalCanceledValue: 9576, hiddenCount: 6, leads: [
    { name: "Diego Martins", email: "diego.m@outlook.com", value: 1297, product: "Programa Anual", age: "há 3d" },
    { name: "Patrícia Gomes", email: "paty.gomes@gmail.com", value: 997, product: "Mentoria Pro", age: "há 6d" },
  ]},
  { group: "expectativa", label: "Não era o que esperava", suggestedPlay: "oferecer produto adjacente", leadCount: 5, totalCanceledValue: 3485, hiddenCount: 3, leads: [
    { name: "Rafael Souza", email: "rafael.souza@hotmail.com", value: 497, product: "Imersão Vendas", age: "há 2d" },
    { name: "Camila Rocha", email: "camila.rocha@gmail.com", value: 297, product: "Curso Express", age: "há 5d" },
  ]},
  { group: "timing", label: "Não era a hora", suggestedPlay: "silêncio de 21 dias e reabordar", leadCount: 4, totalCanceledValue: 2788, hiddenCount: 2, leads: [
    { name: "Lucas Pereira", email: "lucas.pereira@gmail.com", value: 697, product: "Programa Anual", age: "há 1d" },
    { name: "Bruno Costa", email: "bruno.costa@gmail.com", value: 397, product: "Mentoria Pro", age: "há 4d" },
  ]},
  { group: "acesso", label: "Problema de acesso", suggestedPlay: "encaminhar pro suporte — é bug, não desinteresse", leadCount: 3, totalCanceledValue: 2091, hiddenCount: 1, leads: [
    { name: "Fernanda Dias", email: "fe.dias@gmail.com", value: 697, product: "Curso Express", age: "há 2d" },
    { name: "André Luiz", email: "andre.luiz@hotmail.com", value: 497, product: "Ebook Tráfego", age: "há 7d" },
  ]},
  { group: "sem_motivo", label: "Sem motivo registrado / não mapeado", suggestedPlay: "CS liga pra entender antes de ofertar", leadCount: 4, totalCanceledValue: 5188, hiddenCount: 2, leads: [
    { name: "Marina Alves", email: "marina.alves@gmail.com", value: 1297, product: "Programa Anual", age: "há 1d" },
    { name: "Beatriz Lima", email: "bia.lima@gmail.com", value: 997, product: "Imersão Vendas", age: "há 3d" },
  ]},
];

const cancelTools = ["painel_minhas_vendas", "lista_de_assinaturas", "transacoes_obter", "executar"];

function CancelFrame({ children }: { children: ReactNode }) {
  return (
    <ResultFrame orchestration="CANCELED_PURCHASE_NOT_RETURNED" tools={cancelTools}>
      {children}
    </ResultFrame>
  );
}

function CancelPremise() {
  return (
    <p className="text-xs italic leading-relaxed text-muted-foreground">
      “Estornos (refunded) e chargebacks dos últimos 60 dias, excluindo quem
      voltou a comprar — agrupados por motivo.”
    </p>
  );
}

function PlayChip({ g }: { g: CancelGroup }) {
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", groupMeta[g.group].chip)}>
      {g.suggestedPlay}
    </span>
  );
}

/* ── X1 — Grupos por motivo ─────────────────────────────────────────── */
function XV1Groups() {
  return (
    <CancelFrame>
      <CancelPremise />
      <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className="gradient-text text-4xl font-bold tracking-tight">24</span>
        <span className="mb-1 text-base font-medium text-foreground">nunca voltaram · {BRL(23128)}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">31 compras canceladas · 7 já recompraram (removidos)</p>
      <div className="mt-5 flex flex-col gap-3">
        {cancelGroups.map((g) => {
          const m = groupMeta[g.group];
          return (
            <div key={g.group} className={cn("rounded-lg border bg-card/40 p-3.5", m.support ? "border-red-500/30" : "border-border")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  {m.support && <AlertTriangle className="size-4 text-red-400" />}
                  {g.label}
                </span>
                <PlayChip g={g} />
              </div>
              <div className="mt-1.5 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{g.leadCount} pessoas</span> · {BRL(g.totalCanceledValue)}
              </div>
              <ul className="mt-2 flex flex-col gap-1">
                {g.leads.slice(0, 2).map((l) => (
                  <li key={l.email} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{l.name} <span className="text-muted-foreground">· {l.product}</span></span>
                    <span className="text-muted-foreground">{BRL(l.value)} · {l.age}</span>
                  </li>
                ))}
              </ul>
              {g.hiddenCount > 0 && <div className="mt-1.5 text-xs font-medium text-brand">+ {g.hiddenCount} pessoas</div>}
            </div>
          );
        })}
      </div>
      <GradientCTA label="Disparar win-back por motivo · opt-in" />
    </CancelFrame>
  );
}

/* ── X2 — Funil + grupos ────────────────────────────────────────────── */
function XV2Funnel() {
  const steps = [
    { label: "Compras canceladas", value: 31, pct: 100 },
    { label: "Já recompraram (saem)", value: 7, pct: 23 },
    { label: "Resgate (não voltaram)", value: 24, pct: 77 },
  ];
  return (
    <CancelFrame>
      <CancelPremise />
      <div className="mt-4 flex flex-col gap-3">
        {steps.map((s) => (
          <div key={s.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{s.label}</span>
              <span className="tabular-nums text-muted-foreground">{s.value} · {s.pct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="gradient-brand h-full rounded-full" style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
        {cancelGroups.map((g) => (
          <div key={g.group} className="flex items-center justify-between gap-2 p-3">
            <span className="flex items-center gap-1.5 text-sm text-foreground">
              {groupMeta[g.group].support && <AlertTriangle className="size-3.5 text-red-400" />}
              {g.label}
            </span>
            <div className="flex items-center gap-2">
              <PlayChip g={g} />
              <span className="w-6 text-right text-sm tabular-nums text-muted-foreground">{g.leadCount}</span>
            </div>
          </div>
        ))}
      </div>
      <GradientCTA label="Ver leads por motivo" />
    </CancelFrame>
  );
}

/* ── X3 — Barras por motivo ─────────────────────────────────────────── */
function XV3Bars() {
  const max = Math.max(...cancelGroups.map((g) => g.leadCount));
  return (
    <CancelFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Resgate por motivo · 60 dias
      </p>
      <div className="mt-2 flex items-end gap-2">
        <span className="gradient-text text-5xl font-bold tracking-tight">24</span>
        <span className="mb-1.5 text-sm text-muted-foreground">pessoas · {BRL(23128)}</span>
      </div>
      <div className="mt-5 flex flex-col gap-4">
        {cancelGroups.map((g) => (
          <div key={g.group}>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                {groupMeta[g.group].support && <AlertTriangle className="size-3.5 text-red-400" />}
                {g.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{g.leadCount} · {BRL(g.totalCanceledValue)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full bg-gradient-to-r", groupMeta[g.group].bar)} style={{ width: `${(g.leadCount / max) * 100}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">▸ {g.suggestedPlay}</p>
          </div>
        ))}
      </div>
      <GradientCTA label="Ver leads por motivo" />
    </CancelFrame>
  );
}

/* ── X4 — Tabela agrupada ───────────────────────────────────────────── */
function XV4Table() {
  return (
    <CancelFrame>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="gradient-text text-2xl font-bold">24 pessoas</span>
        <span className="text-xs text-muted-foreground">{BRL(23128)} · 31 canceladas · 5 motivos</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <tbody>
            {cancelGroups.map((g) => (
              <Fragment key={g.group}>
                <tr className="bg-muted/40">
                  <td colSpan={2} className="px-3 py-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      {groupMeta[g.group].support && <AlertTriangle className="size-3.5 text-red-400" />}
                      <span className="font-medium text-foreground">{g.label}</span>
                      <span className="text-xs text-muted-foreground">· {g.leadCount} · {BRL(g.totalCanceledValue)}</span>
                      <PlayChip g={g} />
                    </span>
                  </td>
                </tr>
                {g.leads.map((l) => (
                  <tr key={l.email} className="border-b border-border last:border-0 hover:bg-accent/40">
                    <td className="px-3 py-1.5">
                      <div className="text-foreground">{l.name}</div>
                      <div className="text-xs text-muted-foreground">{l.email} · {l.product}</div>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-foreground">{BRL(l.value)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <GradientCTA label="Exportar por motivo · opt-in" />
    </CancelFrame>
  );
}

/* ── X5 — Métrica + ranking ─────────────────────────────────────────── */
function XV5Metric() {
  const max = Math.max(...cancelGroups.map((g) => g.leadCount));
  return (
    <CancelFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Valor estornado a resgatar · 60 dias
      </p>
      <div className="mt-2">
        <span className="gradient-text text-5xl font-bold tracking-tight">{BRL(23128)}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">24 pessoas · 5 motivos · 31 compras canceladas</p>
      <div className="mt-5 flex flex-col gap-3.5">
        {cancelGroups.map((g) => (
          <div key={g.group}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 text-foreground">
                {groupMeta[g.group].support && <AlertTriangle className="size-3.5 text-red-400" />}
                {g.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{g.leadCount}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full bg-gradient-to-r", groupMeta[g.group].bar)} style={{ width: `${(g.leadCount / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <GradientCTA label="Ver detalhamento por motivo" />
    </CancelFrame>
  );
}

function CanceledPurchaseResult() {
  return (
    <div className="flex flex-col gap-9">
      <Variation n={1} title="Grupos por motivo"><XV1Groups /></Variation>
      <Variation n={2} title="Funil + grupos"><XV2Funnel /></Variation>
      <Variation n={3} title="Barras por motivo"><XV3Bars /></Variation>
      <Variation n={4} title="Tabela agrupada"><XV4Table /></Variation>
      <Variation n={5} title="Métrica + ranking"><XV5Metric /></Variation>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   subscription-renewal-failed — silent churn por causa da falha (MRR em risco)
   ════════════════════════════════════════════════════════════════════════ */

const causeMeta: Record<string, { chip: string; bar: string; support?: boolean }> = {
  expirado: { chip: "border-sky-500/30 bg-sky-500/10 text-sky-400", bar: "from-sky-400 to-sky-300" },
  sem_saldo: { chip: "border-amber-500/30 bg-amber-500/10 text-amber-400", bar: "from-amber-400 to-amber-300" },
  bloqueado: { chip: "border-red-500/30 bg-red-500/10 text-red-400", bar: "from-red-500 to-red-400", support: true },
  desconhecido: { chip: "border-border bg-muted/60 text-muted-foreground", bar: "from-zinc-500 to-zinc-400" },
};

interface Sub {
  name: string;
  email: string;
  product: string;
  mrr: number;
  age: string;
  attempts: number;
}
interface CauseGroup {
  cause: keyof typeof causeMeta;
  label: string;
  suggestedPlay: string;
  count: number;
  mrrAtRisk: number;
  hiddenCount: number;
  subscriptions: Sub[];
}

const causeGroups: CauseGroup[] = [
  { cause: "expirado", label: "Cartão expirado", suggestedPlay: "fluxo de atualização de cartão — resolve quase sozinho", count: 9, mrrAtRisk: 1173, hiddenCount: 7, subscriptions: [
    { name: "Marina Alves", email: "marina.alves@gmail.com", product: "Clube Pro", mrr: 97, age: "há 2d", attempts: 3 },
    { name: "Diego Martins", email: "diego.m@outlook.com", product: "Mentoria Anual", mrr: 197, age: "há 4d", attempts: 2 },
  ]},
  { cause: "sem_saldo", label: "Sem saldo no momento", suggestedPlay: "reagendar a cobrança em 3-5 dias", count: 4, mrrAtRisk: 588, hiddenCount: 2, subscriptions: [
    { name: "Rafael Souza", email: "rafael.souza@hotmail.com", product: "Clube Pro", mrr: 97, age: "há 1d", attempts: 2 },
    { name: "Camila Rocha", email: "camila.rocha@gmail.com", product: "Plano Premium", mrr: 197, age: "há 3d", attempts: 1 },
  ]},
  { cause: "bloqueado", label: "Cartão bloqueado", suggestedPlay: "CS humano liga — não vira com e-mail", count: 2, mrrAtRisk: 394, hiddenCount: 0, subscriptions: [
    { name: "Lucas Pereira", email: "lucas.pereira@gmail.com", product: "Mentoria Anual", mrr: 297, age: "há 2d", attempts: 4 },
    { name: "Bruno Costa", email: "bruno.costa@gmail.com", product: "Clube Pro", mrr: 97, age: "há 5d", attempts: 3 },
  ]},
  { cause: "desconhecido", label: "Motivo não mapeado", suggestedPlay: "revisar o motivo do gateway antes de agir", count: 2, mrrAtRisk: 225, hiddenCount: 0, subscriptions: [
    { name: "Fernanda Dias", email: "fe.dias@gmail.com", product: "Plano Premium", mrr: 97, age: "há 1d", attempts: 1 },
    { name: "André Luiz", email: "andre.luiz@hotmail.com", product: "Clube Pro", mrr: 128, age: "há 6d", attempts: 2 },
  ]},
];

const subTools = ["painel_minhas_vendas", "lista_de_assinaturas", "assinaturas_obter", "executar"];

function SubFrame({ children }: { children: ReactNode }) {
  return (
    <ResultFrame orchestration="SUBSCRIPTION_RENEWAL_FAILED" tools={subTools}>
      {children}
    </ResultFrame>
  );
}

function SubPremise() {
  return (
    <p className="text-xs italic leading-relaxed text-muted-foreground">
      “Cobranças recorrentes com falha (refused/failed) dos últimos 35 dias em
      assinaturas ativas, excluindo as que recuperaram no retry.”
    </p>
  );
}

function CausePlayChip({ g }: { g: CauseGroup }) {
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", causeMeta[g.cause].chip)}>
      {g.suggestedPlay}
    </span>
  );
}

/* ── S1 — Grupos por causa ──────────────────────────────────────────── */
function SV1Groups() {
  return (
    <SubFrame>
      <SubPremise />
      <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className="gradient-text text-4xl font-bold tracking-tight">{BRL(2380)}</span>
        <span className="mb-1 text-base font-medium text-foreground">/mês em risco · 17 assinantes</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">≈ {BRL(28560)}/ano saindo em silêncio · 5 já recuperaram no retry (removidas)</p>
      <div className="mt-5 flex flex-col gap-3">
        {causeGroups.map((g) => {
          const m = causeMeta[g.cause];
          return (
            <div key={g.cause} className={cn("rounded-lg border bg-card/40 p-3.5", m.support ? "border-red-500/30" : "border-border")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  {m.support && <AlertTriangle className="size-4 text-red-400" />}
                  {g.label}
                </span>
                <CausePlayChip g={g} />
              </div>
              <div className="mt-1.5 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{g.count} assinaturas</span> · {BRL(g.mrrAtRisk)}/mês
              </div>
              <ul className="mt-2 flex flex-col gap-1">
                {g.subscriptions.slice(0, 2).map((s) => (
                  <li key={s.email} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{s.name} <span className="text-muted-foreground">· {s.product}</span></span>
                    <span className="text-muted-foreground">{BRL(s.mrr)}/mês · {s.attempts} retries · {s.age}</span>
                  </li>
                ))}
              </ul>
              {g.hiddenCount > 0 && <div className="mt-1.5 text-xs font-medium text-brand">+ {g.hiddenCount} assinaturas</div>}
            </div>
          );
        })}
      </div>
      <GradientCTA label="Atualizar cartão dos expirados · opt-in" />
    </SubFrame>
  );
}

/* ── S2 — Vazamento (MRR hero) ──────────────────────────────────────── */
function SV2Leak() {
  return (
    <SubFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        MRR vazando em silêncio · 35 dias
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
        <span className="gradient-text text-5xl font-bold tracking-tight">{BRL(2380)}</span>
        <span className="mb-1.5 text-sm text-muted-foreground">/mês · ≈ {BRL(28560)}/ano</span>
      </div>
      <div className="mt-3 rounded-lg border border-border bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
        17 assinantes ativos não foram cobrados. Na maioria <span className="text-foreground">não é a pessoa querendo cancelar — é o cartão que não passou.</span> Sem ação, viram churn em até 30 dias.
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {causeGroups.map((g) => (
          <div key={g.cause}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 text-foreground">
                {causeMeta[g.cause].support && <AlertTriangle className="size-3.5 text-red-400" />}
                {g.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{g.count} · {BRL(g.mrrAtRisk)}/mês</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full bg-gradient-to-r", causeMeta[g.cause].bar)} style={{ width: `${(g.mrrAtRisk / 1173) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <GradientCTA label="Ver assinaturas em risco" />
    </SubFrame>
  );
}

/* ── S3 — Barras por causa ──────────────────────────────────────────── */
function SV3Bars() {
  const max = Math.max(...causeGroups.map((g) => g.count));
  return (
    <SubFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Falhas de renovação por causa · 35 dias
      </p>
      <div className="mt-2 flex items-end gap-2">
        <span className="gradient-text text-5xl font-bold tracking-tight">17</span>
        <span className="mb-1.5 text-sm text-muted-foreground">assinaturas · {BRL(2380)}/mês</span>
      </div>
      <div className="mt-5 flex flex-col gap-4">
        {causeGroups.map((g) => (
          <div key={g.cause}>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                {causeMeta[g.cause].support && <AlertTriangle className="size-3.5 text-red-400" />}
                {g.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{g.count} · {BRL(g.mrrAtRisk)}/mês</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full bg-gradient-to-r", causeMeta[g.cause].bar)} style={{ width: `${(g.count / max) * 100}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">▸ {g.suggestedPlay}</p>
          </div>
        ))}
      </div>
      <GradientCTA label="Ver assinaturas por causa" />
    </SubFrame>
  );
}

/* ── S4 — Tabela agrupada ───────────────────────────────────────────── */
function SV4Table() {
  return (
    <SubFrame>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="gradient-text text-2xl font-bold">{BRL(2380)}/mês</span>
        <span className="text-xs text-muted-foreground">17 assinaturas · 4 causas · ≈ {BRL(28560)}/ano</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <tbody>
            {causeGroups.map((g) => (
              <Fragment key={g.cause}>
                <tr className="bg-muted/40">
                  <td colSpan={2} className="px-3 py-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      {causeMeta[g.cause].support && <AlertTriangle className="size-3.5 text-red-400" />}
                      <span className="font-medium text-foreground">{g.label}</span>
                      <span className="text-xs text-muted-foreground">· {g.count} · {BRL(g.mrrAtRisk)}/mês</span>
                      <CausePlayChip g={g} />
                    </span>
                  </td>
                </tr>
                {g.subscriptions.map((s) => (
                  <tr key={s.email} className="border-b border-border last:border-0 hover:bg-accent/40">
                    <td className="px-3 py-1.5">
                      <div className="text-foreground">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.email} · {s.product} · {s.attempts} retries</div>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-foreground">{BRL(s.mrr)}/mês</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <GradientCTA label="Exportar por causa · opt-in" />
    </SubFrame>
  );
}

/* ── S5 — Métrica + ranking ─────────────────────────────────────────── */
function SV5Metric() {
  const max = Math.max(...causeGroups.map((g) => g.mrrAtRisk));
  return (
    <SubFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Anualização do vazamento · projeção
      </p>
      <div className="mt-2">
        <span className="gradient-text text-5xl font-bold tracking-tight">{BRL(28560)}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">/ano se nada for feito · {BRL(2380)}/mês · 17 assinaturas</p>
      <div className="mt-5 flex flex-col gap-3.5">
        {causeGroups.map((g) => (
          <div key={g.cause}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 text-foreground">
                {causeMeta[g.cause].support && <AlertTriangle className="size-3.5 text-red-400" />}
                {g.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{BRL(g.mrrAtRisk)}/mês</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full bg-gradient-to-r", causeMeta[g.cause].bar)} style={{ width: `${(g.mrrAtRisk / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <GradientCTA label="Ver detalhamento por causa" />
    </SubFrame>
  );
}

function SubscriptionRenewalResult() {
  return (
    <div className="flex flex-col gap-9">
      <Variation n={1} title="Grupos por causa"><SV1Groups /></Variation>
      <Variation n={2} title="Vazamento (MRR hero)"><SV2Leak /></Variation>
      <Variation n={3} title="Barras por causa"><SV3Bars /></Variation>
      <Variation n={4} title="Tabela agrupada"><SV4Table /></Variation>
      <Variation n={5} title="Métrica + ranking"><SV5Metric /></Variation>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   low-cost-buyer-readiness — ranking de prontidão por 4 sinais de engajamento
   ════════════════════════════════════════════════════════════════════════ */

interface ReadyPerson {
  name: string;
  email: string;
  score: number;
  spent: number;
  purchases: number;
  signals: string[];
}

const readyPeople: ReadyPerson[] = [
  { name: "Marina Alves", email: "marina.alves@gmail.com", score: 0.94, spent: 197, purchases: 2, signals: ["curso 100%", "abre e-mails", "clicou em oferta", "ativo recentemente"] },
  { name: "Diego Martins", email: "diego.m@outlook.com", score: 0.88, spent: 297, purchases: 1, signals: ["curso 80%+", "abre e-mails", "ativo recentemente"] },
  { name: "Beatriz Lima", email: "bia.lima@gmail.com", score: 0.81, spent: 97, purchases: 3, signals: ["curso 100%", "abre e-mails", "ativo recentemente"] },
  { name: "Rafael Souza", email: "rafael.souza@hotmail.com", score: 0.76, spent: 497, purchases: 1, signals: ["curso 80%+", "clicou em oferta", "ativo recentemente"] },
  { name: "Camila Rocha", email: "camila.rocha@gmail.com", score: 0.69, spent: 197, purchases: 2, signals: ["abre e-mails", "clicou em oferta", "ativo recentemente"] },
  { name: "Lucas Pereira", email: "lucas.pereira@gmail.com", score: 0.62, spent: 197, purchases: 1, signals: ["curso 80%+", "abre e-mails"] },
];

const readyStats = { cohortSize: 73, excludedAlreadyTarget: 12, resultCount: 30, withoutLeadId: 4 };
const readyFormula = "0.35 curso · 0.25 aberturas · 0.2 cliques · 0.2 recência";
const readyTools = ["painel_minhas_vendas", "lista_de_produtos", "member_users_get_progress_by_lead", "executar"];

function signalChipClass(s: string) {
  if (s.includes("curso")) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (s.includes("e-mail")) return "border-sky-500/30 bg-sky-500/10 text-sky-400";
  if (s.includes("oferta")) return "border-violet-500/30 bg-violet-500/10 text-violet-400";
  if (s.includes("ativo")) return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  return "border-border bg-muted/60 text-muted-foreground";
}
function scoreClass(score: number) {
  if (score >= 0.8) return "text-brand";
  if (score >= 0.6) return "text-amber-400";
  return "text-muted-foreground";
}
function Signals({ signals }: { signals: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {signals.map((s) => (
        <span key={s} className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-medium", signalChipClass(s))}>
          {s}
        </span>
      ))}
    </div>
  );
}

function ReadyFrame({ children }: { children: ReactNode }) {
  return (
    <ResultFrame orchestration="LOW_COST_BUYER_READINESS" tools={readyTools}>
      {children}
    </ResultFrame>
  );
}

function ReadyHead() {
  return (
    <>
      <p className="text-xs italic leading-relaxed text-muted-foreground">
        “Compradores do produto de entrada nos últimos 90 dias que ainda não
        compraram o alvo, ranqueados por 4 sinais de prontidão.”
      </p>
      <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] text-muted-foreground">
        readiness = {readyFormula}
      </p>
    </>
  );
}

/* ── R1 — Ranking de prontidão ──────────────────────────────────────── */
function RV1Ranking() {
  return (
    <ReadyFrame>
      <ReadyHead />
      <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className="gradient-text text-4xl font-bold tracking-tight">30</span>
        <span className="mb-1 text-base font-medium text-foreground">prontos · de {readyStats.cohortSize} compradores</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{readyStats.excludedAlreadyTarget} já têm o alvo (fora) · {readyStats.withoutLeadId} sem leadId (não enriquecidos)</p>
      <ul className="mt-4 flex flex-col gap-2">
        {readyPeople.map((p, i) => (
          <li key={p.email} className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-2.5">
            <span className="w-5 shrink-0 text-center font-mono text-xs text-muted-foreground">{i + 1}</span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{initials(p.name)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">{p.name}</span>
                <span className={cn("font-mono text-xs font-semibold", scoreClass(p.score))}>{p.score.toFixed(2)}</span>
              </div>
              <div className="mt-1"><Signals signals={p.signals} /></div>
            </div>
            <span className="shrink-0 text-right text-xs text-muted-foreground">{p.purchases}× · {BRL(p.spent)}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="mt-1 px-2 text-sm font-medium text-brand hover:underline">+ 24 pessoas</button>
      <GradientCTA label="Criar campanha entrada → alvo · opt-in" />
    </ReadyFrame>
  );
}

/* ── R2 — Score + sinais (cards) ────────────────────────────────────── */
function RV2Cards() {
  return (
    <ReadyFrame>
      <ReadyHead />
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {readyPeople.map((p) => (
          <div key={p.email} className="rounded-xl border border-border bg-card/40 p-3">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{initials(p.name)}</span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.purchases}× · {BRL(p.spent)}</div>
                </div>
              </div>
              <span className={cn("font-mono text-lg font-bold", scoreClass(p.score))}>{p.score.toFixed(2)}</span>
            </div>
            <div className="mt-2.5"><Signals signals={p.signals} /></div>
          </div>
        ))}
      </div>
      <GradientCTA label="Taggear os prontos · opt-in" />
    </ReadyFrame>
  );
}

/* ── R3 — Termômetro (barras) ───────────────────────────────────────── */
function RV3Thermo() {
  return (
    <ReadyFrame>
      <ReadyHead />
      <div className="mt-4 flex flex-col gap-4">
        {readyPeople.map((p) => (
          <div key={p.email}>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium text-foreground">{p.name}</span>
              <span className={cn("shrink-0 font-mono text-xs font-semibold", scoreClass(p.score))}>{Math.round(p.score * 100)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="gradient-brand h-full rounded-full" style={{ width: `${p.score * 100}%` }} />
            </div>
            <div className="mt-1.5"><Signals signals={p.signals} /></div>
          </div>
        ))}
      </div>
      <GradientCTA label="Convidar top 30 pro webinar · opt-in" />
    </ReadyFrame>
  );
}

/* ── R4 — Tabela ────────────────────────────────────────────────────── */
const SIGNAL_COLS = [
  { key: "curso", label: "Curso" },
  { key: "e-mail", label: "E-mail" },
  { key: "oferta", label: "Oferta" },
  { key: "ativo", label: "Ativo" },
];
function RV4Table() {
  return (
    <ReadyFrame>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="gradient-text text-2xl font-bold">30 prontos</span>
        <span className="text-xs text-muted-foreground">de {readyStats.cohortSize} · {readyStats.excludedAlreadyTarget} já têm o alvo</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">Pessoa</th>
              {SIGNAL_COLS.map((c) => <th key={c.key} className="px-2 py-2 text-center font-medium">{c.label}</th>)}
              <th className="px-3 py-2 text-right font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {readyPeople.map((p) => (
              <tr key={p.email} className="border-b border-border last:border-0 hover:bg-accent/40">
                <td className="px-3 py-2">
                  <div className="font-medium text-foreground">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.purchases}× · {BRL(p.spent)}</div>
                </td>
                {SIGNAL_COLS.map((c) => (
                  <td key={c.key} className="px-2 py-2 text-center">
                    {p.signals.some((s) => s.includes(c.key))
                      ? <span className="text-brand">●</span>
                      : <span className="text-border">–</span>}
                  </td>
                ))}
                <td className={cn("px-3 py-2 text-right font-mono text-xs font-semibold", scoreClass(p.score))}>{p.score.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <GradientCTA label="Exportar prontos · opt-in" />
    </ReadyFrame>
  );
}

/* ── R5 — Funil + cenário de receita ────────────────────────────────── */
function RV5Funnel() {
  const steps = [
    { label: "Compradores de entrada (90d)", value: 73, pct: 100 },
    { label: "Ainda sem o alvo", value: 61, pct: 84 },
    { label: "Enriquecidos (top 50)", value: 50, pct: 68 },
    { label: "Prontos (top 30)", value: 30, pct: 41 },
  ];
  return (
    <ReadyFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Funil de prontidão · entrada → alvo
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {steps.map((s) => (
          <div key={s.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{s.label}</span>
              <span className="tabular-nums text-muted-foreground">{s.value} · {s.pct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="gradient-brand h-full rounded-full" style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-border bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
        Cenário (não promessa): <span className="text-foreground">30 prontos × preço do alvo × taxa que você validar</span>. Conversão histórica do seu workspace, nunca a ilustrativa.
      </div>
      <GradientCTA label="Marcar 1:1 com os top 3 · opt-in" />
    </ReadyFrame>
  );
}

function LowCostBuyerReadinessResult() {
  return (
    <div className="flex flex-col gap-9">
      <Variation n={1} title="Ranking de prontidão"><RV1Ranking /></Variation>
      <Variation n={2} title="Score + sinais (cards)"><RV2Cards /></Variation>
      <Variation n={3} title="Termômetro (barras)"><RV3Thermo /></Variation>
      <Variation n={4} title="Tabela de sinais"><RV4Table /></Variation>
      <Variation n={5} title="Funil + cenário"><RV5Funnel /></Variation>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   course-completer-no-recent-purchase — concluintes quentes pro próximo passo
   ════════════════════════════════════════════════════════════════════════ */

interface Completer {
  name: string;
  email: string;
  completedAgo: string;
  noBuyAgo: string;
}

const completers: Completer[] = [
  { name: "Marina Alves", email: "marina.alves@gmail.com", completedAgo: "há 2d", noBuyAgo: "2 dias" },
  { name: "Diego Martins", email: "diego.m@outlook.com", completedAgo: "há 3d", noBuyAgo: "3 dias" },
  { name: "Beatriz Lima", email: "bia.lima@gmail.com", completedAgo: "há 5d", noBuyAgo: "5 dias" },
  { name: "Rafael Souza", email: "rafael.souza@hotmail.com", completedAgo: "há 6d", noBuyAgo: "6 dias" },
  { name: "Camila Rocha", email: "camila.rocha@gmail.com", completedAgo: "há 8d", noBuyAgo: "8 dias" },
  { name: "Lucas Pereira", email: "lucas.pereira@gmail.com", completedAgo: "há 11d", noBuyAgo: "11 dias" },
];

const completerStats = { course: "Workshop de Lançamento", completersCount: 38, recentBuyersCount: 14, resultCount: 24 };
const completerTools = ["lista_de_atividades_do_sistema", "lista_de_conteudo", "painel_minhas_vendas", "executar"];

function CompleterFrame({ children }: { children: ReactNode }) {
  return (
    <ResultFrame orchestration="COURSE_COMPLETER_NO_RECENT_PURCHASE" tag="Membros" tools={completerTools}>
      {children}
    </ResultFrame>
  );
}

function CourseChip() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
      <GraduationCap className="size-3" />
      {completerStats.course}
    </span>
  );
}

/* ── C1 — Lista de concluintes ──────────────────────────────────────── */
function CC1List() {
  return (
    <CompleterFrame>
      <p className="text-xs italic leading-relaxed text-muted-foreground">
        “Alunos que concluíram o curso (qualquer data) e não compraram nada nos
        últimos 30 dias — quentes pro próximo passo.”
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className="gradient-text text-4xl font-bold tracking-tight">24</span>
        <span className="mb-1 text-base font-medium text-foreground">concluintes prontos</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <CourseChip />
        <span className="text-xs text-muted-foreground">de 38 concluintes · 14 já compraram (fora)</span>
      </div>
      <ul className="mt-4 flex flex-col gap-px">
        {completers.slice(0, 5).map((c) => (
          <li key={c.email} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{initials(c.name)}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{c.name}</div>
              <div className="truncate text-xs text-muted-foreground">{c.email}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-medium text-emerald-400">concluiu {c.completedAgo}</div>
              <div className="text-xs text-muted-foreground">sem comprar há {c.noBuyAgo}</div>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="mt-1 px-2 text-sm font-medium text-brand hover:underline">+ 19 concluintes</button>
      <GradientCTA label="Convidar pro webinar de transição · opt-in" />
    </CompleterFrame>
  );
}

/* ── C2 — Cards de pessoas ──────────────────────────────────────────── */
function CC2Cards() {
  return (
    <CompleterFrame>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="gradient-text text-2xl font-bold">24 concluintes</span>
        <CourseChip />
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {completers.map((c) => (
          <div key={c.email} className="rounded-xl border border-border bg-card/40 p-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{initials(c.name)}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{c.name}</div>
                <div className="truncate text-xs text-muted-foreground">{c.email}</div>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-400">concluiu {c.completedAgo}</span>
              <span className="text-xs text-muted-foreground">sem comprar há {c.noBuyAgo}</span>
            </div>
          </div>
        ))}
      </div>
      <GradientCTA label="Criar sequência de upsell · opt-in" />
    </CompleterFrame>
  );
}

/* ── C3 — Funil ─────────────────────────────────────────────────────── */
function CC3Funnel() {
  const steps = [
    { label: "Concluíram o curso", value: 38, pct: 100 },
    { label: "Já compraram (saem)", value: 14, pct: 37 },
    { label: "Prontos (sem compra)", value: 24, pct: 63 },
  ];
  return (
    <CompleterFrame>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Funil de upsell · conclusão → compra</span>
      </div>
      <div className="mt-3"><CourseChip /></div>
      <div className="mt-4 flex flex-col gap-3">
        {steps.map((s) => (
          <div key={s.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{s.label}</span>
              <span className="tabular-nums text-muted-foreground">{s.value} · {s.pct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="gradient-brand h-full rounded-full" style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">↳ 24 terminaram e não voltaram a comprar — o upsell mais barato e mais ignorado.</p>
      <GradientCTA label="Ver os 24 concluintes" />
    </CompleterFrame>
  );
}

/* ── C4 — Tabela ────────────────────────────────────────────────────── */
function CC4Table() {
  return (
    <CompleterFrame>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="gradient-text text-2xl font-bold">24 concluintes</span>
        <span className="text-xs text-muted-foreground">de 38 · 14 já compraram</span>
      </div>
      <div className="mb-3"><CourseChip /></div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Aluno</th>
              <th className="px-3 py-2 text-right font-medium">Concluiu</th>
              <th className="px-3 py-2 text-right font-medium">Sem comprar há</th>
            </tr>
          </thead>
          <tbody>
            {completers.map((c) => (
              <tr key={c.email} className="border-b border-border last:border-0 hover:bg-accent/40">
                <td className="px-3 py-2">
                  <div className="font-medium text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.email}</div>
                </td>
                <td className="px-3 py-2 text-right text-emerald-400">{c.completedAgo}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{c.noBuyAgo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <GradientCTA label="Exportar concluintes · opt-in" />
    </CompleterFrame>
  );
}

/* ── C5 — Métrica + curso ───────────────────────────────────────────── */
function CC5Metric() {
  return (
    <CompleterFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Concluintes sem upsell · curso</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="gradient-text text-5xl font-bold tracking-tight">24</span>
        <span className="mb-1.5 text-sm text-muted-foreground">de 38 concluintes</span>
      </div>
      <div className="mt-3"><CourseChip /></div>
      <div className="mt-5 flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
        {[
          { l: "Concluíram o curso", v: "38" },
          { l: "Compraram nos últimos 30d", v: "14" },
          { l: "Residual (prontos)", v: "24", hi: true },
        ].map((r) => (
          <div key={r.l} className="flex items-center justify-between p-3 text-sm">
            <span className="text-muted-foreground">{r.l}</span>
            <span className={cn("font-medium tabular-nums", r.hi ? "text-brand" : "text-foreground")}>{r.v}</span>
          </div>
        ))}
      </div>
      <GradientCTA label="Convidar pro próximo passo · opt-in" />
    </CompleterFrame>
  );
}

function CourseCompleterResult() {
  return (
    <div className="flex flex-col gap-9">
      <Variation n={1} title="Lista de concluintes"><CC1List /></Variation>
      <Variation n={2} title="Cards de pessoas"><CC2Cards /></Variation>
      <Variation n={3} title="Funil de upsell"><CC3Funnel /></Variation>
      <Variation n={4} title="Tabela"><CC4Table /></Variation>
      <Variation n={5} title="Métrica + curso"><CC5Metric /></Variation>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ticket-band-upsell-recommendation — compradores por perfil + produto/rota
   ════════════════════════════════════════════════════════════════════════ */

const clusterMeta: Record<string, { chip: string; bar: string; dist: string }> = {
  empresa: { chip: "border-violet-500/30 bg-violet-500/10 text-violet-400", bar: "from-violet-400 to-violet-300", dist: "bg-violet-500" },
  frequente: { chip: "border-amber-500/30 bg-amber-500/10 text-amber-400", bar: "from-amber-400 to-amber-300", dist: "bg-amber-500" },
  convicto: { chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400", bar: "from-emerald-400 to-emerald-300", dist: "bg-emerald-500" },
};

interface ClusterBuyer {
  name: string;
  email: string;
  purchases: number;
  spent: number;
}
interface Cluster {
  key: keyof typeof clusterMeta;
  label: string;
  action: string;
  product: string | null;
  count: number;
  buyers: ClusterBuyer[];
}

const clusters: Cluster[] = [
  { key: "empresa", label: "Perfil empresa", action: "rota 1:1 com vendedor sênior — quer implementação, não curso", product: "Mentoria 1:1 · R$ 4.997", count: 89, buyers: [
    { name: "Carlos Bauer", email: "carlos@agencia.com.br", purchases: 3, spent: 1491 },
    { name: "Ana Lima", email: "ana@criativa.co", purchases: 2, spent: 994 },
  ]},
  { key: "frequente", label: "Frequente", action: "gap de catálogo: criar Pacote Anual que empacote os baratos", product: null, count: 82, buyers: [
    { name: "Marina Alves", email: "marina.alves@gmail.com", purchases: 4, spent: 788 },
    { name: "Lucas Pereira", email: "lucas.pereira@gmail.com", purchases: 3, spent: 591 },
  ]},
  { key: "convicto", label: "Convicto", action: "oferta direta do produto-âncora da faixa alta", product: "Programa Anual · R$ 1.297", count: 47, buyers: [
    { name: "Diego Martins", email: "diego.m@outlook.com", purchases: 2, spent: 694 },
    { name: "Beatriz Lima", email: "bia.lima@gmail.com", purchases: 2, spent: 394 },
  ]},
];

const ticketStats = { cohortRawSize: 218, excludedAlreadyUpgraded: 34, setACount: 8, setBCount: 5 };
const ticketTotal = clusters.reduce((s, c) => s + c.count, 0);
const ticketTools = ["lista_de_produtos", "painel_minhas_vendas", "leads_search", "executar"];

function TicketFrame({ children }: { children: ReactNode }) {
  return (
    <ResultFrame orchestration="TICKET_BAND_UPSELL_RECOMMENDATION" tag="Vendas" tools={ticketTools}>
      {children}
    </ResultFrame>
  );
}

function TicketPremise() {
  return (
    <p className="text-xs italic leading-relaxed text-muted-foreground">
      “Compradores de R$ 100-500 que ainda não compraram nada de R$ 800-3.000,
      separados em 3 perfis por regras explícitas.”
    </p>
  );
}

function ClusterChip({ c }: { c: Cluster }) {
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", clusterMeta[c.key].chip)}>
      {c.label}
    </span>
  );
}

/* ── T1 — Grupos por perfil ─────────────────────────────────────────── */
function TB1Groups() {
  return (
    <TicketFrame>
      <TicketPremise />
      <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className="gradient-text text-4xl font-bold tracking-tight">218</span>
        <span className="mb-1 text-base font-medium text-foreground">prontos pra subir de ticket</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">3 perfis · 34 já subiram (fora) · regras explícitas (você pode discordar)</p>
      <div className="mt-5 flex flex-col gap-3">
        {clusters.map((c) => (
          <div key={c.key} className="rounded-lg border border-border bg-card/40 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <ClusterChip c={c} />
                <span className="text-sm font-medium text-foreground">{c.count} pessoas</span>
              </span>
              {c.product && <span className="font-mono text-[11px] text-muted-foreground">→ {c.product}</span>}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">▸ {c.action}</p>
            <ul className="mt-2 flex flex-col gap-1">
              {c.buyers.map((b) => (
                <li key={b.email} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{b.name} <span className="text-muted-foreground">· {b.email}</span></span>
                  <span className="text-muted-foreground">{b.purchases}× · {BRL(b.spent)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <GradientCTA label="Criar campanha por perfil · opt-in" />
    </TicketFrame>
  );
}

/* ── T2 — Cards por pessoa ──────────────────────────────────────────── */
function TB2Cards() {
  const flat = clusters.flatMap((c) => c.buyers.map((b) => ({ ...b, c })));
  return (
    <TicketFrame>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="gradient-text text-2xl font-bold">218 compradores</span>
        <span className="text-xs text-muted-foreground">prontos pra subir de ticket</span>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {flat.map((b) => (
          <div key={b.email} className="rounded-xl border border-border bg-card/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{initials(b.name)}</span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{b.name}</div>
                  <div className="text-[11px] text-muted-foreground">{b.purchases}× · {BRL(b.spent)}</div>
                </div>
              </div>
              <ClusterChip c={b.c} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">→ {b.c.product || b.c.action}</p>
          </div>
        ))}
      </div>
      <GradientCTA label="Materializar segmentos por perfil · opt-in" />
    </TicketFrame>
  );
}

/* ── T3 — Distribuição (clusters) ───────────────────────────────────── */
function TB3Dist() {
  return (
    <TicketFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Distribuição por perfil · faixa baixa → alta</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="gradient-text text-4xl font-bold tracking-tight">218</span>
        <span className="mb-1 text-sm text-muted-foreground">compradores em 3 perfis</span>
      </div>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full border border-border">
        {clusters.map((c) => (
          <div key={c.key} className={cn("h-full", clusterMeta[c.key].dist)} style={{ width: `${(c.count / ticketTotal) * 100}%` }} />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {clusters.map((c) => (
          <span key={c.key} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-[3px]", clusterMeta[c.key].dist)} />
            {c.label} {Math.round((c.count / ticketTotal) * 100)}% ({c.count})
          </span>
        ))}
      </div>
      <div className="mt-5 flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
        {clusters.map((c) => (
          <div key={c.key} className="p-3">
            <div className="flex items-center gap-2"><ClusterChip c={c} /><span className="text-sm font-medium text-foreground">{c.count}</span></div>
            <p className="mt-1 text-xs text-muted-foreground">▸ {c.action}{c.product ? ` (${c.product})` : ""}</p>
          </div>
        ))}
      </div>
      <GradientCTA label="Abrir perfil por perfil" />
    </TicketFrame>
  );
}

/* ── T4 — Tabela ────────────────────────────────────────────────────── */
function TB4Table() {
  const flat = clusters.flatMap((c) => c.buyers.map((b) => ({ ...b, c })));
  return (
    <TicketFrame>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="gradient-text text-2xl font-bold">218 compradores</span>
        <span className="text-xs text-muted-foreground">8 produtos faixa baixa · 5 alta · 34 já subiram</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Pessoa</th>
              <th className="px-3 py-2 font-medium">Perfil</th>
              <th className="px-3 py-2 text-right font-medium">Gasto</th>
              <th className="px-3 py-2 font-medium">Recomendação</th>
            </tr>
          </thead>
          <tbody>
            {flat.map((b) => (
              <tr key={b.email} className="border-b border-border last:border-0 hover:bg-accent/40">
                <td className="px-3 py-2">
                  <div className="font-medium text-foreground">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.purchases}× compras</div>
                </td>
                <td className="px-3 py-2"><ClusterChip c={b.c} /></td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{BRL(b.spent)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{b.c.product || b.c.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <GradientCTA label="Exportar por perfil · opt-in" />
    </TicketFrame>
  );
}

/* ── T5 — Métrica + clusters ────────────────────────────────────────── */
function TB5Metric() {
  const max = Math.max(...clusters.map((c) => c.count));
  return (
    <TicketFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Coorte pra subir de ticket</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="gradient-text text-5xl font-bold tracking-tight">218</span>
        <span className="mb-1.5 text-sm text-muted-foreground">compradores · {ticketStats.excludedAlreadyUpgraded} já subiram</span>
      </div>
      <div className="mt-5 flex flex-col gap-3.5">
        {clusters.map((c) => (
          <div key={c.key}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <ClusterChip c={c} />
              <span className="tabular-nums text-muted-foreground">{c.count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full bg-gradient-to-r", clusterMeta[c.key].bar)} style={{ width: `${(c.count / max) * 100}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">▸ {c.action}</p>
          </div>
        ))}
      </div>
      <GradientCTA label="Ver recomendação por perfil" />
    </TicketFrame>
  );
}

function TicketBandUpsellResult() {
  return (
    <div className="flex flex-col gap-9">
      <Variation n={1} title="Grupos por perfil"><TB1Groups /></Variation>
      <Variation n={2} title="Cards por pessoa"><TB2Cards /></Variation>
      <Variation n={3} title="Distribuição"><TB3Dist /></Variation>
      <Variation n={4} title="Tabela"><TB4Table /></Variation>
      <Variation n={5} title="Métrica + clusters"><TB5Metric /></Variation>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   high-value-one-time-non-subscribers — premium avulso, janela ideal 90-120d
   ════════════════════════════════════════════════════════════════════════ */

interface HVBuyer {
  name: string;
  email: string;
  value: number;
  product: string;
  days: number;
  inWindow: boolean;
}

const hvBuyers: HVBuyer[] = [
  { name: "Carlos Bauer", email: "carlos@agencia.com.br", value: 8997, product: "Imersão Presencial", days: 102, inWindow: true },
  { name: "Patrícia Gomes", email: "paty@consultoria.com", value: 7497, product: "Programa Black", days: 108, inWindow: true },
  { name: "Ana Lima", email: "ana@criativa.co", value: 5997, product: "Mentoria Anual", days: 95, inWindow: true },
  { name: "Diego Martins", email: "diego.m@outlook.com", value: 12997, product: "Imersão Presencial", days: 45, inWindow: false },
  { name: "Rafael Souza", email: "rafael@studio.com", value: 6497, product: "Programa Black", days: 210, inWindow: false },
  { name: "Marina Alves", email: "marina.alves@gmail.com", value: 5497, product: "Mentoria Anual", days: 320, inWindow: false },
];

const hvTools = ["painel_minhas_vendas", "lista_de_assinaturas", "executar"];

function HVFrame({ children }: { children: ReactNode }) {
  return (
    <ResultFrame orchestration="HIGH_VALUE_ONE_TIME_NON_SUBSCRIBERS" tag="Vendas" tools={hvTools}>
      {children}
    </ResultFrame>
  );
}

function HVPremise() {
  return (
    <p className="text-xs italic leading-relaxed text-muted-foreground">
      “Compradores com compra avulsa (OneTime) ≥ {BRL(5000)}, sem assinatura
      ativa — priorizados pela janela ideal de 90-120 dias.”
    </p>
  );
}

function WindowBadge({ inWindow }: { inWindow: boolean }) {
  return inWindow ? (
    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">janela ideal</span>
  ) : (
    <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">na fila</span>
  );
}

/* ── H1 — Lista priorizada ──────────────────────────────────────────── */
function HV1List() {
  return (
    <HVFrame>
      <HVPremise />
      <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className="gradient-text text-4xl font-bold tracking-tight">34</span>
        <span className="mb-1 text-base font-medium text-foreground">clientes premium · sem assinatura</span>
      </div>
      <div className="mt-4">
        <AlertIndicatorBox tone="brand" title="5 estão na janela ideal AGORA (90-120 dias)">
          O grupo do 1:1 imediato — momento de pensar "preciso da próxima estrutura". Os demais continuam alvo, só descem na fila.
        </AlertIndicatorBox>
      </div>
      <ul className="mt-4 flex flex-col gap-px">
        {hvBuyers.slice(0, 5).map((b) => (
          <li key={b.email} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{initials(b.name)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">{b.name}</span>
                <WindowBadge inWindow={b.inWindow} />
              </div>
              <div className="truncate text-xs text-muted-foreground">{b.email} · {b.product}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-medium tabular-nums text-foreground">{BRL(b.value)}</div>
              <div className="text-xs text-muted-foreground">há {b.days} dias</div>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="mt-1 px-2 text-sm font-medium text-brand hover:underline">+ 29 clientes</button>
      <GradientCTA label="Abrir cards 1:1 com vendedor sênior · opt-in" />
    </HVFrame>
  );
}

/** Callout interno reaproveitável (mesmo estilo do AlertIndicator). */
function AlertIndicatorBox({ tone, title, children }: { tone: "brand" | "critical"; title: string; children: ReactNode }) {
  const cls = tone === "brand" ? "border-brand/30 bg-brand-muted text-brand" : "border-red-500/30 bg-red-500/10 text-red-400";
  return (
    <div className={cn("rounded-lg border p-3.5", cls.split(" ").slice(0, 2).join(" "))}>
      <div className={cn("flex items-center gap-2 text-sm font-semibold", cls.split(" ")[2])}>
        <Sparkles className="size-4 shrink-0" />
        {title}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

/* ── H2 — Cards por pessoa ──────────────────────────────────────────── */
function HV2Cards() {
  return (
    <HVFrame>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="gradient-text text-2xl font-bold">34 clientes premium</span>
        <span className="text-xs text-muted-foreground">5 na janela ideal</span>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {hvBuyers.map((b) => (
          <div key={b.email} className={cn("rounded-xl border bg-card/40 p-3", b.inWindow ? "border-emerald-500/30" : "border-border")}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{initials(b.name)}</span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{b.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{b.product}</div>
                </div>
              </div>
              <WindowBadge inWindow={b.inWindow} />
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-sm font-medium tabular-nums text-foreground">{BRL(b.value)}</span>
              <span className="text-xs text-muted-foreground">há {b.days} dias</span>
            </div>
          </div>
        ))}
      </div>
      <GradientCTA label="Criar tarefas 1:1 · opt-in" />
    </HVFrame>
  );
}

/* ── H3 — Janela ideal (hero) ───────────────────────────────────────── */
function HV3Window() {
  const win = hvBuyers.filter((b) => b.inWindow);
  return (
    <HVFrame>
      <AlertIndicatorBox tone="brand" title="5 clientes na janela ideal AGORA">
        Compraram alto há 90-120 dias e não assinam nada — o momento exato do 1:1 pra estruturar a recorrência.
      </AlertIndicatorBox>
      <ul className="mt-4 flex flex-col gap-2">
        {win.map((b) => (
          <li key={b.email} className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{initials(b.name)}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{b.name}</div>
              <div className="truncate text-xs text-muted-foreground">{b.email} · {b.product} · há {b.days} dias</div>
            </div>
            <span className="shrink-0 text-sm font-medium tabular-nums text-emerald-400">{BRL(b.value)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">↳ + 29 clientes premium fora da janela continuam alvo, em fila.</p>
      <GradientCTA label="Abrir os 5 cards 1:1 · opt-in" />
    </HVFrame>
  );
}

/* ── H4 — Tabela ────────────────────────────────────────────────────── */
function HV4Table() {
  return (
    <HVFrame>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="gradient-text text-2xl font-bold">34 clientes</span>
        <span className="text-xs text-muted-foreground">71 compras de alto valor · 23 já assinam</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Cliente</th>
              <th className="px-3 py-2 text-right font-medium">Valor</th>
              <th className="px-3 py-2 text-right font-medium">Há</th>
              <th className="px-3 py-2 font-medium">Janela</th>
            </tr>
          </thead>
          <tbody>
            {hvBuyers.map((b) => (
              <tr key={b.email} className={cn("border-b border-border last:border-0 hover:bg-accent/40", b.inWindow && "bg-emerald-500/[0.04]")}>
                <td className="px-3 py-2">
                  <div className="font-medium text-foreground">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.product}</div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{BRL(b.value)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{b.days}d</td>
                <td className="px-3 py-2"><WindowBadge inWindow={b.inWindow} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <GradientCTA label="Exportar premium · opt-in" />
    </HVFrame>
  );
}

/* ── H5 — Métrica + funil ───────────────────────────────────────────── */
function HV5Funnel() {
  const steps = [
    { label: "Compras de alto valor (OneTime)", value: 71, pct: 100 },
    { label: "Já assinam (saem)", value: 23, pct: 32 },
    { label: "Clientes premium sem assinatura", value: 34, pct: 48 },
    { label: "Na janela ideal (90-120d)", value: 5, pct: 7, hi: true },
  ];
  return (
    <HVFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Funil premium · compra avulsa ≥ {BRL(5000)}</p>
      <div className="mt-4 flex flex-col gap-3">
        {steps.map((s) => (
          <div key={s.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className={cn("font-medium", s.hi ? "text-emerald-400" : "text-foreground")}>{s.label}</span>
              <span className="tabular-nums text-muted-foreground">{s.value} · {s.pct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", s.hi ? "bg-gradient-to-r from-emerald-400 to-emerald-300" : "gradient-brand")} style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">↳ cenário (não promessa): 5 na janela × ticket de recorrência × taxa que você validar.</p>
      <GradientCTA label="Ver os 34 clientes premium" />
    </HVFrame>
  );
}

function HighValueOneTimeResult() {
  return (
    <div className="flex flex-col gap-9">
      <Variation n={1} title="Lista priorizada"><HV1List /></Variation>
      <Variation n={2} title="Cards por pessoa"><HV2Cards /></Variation>
      <Variation n={3} title="Janela ideal (hero)"><HV3Window /></Variation>
      <Variation n={4} title="Tabela"><HV4Table /></Variation>
      <Variation n={5} title="Funil premium"><HV5Funnel /></Variation>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   inactive-subscribers-no-member-access — churn antecipado por gravidade + MRR
   ════════════════════════════════════════════════════════════════════════ */

const sevMeta: Record<string, { chip: string; bar: string; dist: string }> = {
  critical: { chip: "border-red-500/30 bg-red-500/10 text-red-400", bar: "from-red-500 to-red-400", dist: "bg-red-500" },
  warning: { chip: "border-amber-500/30 bg-amber-500/10 text-amber-400", bar: "from-amber-400 to-amber-300", dist: "bg-amber-500" },
  never: { chip: "border-border bg-muted/60 text-muted-foreground", bar: "from-zinc-500 to-zinc-400", dist: "bg-zinc-500" },
};

interface InactivePerson {
  name: string;
  email: string;
  plan: string;
  mrr: number;
  meta: string;
}
interface SevSection {
  key: keyof typeof sevMeta;
  label: string;
  count: number;
  people: InactivePerson[];
}

const inactiveSections: SevSection[] = [
  { key: "critical", label: "Críticos · 30+ dias sem login", count: 8, people: [
    { name: "Marina Alves", email: "marina.alves@gmail.com", plan: "Clube Pro", mrr: 97, meta: "sem login há 47d" },
    { name: "Diego Martins", email: "diego.m@outlook.com", plan: "Mentoria Anual", mrr: 197, meta: "sem login há 38d" },
  ]},
  { key: "warning", label: "Em alerta · 15–30 dias", count: 26, people: [
    { name: "Rafael Souza", email: "rafael.souza@hotmail.com", plan: "Clube Pro", mrr: 97, meta: "sem login há 22d" },
    { name: "Camila Rocha", email: "camila.rocha@gmail.com", plan: "Plano Premium", mrr: 197, meta: "sem login há 18d" },
  ]},
  { key: "never", label: "Nunca acessaram", count: 5, people: [
    { name: "Beatriz Lima", email: "bia.lima@gmail.com", plan: "Clube Pro", mrr: 97, meta: "assinou há 60d · nunca entrou" },
    { name: "André Luiz", email: "andre.luiz@hotmail.com", plan: "Mentoria Anual", mrr: 197, meta: "assinou há 90d · nunca entrou" },
  ]},
];

const inactiveMrr = 10098;
const inactiveTotal = inactiveSections.reduce((s, x) => s + x.count, 0);
const inactiveTools = ["lista_de_assinaturas", "lista_de_usuarios_membros", "executar"];

function InactiveFrame({ children }: { children: ReactNode }) {
  return (
    <ResultFrame orchestration="INACTIVE_SUBSCRIBERS_NO_MEMBER_ACCESS" tag="Membros" tools={inactiveTools}>
      {children}
    </ResultFrame>
  );
}

function InactivePremise() {
  return (
    <p className="text-xs italic leading-relaxed text-muted-foreground">
      “Assinantes ativos sem login na área de membros há 14+ dias — receita
      recorrente em risco, dividida por gravidade.”
    </p>
  );
}

function SevChip({ s }: { s: SevSection }) {
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", sevMeta[s.key].chip)}>
      {s.count}
    </span>
  );
}

/* ── I1 — Por gravidade (3 seções) ──────────────────────────────────── */
function IN1Severity() {
  return (
    <InactiveFrame>
      <InactivePremise />
      <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className="gradient-text text-4xl font-bold tracking-tight">{BRL(inactiveMrr)}</span>
        <span className="mb-1 text-base font-medium text-foreground">/mês em risco</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">39 assinantes parados · 142 ativos no total · 8 críticos cancelam no próximo ciclo</p>
      <div className="mt-5 flex flex-col gap-4">
        {inactiveSections.map((s) => (
          <div key={s.key}>
            <div className="mb-2 flex items-center gap-2">
              <span className={cn("size-2 rounded-full", sevMeta[s.key].dist)} />
              <span className="text-sm font-medium text-foreground">{s.label}</span>
              <SevChip s={s} />
            </div>
            <ul className="flex flex-col gap-px">
              {s.people.map((p) => (
                <li key={p.email} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{initials(p.name)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{p.plan} · {p.meta}</div>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">{BRL(p.mrr)}/mês</span>
                </li>
              ))}
            </ul>
            {s.count > s.people.length && (
              <button type="button" className="mt-1 px-2 text-xs font-medium text-brand hover:underline">+ {s.count - s.people.length} em {s.label.split(" ·")[0].toLowerCase()}</button>
            )}
          </div>
        ))}
      </div>
      <GradientCTA label="Abrir tarefas de CS pros críticos · opt-in" />
    </InactiveFrame>
  );
}

/* ── I2 — Cards por pessoa ──────────────────────────────────────────── */
function IN2Cards() {
  const flat = inactiveSections.flatMap((s) => s.people.map((p) => ({ ...p, s })));
  return (
    <InactiveFrame>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="gradient-text text-2xl font-bold">{BRL(inactiveMrr)}/mês</span>
        <span className="text-xs text-muted-foreground">em risco · 39 assinantes parados</span>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {flat.map((p) => (
          <div key={p.email} className={cn("rounded-xl border bg-card/40 p-3", p.s.key === "critical" ? "border-red-500/30" : "border-border")}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{initials(p.name)}</span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{p.plan}</div>
                </div>
              </div>
              <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium", sevMeta[p.s.key].chip)}>{p.s.key === "critical" ? "crítico" : p.s.key === "warning" ? "alerta" : "nunca"}</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-sm font-medium tabular-nums text-foreground">{BRL(p.mrr)}/mês</span>
              <span className="text-xs text-muted-foreground">{p.meta}</span>
            </div>
          </div>
        ))}
      </div>
      <GradientCTA label="Fluxo de re-engajamento · opt-in" />
    </InactiveFrame>
  );
}

/* ── I3 — Distribuição (severidade) ─────────────────────────────────── */
function IN3Dist() {
  return (
    <InactiveFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Assinantes parados por gravidade</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="gradient-text text-4xl font-bold tracking-tight">{BRL(inactiveMrr)}</span>
        <span className="mb-1 text-sm text-muted-foreground">/mês em risco · 39 pessoas</span>
      </div>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full border border-border">
        {inactiveSections.map((s) => (
          <div key={s.key} className={cn("h-full", sevMeta[s.key].dist)} style={{ width: `${(s.count / inactiveTotal) * 100}%` }} />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {inactiveSections.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-[3px]", sevMeta[s.key].dist)} />
            {s.label.split(" ·")[0]} {s.count}
          </span>
        ))}
      </div>
      <div className="mt-5 flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
        {inactiveSections.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-2 p-3 text-sm">
            <span className="flex items-center gap-2"><span className={cn("size-2 rounded-full", sevMeta[s.key].dist)} />{s.label}</span>
            <span className="tabular-nums text-muted-foreground">{s.count}</span>
          </div>
        ))}
      </div>
      <GradientCTA label="Abrir por faixa de gravidade" />
    </InactiveFrame>
  );
}

/* ── I4 — Tabela ────────────────────────────────────────────────────── */
function IN4Table() {
  const flat = inactiveSections.flatMap((s) => s.people.map((p) => ({ ...p, s })));
  return (
    <InactiveFrame>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="gradient-text text-2xl font-bold">{BRL(inactiveMrr)}/mês</span>
        <span className="text-xs text-muted-foreground">39 parados · 8 críticos · 142 ativos</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Assinante</th>
              <th className="px-3 py-2 font-medium">Sem login</th>
              <th className="px-3 py-2 text-right font-medium">MRR</th>
            </tr>
          </thead>
          <tbody>
            {flat.map((p) => (
              <tr key={p.email} className={cn("border-b border-border last:border-0 hover:bg-accent/40", p.s.key === "critical" && "bg-red-500/[0.04]")}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <span className={cn("size-1.5 rounded-full", sevMeta[p.s.key].dist)} />
                    {p.name}
                  </div>
                  <div className="pl-3 text-xs text-muted-foreground">{p.plan}</div>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{p.meta}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{BRL(p.mrr)}/mês</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <GradientCTA label="Exportar por gravidade · opt-in" />
    </InactiveFrame>
  );
}

/* ── I5 — MRR hero + breakdown ──────────────────────────────────────── */
function IN5Mrr() {
  const max = Math.max(...inactiveSections.map((s) => s.count));
  return (
    <InactiveFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">MRR em risco · churn antecipado</p>
      <div className="mt-2">
        <span className="gradient-text text-5xl font-bold tracking-tight">{BRL(inactiveMrr)}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">/mês na fila pra cancelar · 39 assinantes parados de 142 ativos</p>
      <div className="mt-5 flex flex-col gap-3.5">
        {inactiveSections.map((s) => (
          <div key={s.key}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2"><span className={cn("size-2 rounded-full", sevMeta[s.key].dist)} /><span className="text-foreground">{s.label}</span></span>
              <span className="tabular-nums text-muted-foreground">{s.count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full bg-gradient-to-r", sevMeta[s.key].bar)} style={{ width: `${(s.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <GradientCTA label="Ver assinantes por gravidade" />
    </InactiveFrame>
  );
}

function InactiveSubscribersResult() {
  return (
    <div className="flex flex-col gap-9">
      <Variation n={1} title="Por gravidade (3 faixas)"><IN1Severity /></Variation>
      <Variation n={2} title="Cards por pessoa"><IN2Cards /></Variation>
      <Variation n={3} title="Distribuição"><IN3Dist /></Variation>
      <Variation n={4} title="Tabela"><IN4Table /></Variation>
      <Variation n={5} title="MRR + breakdown"><IN5Mrr /></Variation>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   win-back-canceled-then-one-time — cancelou a assinatura e voltou avulso
   ════════════════════════════════════════════════════════════════════════ */

interface WinbackPerson {
  name: string;
  email: string;
  product: string;
  plan: string;
  days: number;
  count: number;
  totalCents: number;
}

const winbackPeople: WinbackPerson[] = [
  { name: "Lucas Pereira", email: "lucas.p@gmail.com", product: "Workshop de Tráfego", plan: "Clube Pro", days: 8, count: 1, totalCents: 29700 },
  { name: "Fernanda Dias", email: "fe.dias@outlook.com", product: "Ebook Premium", plan: "Mentoria Anual", days: 14, count: 2, totalCents: 13400 },
  { name: "Thiago Nunes", email: "thiago.nunes@gmail.com", product: "Curso Express", plan: "Clube Pro", days: 21, count: 1, totalCents: 19700 },
  { name: "Patrícia Gomes", email: "patricia.g@hotmail.com", product: "Masterclass ao Vivo", plan: "Plano Premium", days: 35, count: 1, totalCents: 39700 },
  { name: "Bruno Carvalho", email: "bruno.c@gmail.com", product: "Template Pack", plan: "Clube Pro", days: 52, count: 3, totalCents: 14100 },
];

const winbackCount = 12;
const winbackCanceledInWindow = 47;
const winbackRecoveredCents = winbackPeople.reduce((s, p) => s + p.totalCents, 0) + 41800;
const winbackTools = ["lista_de_assinaturas", "painel_minhas_vendas", "executar"];

/** Velocidade de retorno → temperatura do win-back. */
function speedMeta(days: number): { label: string; chip: string; dot: string; bar: string } {
  if (days <= 30) return { label: "quente", chip: "border-brand/40 bg-brand/10 text-brand", dot: "bg-brand", bar: "from-[hsl(186_70%_70%)] to-[hsl(73_90%_62%)]" };
  if (days <= 45) return { label: "morno", chip: "border-amber-500/30 bg-amber-500/10 text-amber-400", dot: "bg-amber-500", bar: "from-amber-400 to-amber-300" };
  return { label: "frio", chip: "border-border bg-muted/60 text-muted-foreground", dot: "bg-zinc-500", bar: "from-zinc-500 to-zinc-400" };
}

function WinbackFrame({ children }: { children: ReactNode }) {
  return (
    <ResultFrame orchestration="WIN_BACK_CANCELED_THEN_ONE_TIME" tag="Vendas" tools={winbackTools}>
      {children}
    </ResultFrame>
  );
}

function WinbackPremise() {
  return (
    <p className="text-xs italic leading-relaxed text-muted-foreground">
      “Cancelaram a assinatura nos últimos 60 dias e voltaram a comprar avulso
      depois do cancelamento — querem estar com você, só não nesse formato.”
    </p>
  );
}

/* ── W1 — Lista por velocidade de retorno ───────────────────────────── */
function WB1List() {
  const sorted = [...winbackPeople].sort((a, b) => a.days - b.days);
  return (
    <WinbackFrame>
      <WinbackPremise />
      <p className="mt-3 text-sm text-foreground">
        <span className="font-semibold text-foreground">{winbackCount} pessoas</span> cancelaram a mensalidade e voltaram a comprar avulso
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">47 cancelamentos na janela · ordenado por quem voltou mais rápido</p>
      <ul className="mt-4 flex flex-col gap-px">
        {sorted.map((p) => {
          const s = speedMeta(p.days);
          return (
            <li key={p.email} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{initials(p.name)}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                <div className="truncate text-xs text-muted-foreground">{p.product}{p.count > 1 ? ` · ${p.count} compras` : ""} · cancelou {p.plan}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-medium tabular-nums text-foreground">{BRL(p.totalCents / 100)}</span>
                <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-medium tabular-nums", s.chip)}>voltou em {p.days}d</span>
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" className="mt-1 px-2 text-xs font-medium text-brand hover:underline">+ 7 win-backs</button>
      <GradientCTA label="Oferta de volta segmentada · opt-in" />
    </WinbackFrame>
  );
}

/* ── W2 — Cards ─────────────────────────────────────────────────────── */
function WB2Cards() {
  return (
    <WinbackFrame>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="gradient-text text-2xl font-bold">{winbackCount}</span>
        <span className="text-sm text-foreground">win-backs avulsos</span>
        <span className="text-xs text-muted-foreground">· {BRL(winbackRecoveredCents / 100)} já recomprados</span>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {winbackPeople.map((p) => {
          const s = speedMeta(p.days);
          return (
            <div key={p.email} className="rounded-xl border border-border bg-card/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{initials(p.name)}</span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">cancelou {p.plan}</div>
                  </div>
                </div>
                <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium", s.chip)}>{s.label}</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-xs">
                <span className="truncate text-muted-foreground">{p.product}</span>
                <span className="shrink-0 font-medium tabular-nums text-foreground">{BRL(p.totalCents / 100)}</span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">voltou {p.days} dias após o cancelamento</div>
            </div>
          );
        })}
      </div>
      <GradientCTA label="Cupom de retorno por pessoa · opt-in" />
    </WinbackFrame>
  );
}

/* ── W3 — Velocidade de retorno (escala) ────────────────────────────── */
function WB3Speed() {
  const sorted = [...winbackPeople].sort((a, b) => a.days - b.days);
  const maxDays = 60;
  return (
    <WinbackFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Dias do cancelamento até voltar</p>
      <p className="mt-1 text-xs text-muted-foreground">Quanto mais rápido voltou, mais quente o candidato a reassinar</p>
      <div className="mt-4 flex flex-col gap-3.5">
        {sorted.map((p) => {
          const s = speedMeta(p.days);
          return (
            <div key={p.email}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium text-foreground">{p.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{p.days}d · {BRL(p.totalCents / 100)}</span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full bg-gradient-to-r", s.bar)} style={{ width: `${Math.max(6, (1 - p.days / maxDays) * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-brand" />≤30d quente</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-amber-500" />31–45d morno</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-zinc-500" />45d+ frio</span>
      </div>
      <GradientCTA label="Priorizar os mais quentes · opt-in" />
    </WinbackFrame>
  );
}

/* ── W4 — Tabela ────────────────────────────────────────────────────── */
function WB4Table() {
  const sorted = [...winbackPeople].sort((a, b) => a.days - b.days);
  return (
    <WinbackFrame>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="gradient-text text-2xl font-bold">{winbackCount} win-backs</span>
        <span className="text-xs text-muted-foreground">47 cancelados · 89 compras avulsas no período</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Pessoa</th>
              <th className="px-3 py-2 font-medium">Voltou em</th>
              <th className="px-3 py-2 text-center font-medium">Compras</th>
              <th className="px-3 py-2 text-right font-medium">Recomprado</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const s = speedMeta(p.days);
              return (
                <tr key={p.email} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="px-3 py-2">
                    <div className="font-medium text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.product}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums", s.chip)}>
                      <span className={cn("size-1.5 rounded-full", s.dot)} />{p.days}d
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">{p.count}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">{BRL(p.totalCents / 100)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <GradientCTA label="Exportar candidatos a win-back · opt-in" />
    </WinbackFrame>
  );
}

/* ── W5 — Métrica recuperada (hero) ─────────────────────────────────── */
function WB5Metric() {
  const hot = winbackPeople.filter((p) => p.days <= 30).length;
  return (
    <WinbackFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Já recomprado avulso pós-cancelamento</p>
      <div className="mt-2">
        <span className="gradient-text text-5xl font-bold tracking-tight">{BRL(winbackRecoveredCents / 100)}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">de {winbackCount} ex-assinantes que voltaram a comprar solto</p>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <div className="text-2xl font-bold tabular-nums text-brand">{hot}+</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">voltaram em ≤30d</div>
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <div className="text-2xl font-bold tabular-nums text-foreground">{winbackCanceledInWindow}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">cancelaram na janela</div>
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <div className="text-2xl font-bold tabular-nums text-foreground">{Math.round((winbackCount / winbackCanceledInWindow) * 100)}%</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">já voltaram solto</div>
        </div>
      </div>
      <GradientCTA label="Converter avulso → assinatura · opt-in" />
    </WinbackFrame>
  );
}

function WinbackResult() {
  return (
    <div className="flex flex-col gap-9">
      <Variation n={1} title="Por velocidade de retorno"><WB1List /></Variation>
      <Variation n={2} title="Cards por pessoa"><WB2Cards /></Variation>
      <Variation n={3} title="Escala de dias até voltar"><WB3Speed /></Variation>
      <Variation n={4} title="Tabela"><WB4Table /></Variation>
      <Variation n={5} title="Valor recuperado (hero)"><WB5Metric /></Variation>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   expiring-trial-not-converted — trial acabando, ainda não virou pagante
   ════════════════════════════════════════════════════════════════════════ */

type TrialBucketKey = "3d" | "7d" | "14d";
/** engaged: true logou ≤7d · false não loga · null sem cadastro de membro */
type Engaged = true | false | null;

interface TrialPerson {
  name: string;
  email: string;
  product: string;
  priceCents: number;
  days: number;
  engaged: Engaged;
}
interface TrialBucket {
  key: TrialBucketKey;
  emoji: string;
  label: string;
  count: number;
  people: TrialPerson[];
}

const trialBucketMeta: Record<TrialBucketKey, { chip: string; dot: string; bar: string }> = {
  "3d": { chip: "border-red-500/30 bg-red-500/10 text-red-400", dot: "bg-red-500", bar: "bg-red-500" },
  "7d": { chip: "border-amber-500/30 bg-amber-500/10 text-amber-400", dot: "bg-amber-500", bar: "bg-amber-500" },
  "14d": { chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-500", bar: "bg-emerald-500" },
};

/** Engajamento → chip. Frio (não loga) é o alvo prioritário. */
function engMeta(e: Engaged): { label: string; chip: string; dot: string } {
  if (e === true) return { label: "logou", chip: "border-brand/40 bg-brand/10 text-brand", dot: "bg-brand" };
  if (e === false) return { label: "não loga", chip: "border-red-500/30 bg-red-500/10 text-red-400", dot: "bg-red-500" };
  return { label: "sem cadastro", chip: "border-border bg-muted/60 text-muted-foreground", dot: "bg-zinc-500" };
}

const trialBuckets: TrialBucket[] = [
  { key: "3d", emoji: "🔴", label: "Acabam em ≤3 dias", count: 14, people: [
    { name: "Carla Mendes", email: "carla.m@gmail.com", product: "Clube Pro", priceCents: 9700, days: 2, engaged: false },
    { name: "Otávio Reis", email: "otavio.reis@outlook.com", product: "Mentoria Anual", priceCents: 19700, days: 3, engaged: null },
  ]},
  { key: "7d", emoji: "🟡", label: "Acabam em 4–7 dias", count: 12, people: [
    { name: "Juliana Castro", email: "ju.castro@gmail.com", product: "Clube Pro", priceCents: 9700, days: 5, engaged: true },
    { name: "Marcos Vinícius", email: "marcos.v@hotmail.com", product: "Plano Premium", priceCents: 19700, days: 6, engaged: false },
  ]},
  { key: "14d", emoji: "🟢", label: "Acabam em 8–14 dias", count: 15, people: [
    { name: "Renata Lopes", email: "renata.l@gmail.com", product: "Clube Pro", priceCents: 9700, days: 11, engaged: true },
    { name: "Felipe Araújo", email: "felipe.a@gmail.com", product: "Curso Anual", priceCents: 29700, days: 13, engaged: null },
  ]},
];

const trialTotalActive = 89;
const trialResultCount = trialBuckets.reduce((s, b) => s + b.count, 0);
const trialLowEng3d = 6;
const trialToolsList = ["lista_de_assinaturas", "lista_de_usuarios_membros", "executar"];

function TrialFrame({ children }: { children: ReactNode }) {
  return (
    <ResultFrame orchestration="TRIAL_EXPIRING_NOT_CONVERTED" tag="Membros" tools={trialToolsList}>
      {children}
    </ResultFrame>
  );
}

function TrialPremise() {
  return (
    <p className="text-xs italic leading-relaxed text-muted-foreground">
      “Em trial gratuito (nenhuma cobrança paga ainda) com o teste acabando em
      até 14 dias — por urgência e cruzado com login na área de membros.”
    </p>
  );
}

/** Dentro do bucket, quem não logou vem primeiro (evapora sem contato). */
function sortByEngagement(people: TrialPerson[]) {
  return [...people].sort((a, b) => (a.engaged === true ? 1 : 0) - (b.engaged === true ? 1 : 0));
}

/* ── T1 — Por urgência (3 buckets) ──────────────────────────────────── */
function TR1Buckets() {
  return (
    <TrialFrame>
      <TrialPremise />
      <p className="mt-3 text-sm text-foreground">
        <span className="font-semibold">{trialTotalActive} pessoas testando agora</span> · {trialResultCount} acabam em ≤14 dias
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{trialBuckets[0].count} acabam em 3 dias — {trialLowEng3d} quase não logaram</p>
      <div className="mt-5 flex flex-col gap-4">
        {trialBuckets.map((b) => (
          <div key={b.key}>
            <div className="mb-2 flex items-center gap-2">
              <span className={cn("size-2 rounded-full", trialBucketMeta[b.key].dot)} />
              <span className="text-sm font-medium text-foreground">{b.label}</span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums", trialBucketMeta[b.key].chip)}>{b.count}</span>
            </div>
            <ul className="flex flex-col gap-px">
              {sortByEngagement(b.people).map((p) => {
                const e = engMeta(p.engaged);
                return (
                  <li key={p.email} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{initials(p.name)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{p.product} · acaba em {p.days}d</div>
                    </div>
                    <span className={cn("shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium", e.chip)}>{e.label}</span>
                    <span className="w-16 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">{BRL(p.priceCents / 100)}</span>
                  </li>
                );
              })}
            </ul>
            {b.count > b.people.length && (
              <button type="button" className="mt-1 px-2 text-xs font-medium text-brand hover:underline">+ {b.count - b.people.length} nessa janela</button>
            )}
          </div>
        ))}
      </div>
      <GradientCTA label="Falar com os ≤3d que não logam · opt-in" />
    </TrialFrame>
  );
}

/* ── T2 — Cards ─────────────────────────────────────────────────────── */
function TR2Cards() {
  const flat = trialBuckets.flatMap((b) => sortByEngagement(b.people).map((p) => ({ ...p, b })));
  return (
    <TrialFrame>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="gradient-text text-2xl font-bold">{trialResultCount}</span>
        <span className="text-sm text-foreground">trials expirando</span>
        <span className="text-xs text-muted-foreground">· de {trialTotalActive} ativos</span>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {flat.map((p) => {
          const e = engMeta(p.engaged);
          return (
            <div key={p.email} className={cn("rounded-xl border bg-card/40 p-3", p.b.key === "3d" ? "border-red-500/30" : "border-border")}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{initials(p.name)}</span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{p.product}</div>
                  </div>
                </div>
                <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums", trialBucketMeta[p.b.key].chip)}>{p.days}d</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-xs">
                <span className={cn("inline-flex items-center gap-1.5", p.engaged === false ? "text-red-400" : "text-muted-foreground")}>
                  <span className={cn("size-1.5 rounded-full", e.dot)} />{e.label}
                </span>
                <span className="font-medium tabular-nums text-foreground">{BRL(p.priceCents / 100)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <GradientCTA label="Ação por janela de urgência · opt-in" />
    </TrialFrame>
  );
}

/* ── T3 — Funil de urgência ─────────────────────────────────────────── */
function TR3Funnel() {
  const max = Math.max(...trialBuckets.map((b) => b.count));
  return (
    <TrialFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Trials por janela de expiração</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="gradient-text text-4xl font-bold tracking-tight">{trialResultCount}</span>
        <span className="mb-1 text-sm text-muted-foreground">acabam em ≤14d · de {trialTotalActive} ativos</span>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {trialBuckets.map((b) => (
          <div key={b.key}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2"><span>{b.emoji}</span><span className="text-foreground">{b.label}</span></span>
              <span className="tabular-nums text-muted-foreground">{b.count}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", trialBucketMeta[b.key].bar)} style={{ width: `${(b.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.06] p-3">
        <AlertTriangle className="size-4 shrink-0 text-red-400" />
        <p className="text-xs leading-relaxed text-foreground">
          <span className="font-semibold text-red-400">{trialLowEng3d} dos {trialBuckets[0].count}</span> que acabam em 3 dias quase não logaram — evaporam se ninguém falar hoje.
        </p>
      </div>
      <GradientCTA label="Priorizar resgate de hoje · opt-in" />
    </TrialFrame>
  );
}

/* ── T4 — Tabela ────────────────────────────────────────────────────── */
function TR4Table() {
  const flat = trialBuckets.flatMap((b) => sortByEngagement(b.people).map((p) => ({ ...p, b }))).sort((a, b) => a.days - b.days);
  return (
    <TrialFrame>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="gradient-text text-2xl font-bold">{trialResultCount} trials</span>
        <span className="text-xs text-muted-foreground">acabando em ≤14d · {trialTotalActive} ativos</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Pessoa</th>
              <th className="px-3 py-2 font-medium">Acaba</th>
              <th className="px-3 py-2 font-medium">Engajamento</th>
              <th className="px-3 py-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {flat.map((p) => {
              const e = engMeta(p.engaged);
              return (
                <tr key={p.email} className={cn("border-b border-border last:border-0 hover:bg-accent/40", p.b.key === "3d" && "bg-red-500/[0.04]")}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.product}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums", trialBucketMeta[p.b.key].chip)}>
                      <span className={cn("size-1.5 rounded-full", trialBucketMeta[p.b.key].dot)} />{p.days}d
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs", p.engaged === false ? "text-red-400" : "text-muted-foreground")}>
                      <span className={cn("size-1.5 rounded-full", e.dot)} />{e.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">{BRL(p.priceCents / 100)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <GradientCTA label="Exportar por janela · opt-in" />
    </TrialFrame>
  );
}

/* ── T5 — Métrica hero ──────────────────────────────────────────────── */
function TR5Metric() {
  return (
    <TrialFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Em trial · ainda não pagaram</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="gradient-text text-5xl font-bold tracking-tight">{trialTotalActive}</span>
        <span className="mb-1 text-sm text-muted-foreground">testando agora</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{trialResultCount} acabam em ≤14 dias — janela de conversão aberta</p>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {trialBuckets.map((b) => (
          <div key={b.key} className="rounded-xl border border-border bg-card/40 p-3">
            <div className={cn("text-2xl font-bold tabular-nums", b.key === "3d" ? "text-red-400" : b.key === "7d" ? "text-amber-400" : "text-emerald-400")}>{b.count}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{b.label.replace("Acabam em ", "")}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.06] p-3">
        <AlertTriangle className="size-4 shrink-0 text-red-400" />
        <p className="text-xs leading-relaxed text-foreground">
          <span className="font-semibold text-red-400">{trialLowEng3d}</span> dos que acabam em 3 dias quase não logaram — prioridade de toque humano hoje.
        </p>
      </div>
      <GradientCTA label="Abrir lista por urgência · opt-in" />
    </TrialFrame>
  );
}

function ExpiringTrialResult() {
  return (
    <div className="flex flex-col gap-9">
      <Variation n={1} title="Por urgência (3 janelas)"><TR1Buckets /></Variation>
      <Variation n={2} title="Cards por pessoa"><TR2Cards /></Variation>
      <Variation n={3} title="Funil de urgência"><TR3Funnel /></Variation>
      <Variation n={4} title="Tabela"><TR4Table /></Variation>
      <Variation n={5} title="Métrica (hero)"><TR5Metric /></Variation>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   missed-meeting-not-rescheduled — reunião furou e ninguém remarcou
   ════════════════════════════════════════════════════════════════════════ */

interface MissedLead {
  name: string;
  email: string;
  origin: string;
  days: number;
  cardCents: number;
  missedCount: number;
}

const missedLeads: MissedLead[] = [
  { name: "Ricardo Alves", email: "ricardo.alves@gmail.com", origin: "Google Ads", days: 5, cardCents: 1990000, missedCount: 1 },
  { name: "Paulo Henrique", email: "paulo.h@outlook.com", origin: "Facebook Ads · LR-14", days: 9, cardCents: 1397000, missedCount: 1 },
  { name: "Tatiane Melo", email: "tati.melo@gmail.com", origin: "Facebook Ads · LR-14", days: 12, cardCents: 1290000, missedCount: 1 },
  { name: "Aline Santos", email: "aline.santos@hotmail.com", origin: "Facebook Ads · LR-14", days: 15, cardCents: 880000, missedCount: 1 },
  { name: "João Ribeiro", email: "joao.ribeiro@gmail.com", origin: "Facebook Ads · LR-14", days: 19, cardCents: 999700, missedCount: 1 },
  { name: "Sandra Costa", email: "sandra.c@gmail.com", origin: "Facebook Ads · LR-14", days: 21, cardCents: 750000, missedCount: 2 },
  { name: "Eduardo Pinto", email: "edu.pinto@gmail.com", origin: "Instagram · Stories", days: 8, cardCents: 497000, missedCount: 1 },
  { name: "Vanessa Dias", email: "vanessa.dias@gmail.com", origin: "Indicação", days: 27, cardCents: 490000, missedCount: 1 },
];

const missedTotalCents = missedLeads.reduce((s, l) => s + l.cardCents, 0);
const missedStats = { missed: 11, rescheduled: 2, assumed: 1 };
const missedToolsList = ["lista_de_atividades_do_sistema", "lista_de_cartoes_por_lead", "executar"];

/** Padrão por origem: conta perdas por anúncio e detecta a origem dominante. */
const missedOriginPattern = (() => {
  const m = new Map<string, number>();
  for (const l of missedLeads) m.set(l.origin, (m.get(l.origin) || 0) + 1);
  return [...m.entries()]
    .map(([origin, count]) => ({ origin, count, share: count / missedLeads.length }))
    .sort((a, b) => b.count - a.count);
})();
const missedDominant =
  missedOriginPattern[0] && missedOriginPattern[0].count >= 3 && missedOriginPattern[0].share >= 0.5
    ? missedOriginPattern[0]
    : null;

function MissedFrame({ children }: { children: ReactNode }) {
  return (
    <ResultFrame orchestration="MISSED_MEETING_NOT_RESCHEDULED" tag="Comercial" tools={missedToolsList}>
      {children}
    </ResultFrame>
  );
}

function MissedPremise() {
  return (
    <p className="text-xs italic leading-relaxed text-muted-foreground">
      “Reuniões marcadas nos últimos 30 dias, sem reagendamento posterior nem
      follow-up em ±24h — inferido por ausência de eventos.”
    </p>
  );
}

/** Box do padrão de anúncio dominante (hipótese a auditar, não veredito). */
function DominantOriginNote({ compact = false }: { compact?: boolean }) {
  if (!missedDominant) return null;
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06]", compact ? "p-2.5" : "p-3")}>
      <AlertTriangle className="size-4 shrink-0 text-amber-400" />
      <p className="text-xs leading-relaxed text-foreground">
        <span className="font-semibold text-amber-400">{missedDominant.count} das {missedLeads.length}</span> reuniões perdidas vieram de <span className="font-medium">{missedDominant.origin}</span> — pode ser promessa do anúncio desalinhada. Vale auditar antes de remarcar todo mundo.
      </p>
    </div>
  );
}

/* ── M1 — Lista por reunião mais recente ────────────────────────────── */
function MM1List() {
  const sorted = [...missedLeads].sort((a, b) => a.days - b.days);
  return (
    <MissedFrame>
      <MissedPremise />
      <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className="gradient-text text-4xl font-bold tracking-tight">{BRL(missedTotalCents / 100)}</span>
        <span className="mb-1 text-base font-medium text-foreground">parados em proposta</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{missedLeads.length} reuniões perdidas sem remarcação · {missedStats.rescheduled} remarcadas e {missedStats.assumed} provável-aconteceu já excluídas</p>
      <div className="mt-4 mb-4"><DominantOriginNote /></div>
      <ul className="flex flex-col gap-px">
        {sorted.map((l) => (
          <li key={l.email} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{initials(l.name)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-foreground">{l.name}</span>
                {l.missedCount > 1 && <span className="shrink-0 rounded-full border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">{l.missedCount}× furou</span>}
              </div>
              <div className="truncate text-xs text-muted-foreground">{l.origin} · faltou há {l.days}d</div>
            </div>
            <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">{BRL(l.cardCents / 100)}</span>
          </li>
        ))}
      </ul>
      <GradientCTA label="Criar tarefa de remarcação · opt-in" />
    </MissedFrame>
  );
}

/* ── M2 — Cards ─────────────────────────────────────────────────────── */
function MM2Cards() {
  return (
    <MissedFrame>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="gradient-text text-2xl font-bold">{missedLeads.length} no-shows</span>
        <span className="text-xs text-muted-foreground">· {BRL(missedTotalCents / 100)} em proposta parada</span>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {[...missedLeads].sort((a, b) => a.days - b.days).map((l) => (
          <div key={l.email} className={cn("rounded-xl border bg-card/40 p-3", l.origin === missedDominant?.origin ? "border-amber-500/30" : "border-border")}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{initials(l.name)}</span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{l.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{l.origin}</div>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">há {l.days}d</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-sm font-medium tabular-nums text-foreground">{BRL(l.cardCents / 100)}</span>
              <span className="text-[11px] text-muted-foreground">{l.missedCount > 1 ? `${l.missedCount}× furou` : "card aberto"}</span>
            </div>
          </div>
        ))}
      </div>
      <GradientCTA label="Rediscagem pro mesmo SDR · opt-in" />
    </MissedFrame>
  );
}

/* ── M3 — Padrão por origem ─────────────────────────────────────────── */
function MM3Origin() {
  const max = Math.max(...missedOriginPattern.map((o) => o.count));
  return (
    <MissedFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Reuniões perdidas por origem</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="gradient-text text-4xl font-bold tracking-tight">{missedLeads.length}</span>
        <span className="mb-1 text-sm text-muted-foreground">no-shows · {BRL(missedTotalCents / 100)} parados</span>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {missedOriginPattern.map((o) => {
          const isDom = o.origin === missedDominant?.origin;
          return (
            <div key={o.origin}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className={cn("truncate", isDom ? "font-medium text-amber-400" : "text-foreground")}>{o.origin}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{o.count} · {Math.round(o.share * 100)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", isDom ? "bg-amber-500" : "bg-zinc-500")} style={{ width: `${(o.count / max) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5"><DominantOriginNote /></div>
      <GradientCTA label="Auditar a origem dominante · opt-in" />
    </MissedFrame>
  );
}

/* ── M4 — Tabela ────────────────────────────────────────────────────── */
function MM4Table() {
  const sorted = [...missedLeads].sort((a, b) => a.days - b.days);
  return (
    <MissedFrame>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="gradient-text text-2xl font-bold">{BRL(missedTotalCents / 100)}</span>
        <span className="text-xs text-muted-foreground">{missedLeads.length} no-shows · {missedStats.rescheduled} remarcadas excluídas</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Lead</th>
              <th className="px-3 py-2 font-medium">Origem</th>
              <th className="px-3 py-2 font-medium">Faltou</th>
              <th className="px-3 py-2 text-right font-medium">Card</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((l) => {
              const isDom = l.origin === missedDominant?.origin;
              return (
                <tr key={l.email} className={cn("border-b border-border last:border-0 hover:bg-accent/40", isDom && "bg-amber-500/[0.04]")}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      {l.name}
                      {l.missedCount > 1 && <span className="rounded-full border border-red-500/30 bg-red-500/10 px-1 text-[10px] font-medium text-red-400">{l.missedCount}×</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    <span className={cn(isDom && "text-amber-400")}>{l.origin}</span>
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">há {l.days}d</td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">{BRL(l.cardCents / 100)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <GradientCTA label="Exportar no-shows · opt-in" />
    </MissedFrame>
  );
}

/* ── M5 — Métrica hero ──────────────────────────────────────────────── */
function MM5Metric() {
  return (
    <MissedFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Proposta parada na etapa da reunião</p>
      <div className="mt-2">
        <span className="gradient-text text-5xl font-bold tracking-tight">{BRL(missedTotalCents / 100)}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">em {missedLeads.length} reuniões que furaram e ninguém remarcou</p>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <div className="text-2xl font-bold tabular-nums text-foreground">{missedStats.missed}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">reuniões na janela</div>
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <div className="text-2xl font-bold tabular-nums text-emerald-400">{missedStats.rescheduled}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">remarcadas (saíram)</div>
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <div className="text-2xl font-bold tabular-nums text-foreground">{missedStats.assumed}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">provável-aconteceu</div>
        </div>
      </div>
      <div className="mt-3"><DominantOriginNote /></div>
      <GradientCTA label="Abrir lista de rediscagem · opt-in" />
    </MissedFrame>
  );
}

function MissedMeetingResult() {
  return (
    <div className="flex flex-col gap-9">
      <Variation n={1} title="Por reunião mais recente"><MM1List /></Variation>
      <Variation n={2} title="Cards por lead"><MM2Cards /></Variation>
      <Variation n={3} title="Padrão por origem"><MM3Origin /></Variation>
      <Variation n={4} title="Tabela"><MM4Table /></Variation>
      <Variation n={5} title="Valor parado (hero)"><MM5Metric /></Variation>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   hot-leads-no-recent-contact — nota alta, parado, ninguém falou
   ════════════════════════════════════════════════════════════════════════ */

interface HotLead {
  name: string;
  email: string;
  score: number;
  hours: number;
  attendant: string;
  lastCategory: string | null;
  never: boolean;
  context?: string;
}

const hotLeadsRaw: HotLead[] = [
  { name: "Maria Santos", email: "maria.santos@gmail.com", score: 92, hours: 96, attendant: "Peçanha", lastCategory: "Opportunity", never: false, context: "pediu proposta na última conversa" },
  { name: "Gustavo Pereira", email: "gustavo.p@outlook.com", score: 72, hours: 100, attendant: "Vinícius", lastCategory: null, never: true },
  { name: "Rodrigo Lima", email: "rodrigo.lima@gmail.com", score: 78, hours: 90, attendant: "Peçanha", lastCategory: null, never: true },
  { name: "Carlos Eduardo", email: "carlos.edu@hotmail.com", score: 88, hours: 78, attendant: "Lara", lastCategory: "WhatsApp", never: false },
  { name: "Patrícia Souza", email: "patricia.souza@gmail.com", score: 81, hours: 80, attendant: "Lara", lastCategory: "Opportunity", never: false },
  { name: "Fernanda Reis", email: "fernanda.reis@gmail.com", score: 85, hours: 72, attendant: "Vinícius", lastCategory: "WhatsApp", never: false },
  { name: "Beatriz Nunes", email: "bia.nunes@gmail.com", score: 95, hours: 50, attendant: "Vinícius", lastCategory: "Email", never: false },
];

const hotLeads = hotLeadsRaw
  .map((l) => ({ ...l, urgency: l.score * l.hours }))
  .sort((a, b) => b.urgency - a.urgency);
const hotCritical = hotLeads[0];
const hotMaxUrgency = hotCritical.urgency;
const hotCohortSize = 64;
const hotResultCount = 23;
const hotToolsList = ["esquema_de_filtro_de_leads", "leads_search", "lista_de_atividades_por_lead"];

/** Tempo parado → urgência do relógio. 72h+ é vermelho. */
function idleTone(hours: number) {
  if (hours >= 72) return "text-red-400";
  if (hours >= 48) return "text-amber-400";
  return "text-muted-foreground";
}

function fmtIdle(hours: number) {
  return hours >= 48 ? `${Math.round(hours / 24)}d parado` : `${hours}h parado`;
}

function HotFrame({ children }: { children: ReactNode }) {
  return (
    <ResultFrame orchestration="HOT_LEADS_NO_RECENT_CONTACT" tag="Comercial" tools={hotToolsList}>
      {children}
    </ResultFrame>
  );
}

function HotPremise() {
  return (
    <p className="text-xs italic leading-relaxed text-muted-foreground">
      “Leads com score ≥ 70 cuja última atividade humana (Email/WhatsApp/Opportunity)
      foi há mais de 48h — ranqueado por nota × tempo parado.”
    </p>
  );
}

/** Cartão de manchete do lead crítico do dia. */
function CriticalLeadCard() {
  const c = hotCritical;
  return (
    <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/[0.08] to-transparent p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-400">
          <AlertTriangle className="size-3" /> Crítico do dia
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">{initials(c.name)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-base font-semibold text-foreground">{c.name}</span>
            <span className="shrink-0 rounded-md bg-foreground px-1.5 py-0.5 text-xs font-bold tabular-nums text-background">nota {c.score}</span>
          </div>
          <div className="text-xs text-muted-foreground">com {c.attendant} · <span className={idleTone(c.hours)}>{fmtIdle(c.hours)}</span></div>
        </div>
      </div>
      {c.context && <p className="mt-3 text-sm italic leading-relaxed text-foreground/90">“{c.context} — a bola está no nosso campo.”</p>}
    </div>
  );
}

function UrgencyBar({ urgency }: { urgency: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full gradient-brand" style={{ width: `${(urgency / hotMaxUrgency) * 100}%` }} />
    </div>
  );
}

/* ── H1 — Crítico + fila por urgência ───────────────────────────────── */
function HL1Critical() {
  const rest = hotLeads.slice(1);
  return (
    <HotFrame>
      <HotPremise />
      <div className="mt-3"><CriticalLeadCard /></div>
      <p className="mt-4 mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Próximos na fila · por urgência</p>
      <ul className="flex flex-col gap-px">
        {rest.map((l) => (
          <li key={l.email} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{initials(l.name)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-foreground">{l.name}</span>
                {l.never && <span className="shrink-0 rounded-full border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">sem contato em 14d</span>}
              </div>
              <div className="truncate text-xs text-muted-foreground"><span className={idleTone(l.hours)}>{fmtIdle(l.hours)}</span> · {l.attendant}</div>
            </div>
            <span className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-xs font-semibold tabular-nums text-foreground">{l.score}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="mt-1 px-2 text-xs font-medium text-brand hover:underline">+ {hotResultCount - hotLeads.length} leads parados</button>
      <GradientCTA label="Notificar o atendente do crítico · opt-in" />
    </HotFrame>
  );
}

/* ── H2 — Cards ─────────────────────────────────────────────────────── */
function HL2Cards() {
  return (
    <HotFrame>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="gradient-text text-2xl font-bold">{hotResultCount} leads quentes</span>
        <span className="text-xs text-muted-foreground">parados · de {hotCohortSize} com nota alta</span>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {hotLeads.map((l, i) => (
          <div key={l.email} className={cn("rounded-xl border bg-card/40 p-3", i === 0 ? "border-red-500/30" : "border-border")}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">{initials(l.name)}</span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{l.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{l.attendant}</div>
                </div>
              </div>
              <span className="shrink-0 rounded-md bg-foreground px-1.5 py-0.5 text-xs font-bold tabular-nums text-background">{l.score}</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <span className={idleTone(l.hours)}>{fmtIdle(l.hours)}</span>
              <span className="text-muted-foreground">{l.never ? "sem contato em 14d" : `via ${l.lastCategory}`}</span>
            </div>
            <div className="mt-2"><UrgencyBar urgency={l.urgency} /></div>
          </div>
        ))}
      </div>
      <GradientCTA label="Distribuir rediscagem por atendente · opt-in" />
    </HotFrame>
  );
}

/* ── H3 — Matriz nota × tempo parado ────────────────────────────────── */
function HL3Matrix() {
  const xMax = 120;
  return (
    <HotFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Urgência = nota × tempo parado</p>
      <p className="mt-1 text-xs text-muted-foreground">Canto superior direito = quente e largado há mais tempo</p>
      <div className="relative mt-5 ml-7 h-52 border-l border-b border-border">
        {/* eixos */}
        <span className="absolute -left-7 top-0 text-[10px] text-muted-foreground">100</span>
        <span className="absolute -left-7 -bottom-1 text-[10px] text-muted-foreground">70</span>
        <span className="absolute -bottom-5 left-0 text-[10px] text-muted-foreground">0h</span>
        <span className="absolute -bottom-5 right-0 text-[10px] text-muted-foreground">{xMax}h+</span>
        <span className="pointer-events-none absolute right-2 top-2 text-[10px] font-medium text-red-400/70">zona crítica</span>
        {hotLeads.map((l, i) => {
          const left = Math.min(98, (l.hours / xMax) * 100);
          const bottom = Math.min(94, ((l.score - 70) / 30) * 100);
          const size = i === 0 ? 16 : 11;
          return (
            <div key={l.email} className="group absolute -translate-x-1/2 translate-y-1/2" style={{ left: `${left}%`, bottom: `${bottom}%` }}>
              <span className={cn("block rounded-full ring-2 ring-background", i === 0 ? "bg-red-500 shadow-[0_0_10px] shadow-red-500/50" : l.hours >= 72 ? "bg-amber-500" : "bg-brand")} style={{ width: size, height: size }} />
              <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-1.5 py-0.5 text-[10px] text-foreground opacity-0 shadow transition-opacity group-hover:opacity-100">{l.name.split(" ")[0]} · {l.score}/{l.hours}h</span>
            </div>
          );
        })}
      </div>
      <div className="mt-7 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.06] p-3">
        <AlertTriangle className="size-4 shrink-0 text-red-400" />
        <p className="text-xs leading-relaxed text-foreground">
          <span className="font-semibold">{hotCritical.name}</span> (nota {hotCritical.score}, {fmtIdle(hotCritical.hours)}) é o caso mais crítico — com {hotCritical.attendant}.
        </p>
      </div>
      <GradientCTA label="Atacar a zona crítica primeiro · opt-in" />
    </HotFrame>
  );
}

/* ── H4 — Tabela ────────────────────────────────────────────────────── */
function HL4Table() {
  return (
    <HotFrame>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="gradient-text text-2xl font-bold">{hotResultCount} parados</span>
        <span className="text-xs text-muted-foreground">checados {hotCohortSize} top por nota</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Lead</th>
              <th className="px-3 py-2 text-center font-medium">Nota</th>
              <th className="px-3 py-2 font-medium">Parado</th>
              <th className="px-3 py-2 font-medium">Atendente</th>
            </tr>
          </thead>
          <tbody>
            {hotLeads.map((l, i) => (
              <tr key={l.email} className={cn("border-b border-border last:border-0 hover:bg-accent/40", i === 0 && "bg-red-500/[0.05]")}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    {i === 0 && <AlertTriangle className="size-3 shrink-0 text-red-400" />}
                    {l.name}
                  </div>
                  {l.never && <div className="text-[11px] text-muted-foreground">sem contato em 14d</div>}
                </td>
                <td className="px-3 py-2 text-center"><span className="rounded-md border border-border px-1.5 py-0.5 text-xs font-semibold tabular-nums text-foreground">{l.score}</span></td>
                <td className={cn("px-3 py-2 text-xs tabular-nums", idleTone(l.hours))}>{fmtIdle(l.hours)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{l.attendant}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <GradientCTA label="Exportar fila de rediscagem · opt-in" />
    </HotFrame>
  );
}

/* ── H5 — Crítico (hero único) ──────────────────────────────────────── */
function HL5Hero() {
  const c = hotCritical;
  return (
    <HotFrame>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Lead mais crítico agora</p>
      <div className="mt-3 flex items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-foreground">{initials(c.name)}</span>
        <div className="min-w-0">
          <div className="truncate text-xl font-bold text-foreground">{c.name}</div>
          <div className="text-sm text-muted-foreground">com {c.attendant}</div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <div className="gradient-text text-3xl font-bold tabular-nums">{c.score}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">nota de intenção</div>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-3">
          <div className="text-3xl font-bold tabular-nums text-red-400">{c.hours}h</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">sem contato</div>
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <div className="text-3xl font-bold tabular-nums text-foreground">{hotResultCount}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">na fila atrás</div>
        </div>
      </div>
      {c.context && (
        <p className="mt-4 rounded-xl border border-border bg-muted/30 p-3 text-sm italic leading-relaxed text-foreground/90">“{c.context} — a bola está no nosso campo.”</p>
      )}
      <GradientCTA label="Avisar o atendente agora · opt-in" />
    </HotFrame>
  );
}

function HotLeadsResult() {
  return (
    <div className="flex flex-col gap-9">
      <Variation n={1} title="Crítico + fila por urgência"><HL1Critical /></Variation>
      <Variation n={2} title="Cards por lead"><HL2Cards /></Variation>
      <Variation n={3} title="Matriz nota × tempo"><HL3Matrix /></Variation>
      <Variation n={4} title="Tabela"><HL4Table /></Variation>
      <Variation n={5} title="Crítico (hero único)"><HL5Hero /></Variation>
    </div>
  );
}

/** Registro: id do componente → componente de resultado. */
export const resultComponents: Record<string, ComponentType> = {
  "card-declined-recovery-list": CardDeclinedRecoveryResult,
  "pending-pix-boleto-by-day": BoletoPendingByDayResult,
  "checkout-abandonment-by-product": CheckoutAbandonmentResult,
  "canceled-purchase-not-returned": CanceledPurchaseResult,
  "subscription-renewal-failed": SubscriptionRenewalResult,
  "low-cost-buyer-readiness": LowCostBuyerReadinessResult,
  "course-completer-no-recent-purchase": CourseCompleterResult,
  "ticket-band-upsell-recommendation": TicketBandUpsellResult,
  "high-value-one-time-non-subscribers": HighValueOneTimeResult,
  "inactive-subscribers-no-member-access": InactiveSubscribersResult,
  "win-back-canceled-then-one-time": WinbackResult,
  "expiring-trial-not-converted": ExpiringTrialResult,
  "missed-meeting-not-rescheduled": MissedMeetingResult,
  "hot-leads-no-recent-contact": HotLeadsResult,
};

export function getResultComponent(id: string): ComponentType | undefined {
  return resultComponents[id];
}
