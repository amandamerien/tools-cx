## Quando isso se aplica

O usuário quer **criar UMA página** — estrutura de dobras + copy de cada dobra — para um tipo da taxonomia oficial: **vendas, pre-sell, up-sell, down-sell, checkout, captura, quiz, advertorial, termos, privacidade, obrigado**. A saída é o **blueprint seção a seção** (sequência de dobras + copy pronta por dobra), apresentado para aprovação antes de qualquer montagem — aprovado, a página em si é criada de verdade no Clickmax (nova via `pages_create` ou clone de modelo via `pages_clone`) e publicada com `pages_publish` mediante confirmação própria.

### Diferenciar dos vizinhos

- **Funil inteiro** (várias páginas conectadas, gatilhos, A / B) → furion-funnel-blueprint-design; esse playbook entra depois, página por página.
- **Só a oferta** (preço, stack, bônus, garantia como produto) → furion-offer-creation; aqui a oferta já existe e vira a dobra "Oferta".
- **Reescrever o tom de uma copy existente** → furion-copy-tone-refine; aqui a copy nasce do zero.
- **Sequência de mensagens** (e-mail/WhatsApp) → furion-message-sequence-design.

Tipicamente disparado por: furion-offer-creation (oferta aprovada precisa de página), funil recém-montado com `nodesMissingPage`, e pelo furion-lead-activation-orchestrator quando o plano de ativação pede uma página nova.

## Principais pressupostos

- **Este playbook é o dono das duas taxonomias.** Tipos de página: `vendas, pre-sell, up-sell, down-sell, checkout, captura, quiz, advertorial, termos, privacidade, obrigado`. Dobras (seções granulares): `Headline, Subheadline, VSL (vídeo), Barra de Urgência, Oferta, Pitch, Depoimentos, Garantia, História, Banners, Q&A, Advertorial, Botão, Termos de Uso, Rodapé, Lead, Formulário, Pop-Up`. Toda página é uma sequência dessas dobras — nunca inventar dobra fora da taxonomia.
- **Fluxo em 2 tempos:** (1º) gerar o blueprint completo como resposta — estrutura + copy por dobra; (2º) montar de verdade SOMENTE após confirmação via `question`. Mutação nunca automática.
- **Honestidade de tooling:** o ciclo de vida da página no Clickmax É exposto via MCP — `pages_create` cria o registro da página builder, `pages_clone` duplica uma página-modelo existente (com seu conteúdo), `pages_update_config` ajusta título/favicon/thumbnail e `pages_publish` / `pages_unpublish` colocam/tiram a página do ar. O que o MCP ainda **não** expõe é a edição do conteúdo interno do builder (as dobras em si): a copy do blueprint é aplicada no editor visual. Para página hospedada FORA do Clickmax, `pages_create_external` + `pages_get_external_script` registram a URL e devolvem o script de rastreio.
- **Copy guiada por avatar** (algoritmo do `AvatarPrompt.ts` do Furion, destilado): antes de escrever qualquer dobra, preencher os campos que mudam a copy — `Primary Goal`, `Primary Complaint`, `Promises`, `Objections`, `False Solutions`, `Mistaken Beliefs`, `Ultimate Fear`, `Common Enemy`, `Convincing Evidence`, `Expensive Alternatives`. Sem avatar, a copy sai genérica — o anti-pattern nº 1.
- **Imagens — regra do Furion** (`HTMLGeneratorPrompt.ts`, seção de imagens): nunca inventar URL. Só usar imagens que o usuário forneceu/aprovou (`availableImages`). Se não há imagem, a dobra sai em versão só-texto (tipografia, ícones, cor) — jamais placeholder ou URL fabricada. Vale igual para vídeo da dobra VSL e fotos de Depoimentos.
- **Design system destilado da SECTION 6 do `HTMLGeneratorPrompt.ts`:** hierarquia tipográfica clara (headline muito maior que o corpo), uma cor primária consistente em todos os CTAs, fundos alternando claro/neutro entre dobras, espaçamento generoso (nunca apertar elementos), mobile-first, todo elemento interativo com estado de hover. O blueprint anota essas diretrizes por dobra; o editor aplica.
- **Edição incremental (algoritmo do `HTMLRefeedPrompt.ts`):** quando a página JÁ existe e o pedido é mudar algo, alterar SÓ a dobra pedida e preservar todo o resto — copy, ordem, estilo, imagens. Nunca "melhorar" o que não foi pedido.
- O contexto do negócio vem do Clickmax (`products_list` / `products_get` para o catálogo, `dashboard_my_sales` para preço/ticket real) — nunca pedir `workspaceId`.
- **Prompts exatos (verbatim):** `furion-page-section-blueprint.prompt.md` — HTMLGeneratorPrompt + HTMLRefeedPrompt completos; aproveitar seções de landing, design system e regras de imagem (ignorar detalhes de build Vite/JSON).

