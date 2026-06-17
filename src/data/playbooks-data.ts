/**
 * Playbooks (área Análise, Furion, etc.) — cada um com cabeçalho estruturado
 * (gatilhos, ferramentas, agente) + corpo em Markdown cru (?raw).
 */
import listaRecuperacaoCartao from "@/content/playbooks/analise/lista-de-recuperacao-de-cartao.md?raw";
import boletoPendentePixPorDia from "@/content/playbooks/analise/boleto-pendente-pix-por-dia.md?raw";
import abandonoCarrinhoPorProduto from "@/content/playbooks/analise/abandono-de-carrinho-por-produto.md?raw";
import compraCanceladaNaoDevolvida from "@/content/playbooks/analise/compra-cancelada-nao-devolvida.md?raw";

export interface Playbook {
  /** Rótulo do grupo (ex: "Resgate · recuperação de vendas") */
  group: string;
  /** Emoji do grupo */
  groupEmoji: string;
  /** Agente responsável (ex: "Rebeca") */
  agent?: string;
  /** Título do playbook */
  title: string;
  /** Descrição curta (quando usar) */
  summary: string;
  /** Frases-gatilho do usuário */
  gatilhos: string[];
  /** Variações de perguntas que o usuário pode fazer */
  perguntas?: string[];
  /** Tools/recursos usados */
  ferramentas: string[];
  /** Corpo em Markdown */
  body: string;
  /** Id do componente de resultado (ver src/components/results.tsx) */
  resultId?: string;
}

export const playbooks: Record<string, Playbook> = {
  "/analise/resgate-recuperacao-de-vendas/lista-de-recuperacao-de-cartao": {
    group: "Resgate · recuperação de vendas",
    groupEmoji: "💳",
    agent: "Rebeca",
    title: "lista de recuperação de cartões recusados",
    summary:
      "Use esta opção quando o usuário solicitar leads cuja tentativa recente de pagamento com cartão de crédito foi recusada ou falhou e que não realizaram compras desde então.",
    gatilhos: [
      "cartão não passou",
      "pagamento recusado",
      "tentou pagar no cartão",
      "cartão recusado por falta de saldo",
      "ainda não comprou",
      "Cartão recusado",
      "recuperação de caixa",
    ],
    perguntas: [
      "Me mostra todo mundo que tentou pagar no cartão nos últimos 7 dias, não passou e ainda não comprou.",
      "Quem teve o cartão recusado essa semana e não voltou pra finalizar a compra?",
      "Quero recuperar quem não conseguiu pagar no cartão — me dá a lista de contatos.",
      "Lista de pessoas com pagamento recusado que ainda não compraram por outro método.",
      "Tentaram pagar e não passou; quem são pra eu chamar no WhatsApp?",
    ],
    ferramentas: ["painel_minhas_vendas", "pergunta", "executar"],
    body: listaRecuperacaoCartao,
    resultId: "card-declined-recovery-list",
  },

  "/analise/resgate-recuperacao-de-vendas/boleto-pendente-pix-por-dia": {
    group: "Resgate · recuperação de vendas",
    groupEmoji: "💳",
    agent: "Rebeca",
    title: "boleto pendente—pix-por-dia",
    summary:
      "Utilize quando o usuário solicitar leads que geraram um Pix ou boleto ainda não pago, divididos em faixas de dias com uma sugestão de canal para cada faixa.",
    gatilhos: [
      "gerou pix ou boleto",
      "pix pendente",
      "boleto em aberto",
      "ainda não pagou",
      "separa por dias",
      "cobranças pendentes",
      "fotos pendentes",
      "unpaid boleto",
    ],
    perguntas: [
      "Quem gerou Pix ou boleto e ainda não pagou — separa por dias.",
      "Lista de boletos em aberto, dividida por quantos dias faz que foram gerados.",
      "Tem gente com Pix pendente? Me separa por faixa de dias pra eu saber o canal.",
      "Cobranças pendentes (pix/boleto) dos últimos 30 dias, agrupadas por idade.",
      "Quem gerou cobrança e não pagou — quero abordar os mais recentes por WhatsApp.",
    ],
    ferramentas: [
      "painel_minhas_vendas",
      "lista_de_atividades_do_sistema",
      "pergunta",
      "executar",
    ],
    body: boletoPendentePixPorDia,
    resultId: "pending-pix-boleto-by-day",
  },

  "/analise/resgate-recuperacao-de-vendas/abandono-de-carrinho-por-produto": {
    group: "Resgate · recuperação de vendas",
    groupEmoji: "💳",
    agent: "Rebeca",
    title: "abandono de carrinho por produto",
    summary:
      "Use esta ferramenta quando o usuário for questionado sobre quais leads abandonaram o carrinho antes de finalizar a compra, agrupados por produto, com um alerta de atrito quando o abandono superar as vendas pagas.",
    gatilhos: [
      "abandonaram o checkout",
      "abandono de checkout",
      "carrinho abandonado",
      "agrupa por produto",
      "não finalizou a compra",
      "abandono de caixa",
    ],
    perguntas: [
      "Quais leads abandonaram o checkout antes de finalizar — agrupa por produto.",
      "Quem chegou no carrinho e não comprou? Separa por produto pra eu ver onde tá vazando.",
      "Lista de abandono de checkout dos últimos 30 dias, agrupada por produto.",
      "Quais produtos têm mais abandono que venda? Me mostra os leads de cada um.",
      "Carrinho abandonado por produto — e me avisa se tem produto com fricção no checkout.",
    ],
    ferramentas: [
      "painel_minhas_vendas",
      "esquema_de_filtro_de_leads",
      "leads_search",
      "lista_de_atividades_do_sistema",
      "leads_produtos_comuns",
      "pergunta",
      "executar",
    ],
    body: abandonoCarrinhoPorProduto,
    resultId: "checkout-abandonment-by-product",
  },

  "/analise/resgate-recuperacao-de-vendas/compra-cancelada-nao-devolvida": {
    group: "Resgate · recuperação de vendas",
    groupEmoji: "💳",
    agent: "Rebeca",
    title: "compra cancelada — não devolvida",
    summary:
      "Utilize quando o usuário solicitar leads cuja compra foi reembolsada ou contestada recentemente e que não compraram nada desde então, agrupados por motivo de cancelamento.",
    gatilhos: [
      "compra cancelada",
      "estornou e não voltou",
      "não voltou a comprar",
      "cancelou e sumiu",
      "estorno",
      "Reembolsado e não devolvido",
    ],
    perguntas: [
      "Quem teve compra cancelada nos últimos 60 dias e não voltou a comprar nada?",
      "Lista de quem estornou e nunca mais comprou — agrupa por motivo.",
      "Quais clientes pediram reembolso e sumiram? Quero atacar por motivo.",
      "Me mostra quem cancelou a compra e não voltou, separado por dor (preço, expectativa, acesso).",
      "Estornos dos últimos 60 dias de quem não recomprou — quem são?",
    ],
    ferramentas: [
      "painel_minhas_vendas",
      "lista_de_assinaturas",
      "transações_obter",
      "pergunta",
      "executar",
    ],
    body: compraCanceladaNaoDevolvida,
    resultId: "canceled-purchase-not-returned",
  },
};

export function getPlaybook(pathname: string): Playbook | undefined {
  return playbooks[pathname];
}
