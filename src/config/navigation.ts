import {
  Wrench,
  BarChart3,
  Rocket,
  Puzzle,
  NotebookPen,
  Landmark,
  type LucideIcon,
} from "lucide-react";

/** Nó genérico da árvore de navegação (grupo ou item). */
export interface NavNode {
  /** Título exibido */
  title: string;
  /** Emoji opcional (grupos costumam ter) */
  emoji?: string;
  /** Contagem opcional (badge) */
  count?: number;
  /** Rota — preenchida automaticamente para folhas */
  href?: string;
  /** Subnós (quando presente, o nó é um grupo expansível) */
  children?: NavNode[];
}

/** Área de topo (raiz do menu). */
export interface NavSection {
  slug: string;
  label: string;
  emoji: string;
  icon: LucideIcon;
  count?: number;
  /** Texto curto auxiliar (usado na home) */
  note: string;
  /** Subtítulo exibido no topo da página da área */
  description?: string;
  /** Rota base da área */
  href: string;
  /** Conteúdo da área */
  children: NavNode[];
}

/** kebab-case sem acentos, para gerar rotas. */
function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * As 6 áreas da documentação "Playbooks fazem Max".
 * Fonte única: alimenta o menu lateral, a home, as rotas e os breadcrumbs.
 * (Títulos truncados nos prints foram transcritos da melhor forma — ajustar.)
 */
export const navigation: NavSection[] = [
  {
    slug: "tools",
    label: "Ferramentas para Max",
    emoji: "🧰",
    icon: Wrench,
    count: 261,
    note: "as 261 reais, por domínio",
    description:
      "as 261 tools reais do monorepo (workers/ai/src/tools/**, commit e0cba68), por domínio — expanda um domínio por vez",
    href: "/tools",
    children: [
      { title: "Visão geral", href: "/" },
      { title: "Comum", count: 3 },
      { title: "CRM", count: 87 },
      { title: "Produtos", count: 15 },
      { title: "Pagamentos", count: 40 },
      { title: "Funis", count: 19 },
      { title: "Fluxos", count: 16 },
      { title: "Editor3", count: 11 },
      { title: "Membros", count: 63 },
      { title: "Era", count: 7 },
      { title: "Docs de domínio", count: 25 },
      { title: "Executar e questionar" },
    ],
  },
  {
    slug: "analise",
    label: "Análise",
    emoji: "📊",
    icon: BarChart3,
    count: 23,
    note: "dinheiro parado",
    href: "/analise",
    children: [
      {
        title: "Resgate · recuperação de vendas",
        emoji: "💳",
        count: 5,
        children: [
          { title: "lista de recuperação de cartão" },
          { title: "boleto pendente / pix por dia" },
          { title: "abandono de carrinho por produto" },
          { title: "compra cancelada — não devolvida" },
          { title: "renovação da assinatura falhada" },
        ],
      },
      {
        title: "Esteira · subir de ticket",
        emoji: "🎯",
        count: 4,
        children: [
          { title: "prontidão para vendas adicionais de baixo custo" },
          { title: "concluinte do curso sem compra recente" },
          { title: "recomendação de venda adicional de ingressos" },
          { title: "não assinantes de alto valor que pagam apenas uma vez" },
        ],
      },
      {
        title: "Retenção",
        emoji: "🩸",
        count: 3,
        children: [
          { title: "assinantes inativos sem acesso" },
          { title: "assinante inativo comprou uma única vez" },
          { title: "julgamento final ainda não convertido" },
        ],
      },
      {
        title: "Comercial · agenda e pipeline",
        emoji: "📞",
        count: 4,
        children: [
          { title: "reunião faltada não remarcada" },
          { title: "leads quentes sem contato recente" },
          { title: "propostas enviadas sem acompanhamento" },
          { title: "ouro lidera agenda de alto valor" },
        ],
      },
      {
        title: "Reativação",
        emoji: "🔄",
        count: 2,
        children: [
          { title: "clientes inativos ainda abrindo" },
          { title: "resfriados por funil" },
        ],
      },
      {
        title: "Investimento · onde colocar verba",
        emoji: "📈",
        count: 2,
        children: [
          { title: "decisão de escala de campanha" },
          { title: "candidatos a upsell de produto" },
        ],
      },
      {
        title: "Orquestrador · resumo da semana",
        emoji: "🔥",
        count: 1,
        children: [{ title: "resumo semanal do dinheiro parado" }],
      },
      {
        title: "Novos · proatividade e atendimento",
        emoji: "✨",
        count: 2,
        children: [
          { title: "descoberta de padrões de comportamento" },
          { title: "monitor de caixa de entrada" },
        ],
      },
    ],
  },
  {
    slug: "furion",
    label: "Furion",
    emoji: "🧬",
    icon: Rocket,
    count: 14,
    note: "criação",
    href: "/furion",
    children: [
      {
        title: "Fundação",
        emoji: "💠",
        count: 3,
        children: [
          { title: "definição de avatar furion" },
          { title: "criação de produto furion" },
          { title: "furion-copy-tone-refine" },
        ],
      },
      {
        title: "Ofertas",
        emoji: "💎",
        count: 4,
        children: [
          { title: "criação de oferta furion" },
          { title: "furion-order-bump-creation" },
          { title: "criação de upsell furion" },
          { title: "criação de venda reduzida (downsell)" },
        ],
      },
      {
        title: "Funis e esteira",
        emoji: "🏛️",
        count: 3,
        children: [
          { title: "design de sequência de ofertas" },
          { title: "projeto-de-funil-furion" },
          { title: "funil de ofertas de chamada (isca)" },
        ],
      },
      {
        title: "Páginas, mensagens e anúncios",
        emoji: "📣",
        count: 3,
        children: [
          { title: "furion-page-section-blueprint" },
          { title: "design de sequência de mensagens" },
          { title: "criação-de-campanha-publicitária" },
        ],
      },
      {
        title: "Orquestrador de ativação",
        emoji: "😎",
        count: 1,
        children: [{ title: "orquestrador de ativação do furion" }],
      },
    ],
  },
  {
    slug: "melhorias",
    label: "Melhorias necessárias",
    emoji: "🧩",
    icon: Puzzle,
    count: 8,
    note: "lacunas → especificações",
    href: "/melhorias",
    children: [
      { title: "Visão geral" },
      { title: "Resumo dos gaps" },
      { title: "Specs propostas" },
      { title: "Melhorias no próprio catálogo" },
      { title: "Prioridade sugerida" },
    ],
  },
  {
    slug: "prompts",
    label: "Prompts exatos · Furion",
    emoji: "📜",
    icon: NotebookPen,
    count: 4,
    note: "instruções textuais",
    href: "/prompts",
    children: [
      { title: "definição-avatar-furion.prompt" },
      { title: "furion-copy-tone-refine.prompt" },
      { title: "furion-page-section-blueprint.prompt" },
      { title: "furion-product-creation.prompt" },
    ],
  },
  {
    slug: "bilhon-os",
    label: "Bilhon OS",
    emoji: "🏛️",
    icon: Landmark,
    count: 12,
    note: 'serviço "fazemos por você"',
    href: "/bilhon-os",
    children: [
      {
        title: "Pacotes de frente",
        emoji: "📦",
        count: 4,
        children: [
          { title: "bilhon-os-pacote-f1-low-ticket" },
          { title: "bilhon-os-pacote-f2-high-ticket" },
          { title: "bilhon-os-pacote-f3-movimento" },
          { title: "bilhon-os-pacote-f4-mid-ticket" },
        ],
      },
      {
        title: "Diagnóstico",
        emoji: "🩺",
        count: 3,
        children: [
          { title: "bilhon-os-recomendador-de-pacote" },
          { title: "bilhon-os-linchpin-diagnostico" },
          { title: "bilhon-os-metricas-das-frentes" },
        ],
      },
      {
        title: "Método e portfólio",
        emoji: "🎯",
        count: 3,
        children: [
          { title: "bilhon-os-sistema-90-dias" },
          { title: "bilhon-os-catalogo-de-pecas" },
          { title: "bilhon-os-combo-e-investimento" },
        ],
      },
      {
        title: "Comercial",
        emoji: "🤝",
        count: 2,
        children: [
          { title: "bilhon-os-objecoes-e-fechamento" },
          { title: "bilhon-os-diagnostico-vitrine" },
        ],
      },
    ],
  },
];