## Processo de pensamento

1. **Classificar o tipo de página** na taxonomia. Se o pedido for ambíguo ("faz uma landing page"), inferir pelo objetivo: capturar lead → `captura`; vender direto → `vendas`; pós-compra → `up-sell` / `obrigado`. Confirmar só se a ambiguidade mudar a estrutura.
2. **Ler o contexto antes de escrever:** `products_get` do produto-alvo (nome, preço, entregáveis) e `dashboard_my_sales` para o ticket real. Página de up-sell/down-sell precisa também do produto de origem (o que a pessoa acabou de comprar).
3. **Montar o avatar mínimo** com os campos do `AvatarPrompt.ts` que alimentam as dobras (veja tabela dobra→avatar no Execute guide). O que o dado não responder vira pergunta aberta no Report — não inventar dor que o nicho não tem.
4. **Gerar o blueprint dobra a dobra** na sequência recomendada para o tipo (mapa no código), com a cópia de cada dobra escrita a partir do avatar: Headline carrega a promessa + mecanismo único; Pitch desmonta as False Solutions; Q&A converte Objeções em perguntas.
5. **Dois tempos, sempre:** apresentar o blueprint → `question` ("aprova? crio a página?") → só então criar a página de verdade: `pages_create` (builder, do zero), `pages_clone` (a partir de página-modelo descoberta em `pages_list`) ou `pages_create_external` (hospedada fora). `pages_publish` é um terceiro tempo, com confirmação própria — coloca a página no ar. A cópia das dobras é aplicada no editor visual a partir do blueprint.

## Guia de execução

Usar `execute` para ler o contexto (produto + vendas) e montar o objeto blueprint estruturado — a copy final de cada dobra é escrita na resposta em cima desse esqueleto.

**Entradas padrão:**

- `pageType = 'vendas'`
- `productSearch = null` (nome citado pelo usuário, se houver)
- `availableImages = []` (URLs reais fornecidas pelo usuário — nunca inventar)

**Formato de saída esperado:**

- `pageType`
- `product` (id, nome, preço)
- `avatarGaps` (campos do avatar sem resposta no dado)
- `sections` — conjunto de `{ order, section, goal, avatarFields, copyDirectives, imagePolicy }`
- `designRules`

**Código de exemplo:**

