## fluxos/fluxos.ts — Fluxos (automações)

**Objetivo** = construir/gerenciar um fluxo de automação passo a passo (o gráfico de etapas), nó por nó.

**Escopo** = local do espaço de trabalho | um fluxo pertence a um projeto | edições granulares apenas enquanto `draft`/`template`

**Modelo de fluxo:**
- Um fluxo é um gráfico de etapas (`FlowsStep`) conectadas por cada etapa `target`.
- `target` = um ID de etapa única (linear) OU um mapa `{ <handle>: stepId }` para ramificação (ex: `true`/`false` em condicional/tempo limite/espera, IDs de botão em `send_message`)
- A entrada é um passo `trigger`; `Flows.startStepId` sempre aponta para ele.
- tipos de etapas = `trigger` `action` `conditional` `delay` `invoke` `sequence` `send_message` `collect` `timeout` `wait` `debug` `randomizer` `instagram_*` `postit`
- Os gatilhos (o que inicia/encerra o fluxo) são eventos com restrições, definidas na etapa do gatilho.

**Regras:**
- Edições granulares de etapas são permitidas somente enquanto `draft`/`template`; `scheduled`/ativo/fechado/arquivado rejeitam edições (um trabalho enfileirado de um fluxo agendado não é ressincronizado por esta API).
- A criação da etapa `trigger` a torna a entrada (conjuntos `startStepId`); um fluxo tem no máximo uma etapa de gatilho.
- Conecte a saída de uma etapa com `flows_step_connect`: omita `handle` para uma etapa linear `target`; passe `handle` (`true`/`false`/id do botão) para uma ramificação; `target: null` desconecta.
- Passos `action` requerem um `action` nome; o formato `input` do passo é específico para cada tipo.
- Excluir uma etapa também remove quaisquer etapas `target` que apontassem para ela.

**Dicas para o consumidor:**
- Resolva primeiro o fluxo de destino (`flows_list` para encontrar pelo nome ou `flows_create` para um novo).
- Fluxo de construção recomendado = `flows_create` → `flows_step_create` (gatilho, com `triggerStart`/`triggerExit` embutido ou via `flows_step_triggers_set`) → `flows_step_create` (ações/condicionais) → `flows_step_connect` → `flows_validate` → `flows_activate` (após o usuário confirmar)
- Modos de ciclo de vida: `draft` (editável) → `active`/`scheduled` (em execução) → `closed` → `archived`; a etapa grava apenas em `draft`/`template`.
- usado `flows_structure_get` para ler os IDs reais dos passos e as arestas antes de conectar.
- `flows_validate` relatórios: gatilho de entrada ausente, alvos pendentes (apontam para uma etapa removida), etapas órfãs.