/** Atribui rotas (href) às folhas, encadeando os slugs dos ancestrais. */
function assignHrefs(nodes: NavNode[], base: string): void {
  for (const node of nodes) {
    const path = `${base}/${slugify(node.title)}`;
    if (node.children && node.children.length > 0) {
      assignHrefs(node.children, path);
    } else if (!node.children) {
      node.href = node.href ?? path;
    }
  }
}
for (const section of navigation) {
  assignHrefs(section.children, section.href);
}

/** True se o nó ou algum descendente corresponde à rota atual. */
export function containsPath(node: NavNode, pathname: string): boolean {
  if (node.href && node.href === pathname) return true;
  return node.children?.some((c) => containsPath(c, pathname)) ?? false;
}

export interface NavMatch {
  section: NavSection;
  /** Caminho de nós da área até o item (para breadcrumb) */
  trail: NavNode[];
}

/** Localiza a área + trilha de nós correspondente a uma rota. */
export function findNode(pathname: string): NavMatch | null {
  for (const section of navigation) {
    if (pathname === section.href) return { section, trail: [] };
    const trail: NavNode[] = [];
    if (walk(section.children, pathname, trail)) return { section, trail };
  }
  return null;
}

function walk(nodes: NavNode[], pathname: string, trail: NavNode[]): boolean {
  for (const node of nodes) {
    trail.push(node);
    if (node.href === pathname) return true;
    if (node.children && walk(node.children, pathname, trail)) return true;
    trail.pop();
  }
  return false;
}
