import { Fragment, type ComponentType, type ReactNode } from "react";
import { ArrowRight, AlertTriangle } from "lucide-react";
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
      <div className="dot-frame rounded-2xl p-4 sm:p-6">
        <div className="overflow-hidden rounded-xl border border-border bg-background/90 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-brand" />
              </span>
              <span className="font-semibold text-foreground">CLICKMAX</span>
              <span className="text-muted-foreground">· {orchestration}</span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {tag}
            </span>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
      {tools.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-xs text-muted-foreground">tools:</span>
          {tools.map((t) => (
            <span
              key={t}
              className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs text-muted-foreground"
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
      className="gradient-brand mt-5 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-black/85 transition-opacity hover:opacity-90"
    >
      {label}
      <ArrowRight className="size-4" />
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
      <div className="mb-2.5 flex items-center gap-2 text-sm">
        <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
          Variação {n}
        </span>
        <span className="font-medium text-foreground">{title}</span>
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

/** Registro: id do componente → componente de resultado. */
export const resultComponents: Record<string, ComponentType> = {
  "card-declined-recovery-list": CardDeclinedRecoveryResult,
  "pending-pix-boleto-by-day": BoletoPendingByDayResult,
  "checkout-abandonment-by-product": CheckoutAbandonmentResult,
};

export function getResultComponent(id: string): ComponentType | undefined {
  return resultComponents[id];
}
