import { Fragment } from "react";
import { Link } from "react-router-dom";
import { hero, areas, stats } from "@/config/playbooks";
import { navigation } from "@/config/navigation";
import { AreaSection } from "@/components/area-section";

export function Home() {
  return (
    <div className="py-2">
      {/* Eyebrow */}
      <p className="mb-4 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {hero.eyebrow}
      </p>

      {/* Título */}
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        {hero.title}
      </h1>

      {/* Descrição */}
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        Documentação organizada em{" "}
        <strong className="font-semibold text-foreground">6 áreas</strong> —
        expanda cada uma no menu ou no corpo e leia um item por vez:{" "}
        {areas.map((area, i) => (
          <Fragment key={area.href}>
            {i > 0 && (i === areas.length - 1 ? " e " : ", ")}
            <Link
              to={area.href}
              className="font-medium text-brand underline-offset-4 hover:underline"
            >
              <span className="mr-0.5">{area.emoji}</span>
              {area.name}
            </Link>
            {area.note && (
              <span className="text-muted-foreground"> ({area.note})</span>
            )}
          </Fragment>
        ))}
        . Toda mutação fica atrás de confirmação via{" "}
        <code className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
          question
        </code>
        .
      </p>

      {/* Badges de contagem */}
      <div className="mt-7 flex flex-wrap gap-2">
        {stats.map((stat) => (
          <span
            key={stat.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-muted px-3 py-1 text-xs text-brand"
          >
            <strong className="font-bold tabular-nums">{stat.value}</strong>
            <span className="uppercase tracking-wide">{stat.label}</span>
          </span>
        ))}
      </div>

      {/* Áreas inline ("expanda no corpo") */}
      {navigation.map((section) => (
        <Fragment key={section.slug}>
          <hr className="my-10 border-border" />
          <AreaSection section={section} />
        </Fragment>
      ))}
    </div>
  );
}
