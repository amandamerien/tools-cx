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
import recomendacaoVendaIngressos from "@/content/playbooks/analise/recomendacao-venda-adicional-ingressos.md?raw";
import naoAssinantesAltoValor from "@/content/playbooks/analise/nao-assinantes-alto-valor-uma-vez.md?raw";
import assinantesInativosSemAcesso from "@/content/playbooks/analise/assinantes-inativos-sem-acesso.md?raw";
import assinanteInativoComprou from "@/content/playbooks/analise/assinante-inativo-comprou-uma-unica-vez.md?raw";
import julgamentoFinalNaoConvertido from "@/content/playbooks/analise/julgamento-final-ainda-nao-convertido.md?raw";
import reuniaoFaltadaNaoRemarcada from "@/content/playbooks/analise/reuniao-faltada-nao-remarcada.md?raw";
import leadsQuentesSemContato from "@/content/playbooks/analise/leads-quentes-sem-contato-recente.md?raw";
import propostasEnviadasSemAcompanhamento from "@/content/playbooks/analise/propostas-enviadas-sem-acompanhamento.md?raw";
import ouroLideraAgenda from "@/content/playbooks/analise/ouro-lidera-agenda-de-alto-valor.md?raw";
import clientesInativosAbrem from "@/content/playbooks/analise/clientes-inativos-ainda-abrem-emails.md?raw";
import resfriadosPorFunil from "@/content/playbooks/analise/resfriados-por-funil.md?raw";

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

  "/analise/esteira-subir-de-ticket/recomendacao-de-venda-adicional-de-ingressos": {
    group: "Esteira · subir de ticket",
    groupEmoji: "🎯",
    agent: "Cassio + Diego",
    title: "recomendação de venda adicional de ingressos",
    summary:
      "Utilize quando o usuário solicitar compradores em uma faixa de preço inferior que se encaixem em uma faixa de preço superior, segmentados em perfis com o produto ou rota adequada para cada perfil.",
    gatilhos: [
      "comprou ticket de R$ 100 a 500",
      "perfil pra comprar R$ 800 a 3.000",
      "subir o ticket",
      "sugere o produto certo pra cada um",
      "qual produto recomendar",
      "venda adicional de ingressos",
      "o melhor próximo produto",
    ],
    perguntas: [
      "Quem comprou ticket de R$ 100 a 500 e tem perfil pra comprar R$ 800 a 3.000?",
      "Me separa quem pode subir de ticket por perfil, com o produto certo pra cada um.",
      "Compradores baratos prontos pro upsell caro — agrupa por perfil (empresa, frequente, convicto).",
      "Qual o melhor próximo produto pra cada comprador da faixa baixa?",
      "Lista de venda adicional de ingressos: quem sobe de faixa e o que oferecer.",
    ],
    ferramentas: [
      "lista_de_produtos",
      "painel_minhas_vendas",
      "metricas_de_atividades_por_lead",
      "esquema_de_filtro_de_leads",
      "leads_search",
      "pergunta",
      "executar",
    ],
    body: recomendacaoVendaIngressos,
    resultId: "ticket-band-upsell-recommendation",
  },

  "/analise/esteira-subir-de-ticket/nao-assinantes-de-alto-valor-que-pagam-apenas-uma-vez": {
    group: "Esteira · subir de ticket",
    groupEmoji: "🎯",
    agent: "Cassio + Diego",
    title: "não assinantes de alto valor que pagam apenas uma vez",
    summary:
      "Utilize quando o usuário solicitar compradores acima de um limite de valor de compra única que não possuam nenhuma assinatura ativa no momento.",
    gatilhos: [
      "pagaram mais de R$ 5 mil",
      "produto único sem assinatura",
      "cliente premium sem mensalidade",
      "premium sem recorrência",
      "ticket alto sem assinatura",
      "Comprador de alto valor",
      "nenhuma assinatura ativa",
      "bilhete único de alto valor",
    ],
    perguntas: [
      "Quem pagou mais de R$ 5 mil numa compra única e não tem nenhuma assinatura ativa?",
      "Lista de clientes premium sem mensalidade — quero oferecer recorrência.",
      "Compradores de alto valor que pagaram só uma vez; quais estão na hora do próximo passo?",
      "Quem comprou produto único caro e nunca virou assinante?",
      "Me mostra os bilhetes únicos de alto valor sem assinatura ativa, priorizados.",
    ],
    ferramentas: [
      "painel_minhas_vendas",
      "lista_de_assinaturas",
      "pergunta",
      "executar",
    ],
    body: naoAssinantesAltoValor,
    resultId: "high-value-one-time-non-subscribers",
  },

  "/analise/retencao/assinantes-inativos-sem-acesso": {
    group: "Retenção",
    groupEmoji: "🩸",
    agent: "Cassio",
    title: "assinantes inativos sem acesso de membro",
    summary:
      "Utilize quando o usuário solicitar assinantes ativos que não acessaram a área de membros por mais de N dias (padrão 14, crítico 30+), com receita recorrente em risco.",
    gatilhos: [
      "assinantes que não logam",
      "paga e parou de usar",
      "não acessa a área de membros",
      "sumiu mas continua pagando",
      "assinantes inativos",
      "assinantes não estão fazendo login",
      "Não consegui acessar a área de membros",
    ],
    perguntas: [
      "Quais assinantes ativos não logam na área de membros há mais de 14 dias?",
      "Quem paga e parou de usar? Quero pegar antes do cancelamento.",
      "Lista de assinantes inativos por gravidade — quanto de MRR tá em risco?",
      "Quem sumiu mas continua pagando a assinatura?",
      "Assinantes que nunca acessaram a área de membros — quem são?",
    ],
    ferramentas: [
      "lista_de_assinaturas",
      "lista_de_usuarios_membros",
      "usuarios_membros_obtidos_por_lead",
      "pergunta",
      "executar",
    ],
    body: assinantesInativosSemAcesso,
    resultId: "inactive-subscribers-no-member-access",
  },
  "/analise/retencao/assinante-inativo-comprou-uma-unica-vez": {
    group: "Retenção",
    groupEmoji: "🩸",
    agent: "Cassio",
    title: "assinante inativo comprou uma única vez",
    summary:
      "Utilize esta opção quando o usuário solicitar leads de clientes finais que cancelaram recentemente uma assinatura e depois retornaram com uma compra única.",
    gatilhos: [
      "cancelou a mensalidade",
      "voltou a comprar avulso",
      "cancelou mas continua comprando",
      "ex-assinante que voltou",
      "Assinatura cancelada e renovada.",
      "Cruzado e depois comprado uma única vez",
      "win-back avulso",
    ],
    perguntas: [
      "Quem cancelou a mensalidade nos últimos 60 dias e voltou a comprar avulso?",
      "Lista de ex-assinantes que voltaram com compra única — quem voltou mais rápido?",
      "Cancelou a assinatura mas continua comprando solto — quem são?",
      "Candidatos a win-back: cancelaram e compraram avulso depois.",
      "Quanto recuperei de quem cancelou e voltou a comprar avulso?",
    ],
    ferramentas: [
      "lista_de_assinaturas",
      "assinaturas_obter",
      "painel_minhas_vendas",
      "pergunta",
      "executar",
    ],
    body: assinanteInativoComprou,
    resultId: "win-back-canceled-then-one-time",
  },
  "/analise/retencao/julgamento-final-ainda-nao-convertido": {
    group: "Retenção",
    groupEmoji: "🩸",
    agent: "Cassio",
    title: "julgamento final ainda não convertido",
    summary:
      "Utilize esta opção quando o usuário solicitar assinantes em período de teste gratuito cujo período de teste termina em breve (janelas de urgência de 3/7/14 dias) e que ainda não se tornaram assinantes pagos.",
    gatilhos: [
      "trial chegando ao fim",
      "trial expirando",
      "ainda não virou pagante",
      "quem está no trial gratuito",
      "Fim do período de teste gratuito",
      "O julgamento está prestes a expirar",
      "Conversão do ensaio clínico em risco",
    ],
    perguntas: [
      "Quem está no trial gratuito e acaba nos próximos 3 dias?",
      "Trials expirando por urgência — quem quase não logou na área de membros?",
      "Lista de quem está testando e ainda não virou pagante, do mais urgente ao menos.",
      "Quais trials acabam em até 7 dias? Quero mandar um incentivo antes.",
      "Quem nunca acessou a área de membros e o trial expira essa semana?",
    ],
    ferramentas: [
      "lista_de_assinaturas",
      "lista_de_usuarios_membros",
      "pergunta",
      "executar",
    ],
    body: julgamentoFinalNaoConvertido,
    resultId: "expiring-trial-not-converted",
  },
  "/analise/comercial-agenda-e-pipeline/reuniao-faltada-nao-remarcada": {
    group: "Comercial · agenda e pipeline",
    groupEmoji: "📞",
    agent: "Vinícius + Lara",
    title: "reunião faltada não remarcada",
    summary:
      "Use quando o usuário solicitar leads cuja reunião foi agendada recentemente, não aconteceu e nunca foi remarcada.",
    gatilhos: [
      "reunião não aconteceu",
      "reunião marcada que sumiu",
      "ninguém remarcou",
      "reuniões perdidas do mês",
      "no-show sem remarcação",
      "reunião perdida",
      "Reunião não remarcada",
    ],
    perguntas: [
      "Quais reuniões dos últimos 30 dias não aconteceram e ninguém remarcou?",
      "Lista de no-shows sem remarcação — quanto de proposta tá parado?",
      "Reuniões perdidas por origem: tem algum anúncio concentrando os furos?",
      "Quem furou a reunião e tem card aberto? Quero priorizar a rediscagem.",
      "Reuniões marcadas que sumiram da agenda — quem são os leads?",
    ],
    ferramentas: [
      "lista_de_atividades_do_sistema",
      "lista_de_atividades_por_lead",
      "leads_get",
      "lista_de_cartões_por_lead",
      "pergunta",
      "executar",
    ],
    body: reuniaoFaltadaNaoRemarcada,
    resultId: "missed-meeting-not-rescheduled",
  },
  "/analise/comercial-agenda-e-pipeline/leads-quentes-sem-contato-recente": {
    group: "Comercial · agenda e pipeline",
    groupEmoji: "📞",
    agent: "Vinícius + Lara",
    title: "leads quentes sem contato recente",
    summary:
      "Utilize esta ferramenta quando o usuário solicitar leads com alta pontuação que estejam sem contato humano por mais de N horas.",
    gatilhos: [
      "leads quentes parados",
      "nota alta sem contato",
      "lead parado há 48 horas",
      "ninguém falou com o lead",
      "leads esfriando",
      "Pedidos promissores sem contato",
      "pistas quentes intocadas",
    ],
    perguntas: [
      "Quais leads com nota alta estão parados há mais de 48h sem ninguém falar?",
      "Qual é o lead mais crítico do dia — nota alta e parado há mais tempo?",
      "Leads quentes esfriando: quem precisa de contato agora e com qual atendente?",
      "Tem lead nota 90+ sem contato humano essa semana?",
      "Ranqueie meus leads parados por urgência (nota × tempo sem contato).",
    ],
    ferramentas: [
      "esquema_de_filtro_de_leads",
      "leads_search",
      "lista_de_atividades_por_lead",
      "pergunta",
      "executar",
    ],
    body: leadsQuentesSemContato,
    resultId: "hot-leads-no-recent-contact",
  },
  "/analise/comercial-agenda-e-pipeline/propostas-enviadas-sem-acompanhamento": {
    group: "Comercial · agenda e pipeline",
    groupEmoji: "📞",
    agent: "Vinícius + Lara",
    title: "propostas enviadas sem acompanhamento",
    summary:
      "Utilize quando o usuário solicitar propostas enviadas há mais de N dias sem nenhum contato posterior.",
    gatilhos: [
      "proposta sem resposta",
      "proposta enviada e ninguém respondeu",
      "propostas paradas",
      "follow-up de proposta",
      "ninguém voltou a falar com o cliente",
      "Propostas sem acompanhamento",
      "propostas paralisadas",
    ],
    perguntas: [
      "Quais propostas enviadas há mais de 7 dias ninguém acompanhou?",
      "Quanto de dinheiro tá parado em proposta sem follow-up?",
      "Lista de propostas paradas por valor — por onde começo?",
      "Propostas no silêncio há mais de 2 semanas: quais são e de quem?",
      "Qual o maior deal parado no stage de proposta sem ninguém voltar a falar?",
    ],
    ferramentas: [
      "lista_de_pipelines",
      "lista_de_etapas",
      "lista_de_cartões",
      "histórico_de_cartas",
      "lista_de_atividades_por_lead",
      "pergunta",
      "executar",
    ],
    body: propostasEnviadasSemAcompanhamento,
    resultId: "proposals-sent-no-follow-up",
  },
  "/analise/comercial-agenda-e-pipeline/ouro-lidera-agenda-de-alto-valor": {
    group: "Comercial · agenda e pipeline",
    groupEmoji: "📞",
    agent: "Vinícius + Lara",
    title: "ouro lidera agenda de alto valor",
    summary:
      "Utilize esta ferramenta quando o usuário solicitar leads qualificados — pontuação alta e renda declarada acima de um determinado limite — sem agendamento de fechamento de negócio, para preencher a agenda de vendas.",
    gatilhos: [
      "leads-ouro",
      "leads qualificados pra fechar",
      "renda declarada acima de",
      "lotar a agenda dos closers",
      "quem agendar com o closer essa semana",
      "lucros de ouro",
      "Leads de alta renda",
      "preencher a agenda de vendas",
    ],
    perguntas: [
      "Quais leads-ouro (score alto + renda ≥ 15k) ainda não têm closer agendado?",
      "Quero lotar a agenda dos closers essa semana — quem qualifica?",
      "Leads de alta renda sem ninguém do comercial em cima: quem são?",
      "Dos leads-ouro, quais já foram clientes? Quero priorizar high-ticket.",
      "Lista pra agenda de fechamento: nome, score, renda e telefone.",
    ],
    ferramentas: [
      "esquema_de_filtro_de_leads",
      "leads_search",
      "lista_de_cartões_por_lead",
      "leads_pagamentos",
      "pergunta",
      "executar",
    ],
    body: ouroLideraAgenda,
    resultId: "gold-leads-high-ticket-agenda",
  },
  "/analise/reativacao/clientes-inativos-ainda-abrem-e-mails": {
    group: "Reativação",
    groupEmoji: "🔄",
    agent: "Diego + Vinícius",
    title: "clientes inativos ainda abrem e-mails",
    summary:
      "Utilize quando o usuário solicitar informações sobre clientes antigos que pararam de comprar há mais de 6 meses, mas ainda abrem os e-mails do espaço de trabalho, segmentados por níveis de gastos históricos.",
    gatilhos: [
      "pararam de comprar mas abrem meus e-mails",
      "cliente antigo que ainda lê",
      "clientes inativos há 6 meses",
      "reativar clientes antigos",
      "clientes inativos",
      "Ainda estou abrindo meus e-mails",
      "Esforço de reconquista em andamento",
    ],
    perguntas: [
      "Quais clientes pararam de comprar há 6+ meses mas ainda abrem meus e-mails?",
      "Lista de reativação por tier: quem são meus 'ouro' sumidos que ainda leem?",
      "Clientes antigos engajados no e-mail — quanto já gastaram comigo?",
      "Quero reconquistar quem já foi cliente e ainda abre — por valor histórico.",
      "Quem comprou, sumiu há meses, mas continua abrindo as campanhas?",
    ],
    ferramentas: [
      "painel_minhas_vendas",
      "lista_de_atividades_do_sistema",
      "pergunta",
      "executar",
    ],
    body: clientesInativosAbrem,
    resultId: "lapsed-customers-still-opening",
  },
  "/analise/reativacao/resfriados-por-funil": {
    group: "Reativação",
    groupEmoji: "🔄",
    agent: "Diego + Vinícius",
    title: "resfriados por funil",
    summary:
      "Utilize quando o usuário solicitar leads que estavam promissores, mas esfriaram sem comprar, agrupados por funil de origem.",
    gatilhos: [
      "leads quentes que esfriaram",
      "estava quente e esfriou",
      "leads frios sem comprar",
      "agrupa pelo funil",
      "cabos resfriados",
      "Pistas promissoras que esfriaram",
      "reativar leads que esfriaram",
    ],
    perguntas: [
      "Quais leads estavam quentes e esfriaram sem comprar? Agrupa por funil.",
      "Resfriados por funil de origem — qual funil concentra mais leads parados?",
      "Quero reativar quem esfriou: separa por funil pra eu dar a oferta certa.",
      "Leads promissores que pararam de interagir há 3+ semanas, por origem.",
      "Quais os leads mais quentes que esfriaram em cada funil?",
    ],
    ferramentas: [
      "esquema_de_filtro_de_leads",
      "leads_search",
      "leads_origens",
      "leads_origens_tree",
      "métricas_de_atividades_por_lead",
      "painel_minhas_vendas",
      "pergunta",
      "executar",
    ],
    body: resfriadosPorFunil,
    resultId: "cooled-leads-by-funnel",
  },
};

export function getPlaybook(pathname: string): Playbook | undefined {
  return playbooks[pathname];
}
