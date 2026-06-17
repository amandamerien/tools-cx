/**
 * Playbooks (área Análise, Furion, etc.) — cada um com cabeçalho estruturado
 * (gatilhos, ferramentas, agente) + corpo em Markdown cru (?raw).
 */
import listaRecuperacaoCartao from "@/content/playbooks/analise/lista-de-recuperacao-de-cartao.md?raw";
import boletoPendentePixPorDia from "@/content/playbooks/analise/boleto-pendente-pix-por-dia.md?raw";
import abandonoCarrinhoPorProduto from "@/content/playbooks/analise/abandono-de-carrinho-por-produto.md?raw";
import compraCanceladaNaoDevolvida from "@/content/playbooks/analise/compra-cancelada-nao-devolvida.md?raw";
import renovacaoAssinaturaFalhada from "@/content/playbooks/analise/renovacao-da-assinatura-falhada.md?raw";
import prontidaoVendasAdicionais from "@/content/playbooks/analise/prontidao-vendas-adicionais-baixo-custo.md?raw";
import concluinteCursoSemCompra from "@/content/playbooks/analise/concluinte-do-curso-sem-compra-recente.md?raw";

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

  "/analise/resgate-recuperacao-de-vendas/renovacao-da-assinatura-falhada": {
    group: "Resgate · recuperação de vendas",
    groupEmoji: "💳",
    agent: "Rebeca",
    title: "renovação—da—assinatura—falhou",
    summary:
      "Utilizar quando o utilizador solicita os subscritores ativos cuja última cobrança recorrente falhou, separando-os por causa da falha (cartão expirado, sem saldo, cartão bloqueado).",
    gatilhos: [
      "falha na cobrança da mensalidade",
      "mensalidade falhou",
      "renovação falhou",
      "cartão expirado",
      "inadimplente",
      "Falha na cobrança da assinatura",
      "agitação silenciosa",
    ],
    perguntas: [
      "Quem teve falha na cobrança da mensalidade no último ciclo?",
      "Lista de assinantes ativos cuja renovação falhou — separa por causa.",
      "Quais assinaturas não renovaram por cartão expirado / sem saldo / bloqueado?",
      "Quanto de MRR tá vazando com renovação falhando? Me mostra quem.",
      "Inadimplentes da recorrência dos últimos 35 dias que ainda não cancelaram.",
    ],
    ferramentas: [
      "painel_minhas_vendas",
      "lista_de_assinaturas",
      "assinaturas_obter",
      "assinaturas_atualizacao_cartao",
      "pergunta",
      "executar",
    ],
    body: renovacaoAssinaturaFalhada,
    resultId: "subscription-renewal-failed",
  },

  "/analise/esteira-subir-de-ticket/prontidao-para-vendas-adicionais-de-baixo-custo": {
    group: "Esteira · subir de ticket",
    groupEmoji: "🎯",
    agent: "Cassio + Diego",
    title: "prontidão para vendas adicionais de baixo custo",
    summary:
      "Use esta pergunta quando o usuário perguntar quais compradores recentes de baixo valor demonstram sinais de engajamento (conclusão de curso, abertura de e-mails, atividade recente, cliques em ofertas) que os tornam aptos para uma oferta de alto valor.",
    gatilhos: [
      "comprou meu produto barato",
      "pronto pra subir pra Mentoria",
      "quem está pronto pra comprar algo maior",
      "sinais de prontidão",
      "terminou o curso e abre meus e-mails",
      "Pronto para atualizar",
      "Preparação para vendas adicionais",
      "engajaram compradores de baixo valor",
    ],
    perguntas: [
      "Quem comprou meu produto barato e tá pronto pra subir pra Mentoria?",
      "Quais compradores de baixo valor engajaram e estão prontos pra uma oferta maior?",
      "Me mostra quem terminou o curso e abre meus e-mails — pra eu oferecer o ticket alto.",
      "Lista de quem comprou o Workshop e tem sinais de prontidão pra Mentoria.",
      "Quem dos compradores recentes está mais quente pra um upsell de alto valor?",
    ],
    ferramentas: [
      "painel_minhas_vendas",
      "lista_de_produtos",
      "member_users_get_progress_by_lead",
      "metricas_de_atividades_por_lead",
      "pergunta",
      "executar",
    ],
    body: prontidaoVendasAdicionais,
    resultId: "low-cost-buyer-readiness",
  },

  "/analise/esteira-subir-de-ticket/concluinte-do-curso-sem-compra-recente": {
    group: "Esteira · subir de ticket",
    groupEmoji: "🎯",
    agent: "Cassio + Diego",
    title: "concluinte-do-curso-sem-compra-recente",
    summary:
      "Use quando o usuário solicitar leads que concluíram um curso e não fizeram nenhuma compra paga recentemente.",
    gatilhos: [
      "terminou meu curso e não comprou nada novo",
      "aluno terminou o curso",
      "quem terminou e não comprou",
      "completou o curso",
      "próximo passo pro aluno",
      "Curso concluído",
      "Terminei meu curso",
      "Concluintes sem compra",
    ],
    perguntas: [
      "Quem terminou meu curso e não comprou nada novo?",
      "Lista de alunos que completaram o curso e ainda não fizeram um upsell.",
      "Concluintes do curso sem compra recente — quero oferecer o próximo passo.",
      "Quem terminou o curso nos últimos meses e está quente pra comprar mais?",
      "Me mostra os alunos que concluíram e não compraram nada nos últimos 30 dias.",
    ],
    ferramentas: [
      "lista_de_atividades_do_sistema",
      "lista_de_conteudo",
      "content_get",
      "detalhes_da_sala_de_aula",
      "painel_minhas_vendas",
      "lista_de_usuarios_membros_por_sala_de_classe",
      "member_users_get_progress_by_lead",
      "member_users_get_course_progress",
      "leads_pagamentos",
      "pergunta",
      "executar",
    ],
    body: concluinteCursoSemCompra,
    resultId: "course-completer-no-recent-purchase",
  },
};

export function getPlaybook(pathname: string): Playbook | undefined {
  return playbooks[pathname];
}