```js
async () => {
  // Inputs padrão — ajustar conforme o pedido do usuário.
  const pageType = 'vendas';
  const productSearch = null;
  const availableImages = []; // somente URLs reais aprovadas pelo usuário

  // FASE 1 — contexto: catálogo e ticket reais do workspace (nunca pedir workspaceId).
  const productsResp = await codemode.products_list({ search: productSearch || undefined, perPage: 20 });
  const products = productsResp?.data || productsResp || [];
  const productHit = products[0] || null;
  const product = productHit ? await codemode.products_get({ productId: productHit.id }) : null;

  // Ticket real ajuda a calibrar âncora de preço da dobra Oferta.
  const sales = await codemode.dashboard_my_sales({ filters: { transactionStatus: ['paid'] }, perPage: 200, column: 'createdAt', order: 'desc' });
  const paidRows = sales?.data || [];
  const avgTicketCents = paidRows.length
    ? Math.round(paidRows.reduce((s, r) => s + Number(r.value || r.amount || 0), 0) / paidRows.length)
    : null;

  // FASE 2 — avatar mínimo (campos do AvatarPrompt.ts do Furion que mudam a copy).
  const avatar = {
    primaryGoal: null, primaryComplaint: null, promises: [], objections: [],
    falseSolutions: [], mistakenBeliefs: [], ultimateFear: null, commonEnemy: null,
    convincingEvidence: [], expensiveAlternatives: []
  };
  const avatarGaps = Object.entries(avatar)
    .filter(([, v]) => v === null || (Array.isArray(v) && v.length === 0))
    .map(([k]) => k);

  // FASE 3 — sequência de dobras por tipo de página (taxonomia oficial deste playbook).
  const sequences = {
    'vendas': ['Barra de Urgência', 'Headline', 'Subheadline', 'VSL', 'Pitch', 'História', 'Oferta', 'Depoimentos', 'Garantia', 'Q&A', 'Botão', 'Termos de Uso', 'Rodapé'],
    'pre-sell': ['Headline', 'Advertorial', 'História', 'Pitch', 'Botão', 'Rodapé'],
    'up-sell': ['Headline', 'Subheadline', 'VSL', 'Oferta', 'Garantia', 'Botão', 'Rodapé'],
    'down-sell': ['Headline', 'Pitch', 'Oferta', 'Garantia', 'Botão', 'Rodapé'],
    'checkout': ['Barra de Urgência', 'Oferta', 'Formulário', 'Depoimentos', 'Garantia', 'Q&A', 'Termos de Uso', 'Rodapé'],
    'captura': ['Headline', 'Subheadline', 'Lead', 'Formulário', 'Botão', 'Rodapé'],
    'quiz': ['Headline', 'Subheadline', 'Formulário', 'Botão', 'Rodapé'],
    'advertorial': ['Headline', 'Advertorial', 'História', 'Depoimentos', 'Botão', 'Rodapé'],
    'termos': ['Termos de Uso', 'Rodapé'],
    'privacidade': ['Termos de Uso', 'Rodapé'],
    'obrigado': ['Headline', 'Subheadline', 'Botão', 'Rodapé']
  };

  // O que cada dobra precisa conter + de quais campos do avatar a copy nasce.
  const sectionSpecs = {
    'Headline': { goal: 'promessa central + mecanismo único, sem revelar o como', avatarFields: ['primaryGoal', 'promises'], copyDirectives: 'lead controverso ou promessa específica com prazo; nunca genérico' },
    'Subheadline': { goal: 'especificar a promessa e remover o atrito principal', avatarFields: ['primaryComplaint'], copyDirectives: 'promessa SEM a dor nº 1 ("sem X, mesmo que Y")' },
    'VSL': { goal: 'vídeo de vendas como prova e pitch principal', avatarFields: ['convincingEvidence'], copyDirectives: 'usar SÓ vídeo real fornecido; se não houver, marcar a dobra como pendente — nunca inventar URL' },
    'Barra de Urgência': { goal: 'escassez/prazo real no topo', avatarFields: [], copyDirectives: 'só urgência verdadeira (lote, prazo, bônus que expira); urgência falsa destrói confiança' },
    'Oferta': { goal: 'stack de valor, preço ancorado, bônus, condições', avatarFields: ['expensiveAlternatives'], copyDirectives: 'ancorar contra alternativas caras; itemizar o stack com valor unitário antes do preço final' },
    'Pitch': { goal: 'conceito-chave + por que tudo que o avatar tentou falhou', avatarFields: ['falseSolutions', 'mistakenBeliefs', 'commonEnemy'], copyDirectives: 'estrutura: conceito-chave → False Solutions desmontadas uma a uma → virada pro mecanismo único' },
    'Depoimentos': { goal: 'prova social específica', avatarFields: ['convincingEvidence'], copyDirectives: 'somente depoimentos reais; com resultado mensurável; nunca fabricar nome/foto' },
    'Garantia': { goal: 'reverter o risco da compra', avatarFields: ['objections', 'ultimateFear'], copyDirectives: 'garantia tripla: incondicional (prazo) + condicional (resultado) + de suporte' },
    'História': { goal: 'jornada que conecta dor → descoberta do mecanismo', avatarFields: ['primaryComplaint', 'ultimateFear'], copyDirectives: 'narrativa em 1ª pessoa: fundo do poço → tentativas falhas (False Solutions) → descoberta' },
    'Banners': { goal: 'reforço visual entre blocos', avatarFields: [], copyDirectives: 'somente imagens de availableImages; sem imagem aprovada, omitir a dobra' },
    'Q&A': { goal: 'matar objeções restantes', avatarFields: ['objections'], copyDirectives: 'cada objeção/confusão do avatar vira UMA pergunta com resposta direta; 5-8 itens' },
    'Advertorial': { goal: 'dobra editorial que não parece anúncio', avatarFields: ['commonEnemy', 'mistakenBeliefs'], copyDirectives: 'tom jornalístico; manchete de descoberta, não de venda' },
    'Botão': { goal: 'CTA único e repetível', avatarFields: ['primaryGoal'], copyDirectives: 'verbo + benefício ("QUERO [resultado]"); um único destino por página' },
    'Termos de Uso': { goal: 'compliance', avatarFields: [], copyDirectives: 'links para termos/privacidade; disclaimers de resultado' },
    'Rodapé': { goal: 'fechamento institucional', avatarFields: [], copyDirectives: 'razão social, contato, links legais' },
    'Lead': { goal: 'abertura de texto que segura a leitura (captura/advertorial)', avatarFields: ['primaryComplaint', 'commonEnemy'], copyDirectives: 'primeiro parágrafo nomeia a dor exata e promete a virada em troca do e-mail' },
    'Formulário': { goal: 'coletar o mínimo necessário', avatarFields: [], copyDirectives: 'menos campos = mais conversão; captura = nome + e-mail/WhatsApp; checkout = só o exigido pelo pagamento' },
    'Pop-Up': { goal: 'resgatar quem vai sair (exit intent)', avatarFields: ['promises'], copyDirectives: 'oferta alternativa (isca/down-sell), nunca repetir o CTA principal' }
  };

  // FASE 4 — montar o blueprint na ordem recomendada, com política de imagem por dobra.
  const sequence = sequences[pageType] || sequences['vendas'];
  const sections = sequence.map((name, i) => ({
    order: i + 1,
    section: name,
    goal: sectionSpecs[name].goal,
    avatarFields: sectionSpecs[name].avatarFields,
    copyDirectives: sectionSpecs[name].copyDirectives,
    imagePolicy: availableImages.length > 0
      ? 'usar somente availableImages, em container de proporção fixa'
      : 'sem imagem aprovada: versão só-texto (tipografia, ícones, cor)'
  }));

  return {
    pageType,
    product: product ? { id: product.id, name: product.name, priceCents: product.price ?? null } : null,
    avgTicketCents,
    avatarGaps,
    sections,
    designRules: [
      'hierarquia tipográfica: headline >> seção >> corpo',
      'uma cor primária consistente em todos os CTAs',
      'fundos alternando claro/neutro entre dobras',
      'espaçamento generoso; mobile-first; hover em todo elemento interativo'
    ]
  };
};
```

