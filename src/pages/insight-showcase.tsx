import { useState } from "react";
import {
  InsightCard,
  MetricHeader,
  MetricValue,
  StatusBadge,
  ProgressBar,
  AlertIndicator,
  ProductResultRow,
  RecommendationCTA,
  toneTokens,
  type Tone,
  type InsightState,
} from "@/components/insight";

const TONES: Tone[] = ["positive", "attention", "critical", "neutral", "brand"];
const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function InsightShowcase() {
  const [state, setState] = useState<InsightState>("default");

  return (
    <div className="max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        sistema de design
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
        Sistema de Insight
      </h1>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        Componentes de resultado/insight reutilizáveis em checkout, pagamentos,
        vendas, campanhas, funis, produtos e mensagens. Cada <code>tone</code>{" "}
        carrega o significado do dado — risco, oportunidade, prioridade.
      </p>

      {/* ── Tons ── */}
      <Section title="Tons (semântica)" sub="A cor comunica o que acontedeu e a gravidade — não é decoração.">
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <StatusBadge key={t} tone={t} icon>
              {toneTokens[t].label}
            </StatusBadge>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-3">
          {TONES.map((t) => (
            <div key={t} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">{t}</span>
              <ProgressBar tone={t} value={[88, 64, 32, 50, 76][TONES.indexOf(t)]} />
            </div>
          ))}
        </div>
      </Section>

      {/* ── Estados ── */}
      <Section title="Variações de estado" sub="default · loading · empty · insufficient · error.">
        <div className="mb-4 flex flex-wrap gap-1.5">
          {(["default", "loading", "empty", "insufficient", "error"] as InsightState[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setState(s)}
              className={
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors " +
                (state === s
                  ? "border-brand/40 bg-brand-muted text-brand"
                  : "border-border text-muted-foreground hover:bg-accent")
              }
            >
              {s}
            </button>
          ))}
        </div>
        <InsightCard
          tone="critical"
          state={state}
          orchestration="CHECKOUT_ABANDONMENT"
          domain="Pagamentos"
          onRetry={() => setState("default")}
          footer={<RecommendationCTA tone="critical">Ver detalhamento por produto</RecommendationCTA>}
        >
          <MetricHeader
            eyebrow="Abandono no checkout · 30 dias"
            badge={<StatusBadge tone="critical" dot>Prioridade alta</StatusBadge>}
          />
          <MetricValue className="mt-3" value="184" suffix="pessoas · R$ 99.698 em aberto" />
        </InsightCard>
      </Section>

      {/* ── Composição: checkout com fricção (crítico) ── */}
      <Section title="Exemplo · Abandono com fricção" sub="Crítico — produto causando o problema + ação imediata.">
        <InsightCard
          tone="critical"
          orchestration="CHECKOUT_ABANDONMENT_BY_PRODUCT"
          domain="Pagamentos"
          tools={["painel_minhas_vendas", "leads_search", "executar"]}
          footer={<RecommendationCTA tone="critical">Auditar checkout dos produtos com fricção</RecommendationCTA>}
        >
          <MetricHeader
            eyebrow="Abandono no checkout · 30 dias"
            badge={<StatusBadge tone="critical" icon>2 com fricção</StatusBadge>}
          />
          <MetricValue className="mt-3" value="184" suffix="pessoas · R$ 99.698" />
          <div className="mt-4">
            <AlertIndicator tone="critical" title="2 produtos com abandono acima da média">
              Antes de recuperar esses leads, vale auditar o checkout — recuperar
              gente pra um checkout quebrado queima a melhor lista do mês.
            </AlertIndicator>
          </div>
          <div className="mt-4 flex flex-col gap-2.5">
            <ProductResultRow
              title="Programa Anual"
              subtitle="28 leads · 9 pagas"
              value={BRL(36372)}
              meta="3,1× aband./venda"
              alertTone="critical"
              badge={<StatusBadge tone="critical">fricção</StatusBadge>}
            />
            <ProductResultRow
              title="Imersão Vendas"
              subtitle="31 leads · 8 pagas"
              value={BRL(15407)}
              meta="3,9× aband./venda"
              alertTone="critical"
              badge={<StatusBadge tone="critical">fricção</StatusBadge>}
            />
            <ProductResultRow
              title="Mentoria Pro"
              subtitle="52 leads · 48 pagas"
              value={BRL(28044)}
              meta="1,1× aband./venda"
            />
          </div>
        </InsightCard>
      </Section>

      {/* ── Composição: prontidão (positivo/oportunidade) ── */}
      <Section title="Exemplo · Oportunidade (prontidão)" sub="Positivo — quem está pronto pra subir de ticket.">
        <InsightCard
          tone="brand"
          orchestration="LOW_COST_BUYER_READINESS"
          domain="Vendas"
          footer={<RecommendationCTA tone="brand">Criar campanha entrada → alvo</RecommendationCTA>}
        >
          <MetricHeader
            eyebrow="Prontos pra subir de ticket · 90 dias"
            badge={<StatusBadge tone="positive" icon>Oportunidade quente</StatusBadge>}
          />
          <MetricValue className="mt-3" value="30" suffix="prontos · de 73 compradores" trend={{ value: "+18%", direction: "up" }} />
          <div className="mt-4 flex flex-col gap-2.5">
            {[
              { n: "Marina Alves", s: 0.94, m: "curso 100% · abre e-mails" },
              { n: "Diego Martins", s: 0.88, m: "curso 80%+ · ativo hoje" },
              { n: "Beatriz Lima", s: 0.81, m: "curso 100% · clicou em oferta" },
            ].map((p) => (
              <ProductResultRow
                key={p.n}
                title={p.n}
                subtitle={p.m}
                value={<span className="text-brand">{p.s.toFixed(2)}</span>}
                meta="prontidão"
                leading={
                  <div className="w-16">
                    <ProgressBar tone="brand" size="sm" value={p.s * 100} />
                  </div>
                }
              />
            ))}
          </div>
        </InsightCard>
      </Section>

      {/* ── Composição: métrica saudável (KPI) ── */}
      <Section title="Exemplo · KPI saudável" sub="Métrica única com tendência positiva.">
        <InsightCard
          tone="positive"
          orchestration="ANALYTICS_TOTAL_SALES"
          domain="CRM"
          footer={<RecommendationCTA tone="positive" variant="soft">Ver detalhamento por produto</RecommendationCTA>}
        >
          <MetricHeader eyebrow="Vendas totais · últimos 30 dias" badge={<StatusBadge tone="positive" dot>Saudável</StatusBadge>} />
          <MetricValue className="mt-3" size="xl" value={BRL(248910)} trend={{ value: "+12% vs mês anterior", direction: "up" }} caption="em 612 vendas pagas" />
          <div className="mt-5 flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">Interna</span>
              <span className="tabular-nums text-muted-foreground">{BRL(198450)} · 80%</span>
            </div>
            <ProgressBar tone="positive" value={80} size="sm" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">Externa</span>
              <span className="tabular-nums text-muted-foreground">{BRL(50460)} · 20%</span>
            </div>
            <ProgressBar tone="neutral" value={20} size="sm" />
          </div>
        </InsightCard>
      </Section>
    </div>
  );
}
