/** Conteúdo da home — "Playbooks fazem Max". */

export interface Area {
  emoji: string;
  name: string;
  /** Texto entre parênteses após o nome (vazio = sem parênteses) */
  note: string;
  href: string;
}

export interface Stat {
  value: string;
  label: string;
}

export const hero = {
  eyebrow: "playbooks-monorepo/ · revisado contra o monorepo",
  title: "Playbooks fazem Max",
};

/** As 6 áreas — texto exato do hero. */
export const areas: Area[] = [
  { emoji: "🧰", name: "Tools do Max", note: "as 261 reais, por domínio", href: "/tools" },
  { emoji: "📊", name: "Análise", note: "23 playbooks que acham dinheiro parado", href: "/analise" },
  { emoji: "🧬", name: "Furion", note: "14 de criação", href: "/furion" },
  { emoji: "🧩", name: "Melhorias necessárias", note: "", href: "/melhorias" },
  { emoji: "📜", name: "Prompts exatos do Furion", note: "", href: "/prompts" },
  { emoji: "🏛️", name: "Bilhon OS", note: '12 playbooks de serviço "fazemos por você"', href: "/bilhon-os" },
];

/** Badges de contagem exibidos abaixo da descrição. */
export const stats: Stat[] = [
  { value: "261", label: "Ferramentas" },
  { value: "23", label: "Análise" },
  { value: "14", label: "Furion" },
  { value: "8", label: "Lacunas → especificações" },
  { value: "4", label: "Instruções textuais" },
  { value: "12", label: "Bilhon OS" },
];