**Montagem real (2º tempo) — SOMENTE após aprovação via `question`.** Caminho A: página builder no Clickmax (`pages_create` do zero, ou `pages_clone` quando já existe página-modelo aprovada):

```js
async () => {
  // Ordem exata: resolver projectId → criar (ou clonar) a página → ajustar config.
  // NÃO publicar aqui: pages_publish é approval-write, com confirmação própria (3º tempo).
  const projetos = await codemode.projects_filters();
  const projectId = (projetos || [])[0]?.id; // usar o projeto certo do contexto, não o primeiro às cegas

  // Opcional: clonar uma página-modelo já aprovada em vez de criar do zero.
  const existentes = await codemode.pages_list({ perPage: 50 });
  const modelo = (existentes?.data || []).find((p) => p.name === '[página-modelo]') || null;

  // Shape exato de CreatePageBody/ClonePageBody vem do SDK gerado (@clickmax/editor3-sdk);
  // conferir no worker antes de adicionar campos além dos abaixo.
  const page = modelo
    ? await codemode.pages_clone({ pageId: modelo.id, name: 'Página de vendas — [produto]' })
    : await codemode.pages_create({ name: 'Página de vendas — [produto]', projectId });

  await codemode.pages_update_config({
    pageId: page.id,
    data: { title: 'Página de vendas — [produto]' } // título/favicon/thumbnail (builder-only)
  });

  return {
    pageId: page.id,
    nextActions: [
      'aplicar a copy das dobras no editor visual (conteúdo do builder ainda não é editável via MCP)',
      'pages_publish SOMENTE após confirmação separada do usuário',
      'conectar ao funil via funnels_node_connect_page (semântica no furion-funnel-blueprint-design)'
    ]
  };
};
```

Caminho B (mesmo gate do 2º tempo — SOMENTE após aprovação via `question`): página hospedada fora do Clickmax — registrar a URL + entregar o script de rastreio:

```js
async () => {
  // Ordem exata: registrar a URL externa → pegar o script de rastreio → entregar pro usuário.
  // Shape exato de CreateExternalPageBody vem do SDK gerado; conferir no worker.
  const page = await codemode.pages_create_external({
    name: 'Página de vendas — [produto]',
    url: 'https://exemplo.com/pagina-aprovada' // URL real informada pelo usuário
  });
  const script = await codemode.pages_get_external_script({ pageId: page.id });
  return { pageId: page.id, installScript: script };
};
```

## Relatório

- Abrir com a premissa: tipo de página, produto-alvo e o que veio do dado ("ticket médio real de R$ X usado como âncora da Oferta").
- Apresentar o blueprint dobra a dobra, na ordem: nome da dobra → objetivo → a copy pronta (headline literal, parágrafos do pitch, as 5-8 perguntas do Q&A…). Copy real, não descrição de copy.
- Listar `avatarGaps` como perguntas abertas ("não achei no dado: qual o medo nº 1 desse público? Respondendo, eu refino a História e a Garantia").
- Se houver mais de ~8 dobras com copy longa, mostrar as principais completas e resumir o resto com "+N dobras detalhadas sob demanda".
- Fechar com a confirmação explícita via `question`: "Aprova o blueprint? Crio a página no Clickmax (nova ou clone de modelo) ou registro a externa?" — nunca montar sem isso. Publicação (`pages_publish`) pede uma confirmação à parte.
- Deixar claro o limite real: o Max cria/clona/configura/publica a página via MCP, mas a copy das dobras é aplicada no editor visual — entregar estrutura + copy prontas pra colar.

## Avisos

- O conteúdo interno do builder (as dobras) ainda não é editável via MCP — mas o ciclo de vida da página é: `pages_create`/`pages_clone` criam o registro, `pages_update_config` ajusta título/favicon e `pages_publish` coloca no ar. `pages_publish`/`pages_unpublish` são approval-write: confirmação própria, nunca no mesmo passo da criação. Não prometer a copy "montada" dentro do builder — ela é aplicada no editor.
- Os shapes de `CreatePageBody`/`ClonePageBody`/`CreateExternalPageBody` vêm do SDK gerado (`@clickmax/editor3-sdk`) e não estão documentados campo a campo — conferir no worker antes de inventar campo; `pages_clone` e `pages_publish`/`pages_update_config` são builder-only (página externa rejeita).
- Nunca inventar URL de imagem, vídeo ou depoimento (regra dura do `HTMLGeneratorPrompt.ts` do Furion): sem asset aprovado, a dobra sai só-texto ou é marcada como pendente. Placeholder fabricado = quebra de confiança e layout.
- Ao editar página existente, preservar tudo que não foi pedido (`HTMLRefeedPrompt.ts`): mudar só a dobra citada; não "melhorar" cópia, ordem ou estilo por conta própria.
- Urgência falsa na Barra de Urgência (contador que reinicia, "últimas vagas" eternas) queima a página inteira — só escassez verdadeira.
- Página de termos/privacidade é jurídica: gerar rascunho e recomendar revisão humana, nunca entregar como definitivo.
- Preço/ticket vêm em centavos — converter pra R$ só na exibição.
- Copy sem avatar preenchido sai genérica; declarar as lacunas em vez de inventar dores que o dado não mostra.

## Antipadrões

- Pular o avatar e escrever direto — o erro nº 1; a copy vira template vazio.
- Inventar dobra fora da taxonomia ou embaralhar a sequência sem motivo declarado.
- Gerar o blueprint e já chamar `pages_create`/`pages_clone`/`pages_create_external` sem `question` — mutação nunca automática; `pages_publish` exige confirmação adicional própria.
- Inventar depoimento, número de alunos ou print de resultado pra dobra de Depoimentos.
- Tratar esse playbook como criador de funil — funil é outro job; aqui é UMA página.
- Responder com descrição de copy ("aqui vai uma headline persuasiva") em vez da copy literal.
- Pedir `workspaceId` ou pedir o catálogo ao usuário quando `products_list` resolve.

---

📜 [Ver o prompt exato do Furion usado por este playbook →](/prompts/furion-page-section-blueprint-prompt)
