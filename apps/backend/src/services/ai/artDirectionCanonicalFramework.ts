export type ArtDirectionFrameworkLayer = {
  key: string;
  title: string;
  description: string;
  prompts: string[];
};

export type ArtDirectionBriefingField = {
  key: string;
  label: string;
  description: string;
};

export type ArtDirectionCritiqueAxis = {
  key: string;
  label: string;
  question: string;
};

export type ArtDirectionOperatingSystemLayer = {
  key: string;
  title: string;
  question: string;
  output: string;
};

export type ArtDirectionResultCriterion = {
  key: string;
  label: string;
  description: string;
  weight: number;
};

export type ArtDirectionRepertoireMapping = {
  key: string;
  problem: string;
  dominantRepertoires: string[];
  desiredEffect: string;
  principalRisk: string;
  bestFor: string[];
};

export type ArtDirectionIntelligenceLayer = {
  key: string;
  title: string;
  role: string;
  sources: string[];
  output: string;
};

export type ArtDirectionSpecializedModule = {
  key: string;
  title: string;
  function: string;
  coreQuestion: string;
  dominantRepertoires: string[];
  successCriteria: string[];
  antipatterns: string[];
};

export type ArtDirectionOperationalArtifact = {
  key: string;
  title: string;
  purpose: string;
  steps: string[];
};

export type ArtDirectionCanonicalFramework = {
  title: string;
  thesis: string;
  operatorRole: string;
  directionFormula: string;
  layers: ArtDirectionFrameworkLayer[];
  commandments: string[];
  briefingSchema: ArtDirectionBriefingField[];
  critiqueAxes: ArtDirectionCritiqueAxis[];
  workflowPhases: Array<{ key: string; title: string; description: string }>;
  operatingSystem: ArtDirectionOperatingSystemLayer[];
  resultCriteria: ArtDirectionResultCriterion[];
  repertoireMatrix: ArtDirectionRepertoireMapping[];
  intelligenceStack: ArtDirectionIntelligenceLayer[];
  specializedModules: ArtDirectionSpecializedModule[];
  operationalArtifacts: ArtDirectionOperationalArtifact[];
};

export const EDRO_DA_IA_CANONICAL_FRAMEWORK: ArtDirectionCanonicalFramework = {
  title: 'Framework Canônico do DA-IA e Edro OS Visual',
  thesis:
    'A IA visual da Edro não deve receber pedidos de estética solta. Ela deve receber problema, percepção, repertório, prova, estrutura e crítica com precisão operacional para virar campanha, não só imagem.',
  operatorRole:
    'Quem opera o motor não está usando uma ferramenta de imagem. Está dirigindo um diretor de arte cego, rápido, obediente, literal demais e incapaz de julgar sozinho o que é estrategicamente certo.',
  directionFormula: 'Função > sensação > linguagem > execução',
  layers: [
    {
      key: 'function',
      title: '1. Pedir função, não imagem',
      description:
        'Toda peça começa pelo problema de comunicação. A IA precisa saber o que deve mover na percepção, no entendimento ou na venda antes de produzir estética.',
      prompts: [
        'Que percepção essa peça precisa construir?',
        'Qual problema real de comunicação precisa ser resolvido?',
        'A peça precisa vender, provar, explicar, diferenciar ou posicionar?',
      ],
    },
    {
      key: 'perception_bounds',
      title: '2. Definir o que a marca deve parecer e o que não pode parecer',
      description:
        'A IA preenche lacunas com clichês. Por isso o campo positivo e o campo negativo precisam ser explícitos.',
      prompts: [
        'A marca precisa parecer robusta, humana, premium acessível ou inovadora?',
        'O que seria erro de leitura: stock, fria, elitista, infantil, genérica?',
      ],
    },
    {
      key: 'repertoire',
      title: '3. Dirigir repertório, não só adjetivos',
      description:
        'O operador deve escolher território visual, tradição de linguagem e grau de polimento adequados ao problema.',
      prompts: [
        'Qual repertório dominante resolve este caso?',
        'Precisamos de documental premium, poster design, vernacular, editorial, tech minimal ou outro território?',
      ],
    },
    {
      key: 'staged_work',
      title: '4. Trabalhar em etapas',
      description:
        'O motor rende melhor quando passa por diagnóstico, território visual, estrutura da peça, refinamento e sistema.',
      prompts: [
        'Qual é o foco principal da peça?',
        'Headline ou imagem manda?',
        'Como isso vira campanha e não só hero isolado?',
      ],
    },
    {
      key: 'exploration',
      title: '5. Usar a IA para explorar caminhos',
      description:
        'A IA abre possibilidades. O humano escolhe direção, corta exagero, decide risco e transforma soluções isoladas em sistema.',
      prompts: [
        'Quais 3 a 5 famílias visuais vale testar primeiro?',
        'Que exageros precisam ser cortados para virar sistema de campanha?',
      ],
    },
    {
      key: 'briefing',
      title: '6. Dar briefing como diretor',
      description:
        'O comando ideal tem objetivo, percepção, público, território visual, composição, cena, nível de realismo, restrições e critério de sucesso.',
      prompts: [
        'Quem precisa se reconhecer na peça?',
        'Qual linguagem visual serve melhor ao público e ao canal?',
        'Qual é o critério de sucesso da imagem?',
      ],
    },
    {
      key: 'critique',
      title: '7. Criticar com precisão',
      description:
        'O loop de revisão deve apontar falhas em clareza, verdade, sistema, canal, repertório e tom. "Não gostei" é crítica fraca.',
      prompts: [
        'A imagem está bonita mas errada para o público?',
        'O repertório está premium demais, pouco documental ou pouco confiável?',
        'A composição dispersou o foco principal?',
      ],
    },
  ],
  commandments: [
    'Dar problema, não só estética.',
    'Dar direção, não só adjetivo.',
    'Dar limites negativos com a mesma clareza dos positivos.',
    'Iterar por critério, não por gosto solto.',
    'Usar a IA para explorar e acelerar, não para pensar sozinha.',
  ],
  briefingSchema: [
    { key: 'objective', label: 'Objetivo da peça', description: 'O que a comunicação precisa causar ou resolver.' },
    { key: 'desired_perception', label: 'Percepção desejada', description: 'Como a marca deve ser percebida.' },
    { key: 'avoid_perception', label: 'Percepção a evitar', description: 'Que leitura seria erro.' },
    { key: 'audience', label: 'Público', description: 'Quem precisa se reconhecer, confiar ou agir.' },
    { key: 'visual_territory', label: 'Território visual', description: 'Qual linguagem resolve o caso.' },
    { key: 'composition', label: 'Composição', description: 'Qual é o foco e a lógica do layout.' },
    { key: 'scene', label: 'Cena ou estrutura', description: 'O que aparece, em que escala e contexto.' },
    { key: 'realism', label: 'Realismo ou estilização', description: 'Quão documental, gráfico, publicitário ou ilustrado deve ser.' },
    { key: 'constraints', label: 'Restrições', description: 'O que não pode acontecer na imagem.' },
    { key: 'success_criteria', label: 'Critério de sucesso', description: 'Como saber se a peça acertou.' },
  ],
  critiqueAxes: [
    { key: 'clarity', label: 'Clareza', question: 'A peça comunica rápido?' },
    { key: 'coherence', label: 'Coerência', question: 'A estética combina com a promessa da marca?' },
    { key: 'adequacy', label: 'Adequação', question: 'Serve ao público e ao canal?' },
    { key: 'memorability', label: 'Memorabilidade', question: 'Existe imagem mental forte?' },
    { key: 'ownership', label: 'Propriedade', question: 'Parece da marca ou parece genérico?' },
    { key: 'system', label: 'Sistema', question: 'Consegue virar campanha?' },
    { key: 'truth', label: 'Verdade', question: 'Parece crível e sustentado pela operação da marca?' },
    { key: 'desire', label: 'Desejo', question: 'Gera atração, confiança ou vontade?' },
  ],
  workflowPhases: [
    { key: 'diagnosis', title: 'Diagnóstico visual', description: 'Problema, percepção desejada, percepção a evitar, público, canal e função.' },
    { key: 'territory', title: 'Território visual', description: 'Linguagem dominante, repertório e tradição visual adequados.' },
    { key: 'structure', title: 'Estrutura da peça', description: 'Foco, apoio, hierarquia, presença humana, hero shot ou cena.' },
    { key: 'refinement', title: 'Refinamento', description: 'Luz, composição, contraste, materiais, expressão e coerência com a marca.' },
    { key: 'system', title: 'Sistema', description: 'Como a peça hero vira campanha, variações e repertório reaproveitável.' },
  ],
  operatingSystem: [
    {
      key: 'diagnosis',
      title: '1. Diagnóstico',
      question: 'Qual problema real de negócio e comunicação estamos resolvendo?',
      output: 'Problema, objetivo, barreira e oportunidade em uma leitura executável.',
    },
    {
      key: 'truth',
      title: '2. Verdade',
      question: 'O que o público sente, o mercado distorce e a marca realmente pode provar?',
      output: 'Uma verdade central forte o bastante para sustentar criação e venda.',
    },
    {
      key: 'tension',
      title: '3. Tensão',
      question: 'Qual contradição energiza a história e impede a campanha de ficar morna?',
      output: 'Um conflito criativo claro, como escala x proximidade ou economia x qualidade.',
    },
    {
      key: 'transformation',
      title: '4. Transformação',
      question: 'O que precisa mudar na percepção, na emoção ou na ação do público?',
      output: 'Um antes e depois invisível que a campanha precisa provocar.',
    },
    {
      key: 'territory',
      title: '5. Território',
      question: 'Que linguagem torna essa verdade memorável e útil?',
      output: 'A escolha entre símbolo, analogia, tese, narrativa, demonstração ou contraste.',
    },
    {
      key: 'big_idea',
      title: '6. Big Idea',
      question: 'Qual frase-mãe e qual imagem mental organizam a campanha inteira?',
      output: 'Uma ideia central nomeável, visualizável e defendível.',
    },
    {
      key: 'proof',
      title: '7. Prova',
      question: 'Por que alguém acreditaria nisso além da estética?',
      output: 'Mapa de evidências operacionais, econômicas, históricas ou demonstrativas.',
    },
    {
      key: 'campaign_system',
      title: '8. Sistema de campanha',
      question: 'Como isso vive em filme, social, performance, deck, PDV e recorrência?',
      output: 'Uma arquitetura de desdobramento, não uma peça hero isolada.',
    },
  ],
  resultCriteria: [
    {
      key: 'strategic_clarity',
      label: 'Clareza estratégica',
      description: 'A peça deixa nítido o que a marca quer mover, vender ou reposicionar.',
      weight: 15,
    },
    {
      key: 'brand_truth',
      label: 'Verdade da marca',
      description: 'A linguagem visual parece coerente com o que a marca pode sustentar.',
      weight: 12,
    },
    {
      key: 'visual_tension',
      label: 'Tensão visual',
      description: 'A forma encena o conflito certo e evita peças lisas demais.',
      weight: 10,
    },
    {
      key: 'hierarchy',
      label: 'Hierarquia',
      description: 'O olho entra onde precisa e entende sem esforço o que vem primeiro, depois e por fim.',
      weight: 10,
    },
    {
      key: 'potency',
      label: 'Potência',
      description: 'Existe presença, foco dominante e força suficiente para marcar a campanha.',
      weight: 10,
    },
    {
      key: 'desire',
      label: 'Desejo',
      description: 'A peça gera atração, vontade, confiança ou sensação de valor.',
      weight: 10,
    },
    {
      key: 'proof',
      label: 'Prova',
      description: 'A estética não flutua sozinha; ela convive com evidência, operação ou consequência real.',
      weight: 10,
    },
    {
      key: 'memorability',
      label: 'Memorabilidade',
      description: 'A imagem deixa alguma marca mental forte depois que o logo some.',
      weight: 9,
    },
    {
      key: 'system',
      label: 'Sistema',
      description: 'A ideia abre família, campanha e recorrência sem morrer na capa do deck.',
      weight: 8,
    },
    {
      key: 'channel_fit',
      label: 'Aderência ao canal',
      description: 'O tratamento visual respeita o tempo de leitura, a escala e a função do suporte.',
      weight: 6,
    },
  ],
  repertoireMatrix: [
    {
      key: 'credibility',
      problem: 'Falta de credibilidade',
      dominantRepertoires: ['Documental premium', 'Operação real', 'Editorial limpo', 'Institucional contemporâneo'],
      desiredEffect: 'Fazer a marca parecer verdadeira, robusta, transparente e séria.',
      principalRisk: 'Virar fantasia publicitária ou peça polida demais para um setor que pede lastro.',
      bestFor: ['Infraestrutura', 'Logística', 'Saúde', 'B2B', 'Institucional'],
    },
    {
      key: 'commoditization',
      problem: 'Comoditização',
      dominantRepertoires: ['Símbolo forte', 'Graphic bold', 'Metáfora visual', 'Sistema visual proprietário'],
      desiredEffect: 'Criar distinção, personalidade e assinatura onde a categoria fala tudo igual.',
      principalRisk: 'Ficar diferente sem ficar relevante, virando criatividade autocentrada.',
      bestFor: ['Reposicionamento', 'Lançamento', 'Branding', 'Campanha institucional'],
    },
    {
      key: 'low_value',
      problem: 'Baixa percepção de valor',
      dominantRepertoires: ['Hero shot', 'Premium acessível', 'Detalhismo controlado', 'Composição refinada'],
      desiredEffect: 'Aumentar desejo e qualidade percebida sem afastar o público real.',
      principalRisk: 'Superestetizar e empurrar a marca para um luxo incompatível com sua verdade.',
      bestFor: ['Imobiliário', 'Serviços premium', 'Hospitalidade', 'Reposicionamento'],
    },
    {
      key: 'lack_of_clarity',
      problem: 'Falta de clareza',
      dominantRepertoires: ['Design de informação', 'UX visual', 'Didatismo gráfico', 'Comparação visual'],
      desiredEffect: 'Simplificar o complexo e fazer o público entender rápido sem sentir burocracia.',
      principalRisk: 'Secar demais a comunicação e matar magnetismo ou personalidade.',
      bestFor: ['Tecnologia', 'Fintech', 'Serviços novos', 'Explicativos', 'Onboarding'],
    },
    {
      key: 'low_emotion',
      problem: 'Falta de conexão emocional',
      dominantRepertoires: ['Cinema', 'Fotografia humana observacional', 'Cotidiano', 'Storytelling visual'],
      desiredEffect: 'Gerar humanidade, afeto, identificação e densidade de mundo.',
      principalRisk: 'Virar piegas, melodramático ou família de comercial genérica.',
      bestFor: ['Institucional', 'Datas comemorativas', 'Employer branding', 'Causas', 'Território'],
    },
    {
      key: 'fast_sale',
      problem: 'Precisa vender rápido',
      dominantRepertoires: ['Varejo bem hierarquizado', 'Oferta clara', 'Contraste alto', 'Resposta direta'],
      desiredEffect: 'Fazer a pessoa entender em segundos por que agir agora.',
      principalRisk: 'Virar gritaria visual e corroer o valor de marca.',
      bestFor: ['Performance', 'Promoção', 'PDV', 'Mídia de resposta direta'],
    },
    {
      key: 'low_proximity',
      problem: 'Falta de proximidade',
      dominantRepertoires: ['Vernacular', 'Cultura local', 'Pessoas reais', 'Códigos do cotidiano'],
      desiredEffect: 'Trazer calor humano, identificação e pertencimento.',
      principalRisk: 'Virar caricatura popular ou forçar uma intimidade que a marca não sustenta.',
      bestFor: ['Varejo popular', 'Regional', 'Serviços', 'Mobilidade', 'Comunitário'],
    },
    {
      key: 'need_innovation',
      problem: 'Precisa parecer inovador',
      dominantRepertoires: ['Tech minimal', 'Sistemas modulares', 'Interface language', 'Motion thinking'],
      desiredEffect: 'Comunicar evolução, inteligência e precisão sem clichê futurista.',
      principalRisk: 'Cair no neon azul, no holograma genérico e na estética de tech vazia.',
      bestFor: ['Tecnologia', 'Mobilidade', 'Dados', 'Fintech', 'Transformação digital'],
    },
    {
      key: 'need_scale',
      problem: 'Precisa provar escala',
      dominantRepertoires: ['Grande angular', 'Vista aérea', 'Mapas', 'Estrutura repetida', 'Fluxos visuais'],
      desiredEffect: 'Fazer o público sentir dimensão, alcance e operação de verdade.',
      principalRisk: 'Parecer gigante sem alma ou frio demais para a promessa da marca.',
      bestFor: ['Infraestrutura', 'Portos', 'Logística', 'Rede', 'Capilaridade operacional'],
    },
    {
      key: 'low_memorability',
      problem: 'Falta de memorabilidade',
      dominantRepertoires: ['Símbolo', 'Frame icônico', 'Composição incomum', 'Objeto dominante'],
      desiredEffect: 'Criar imagem mental forte e propriedade visual.',
      principalRisk: 'Virar sacada solta, descolada do produto ou do problema central.',
      bestFor: ['Lançamento', 'Branding', 'Concorrência', 'Campanha institucional'],
    },
  ],
  intelligenceStack: [
    {
      key: 'input_layer',
      title: 'Input Layer',
      role: 'Transforma pedido vago em problema visual classificado por função, percepção, canal e ousadia.',
      sources: ['Briefing Edro', 'Contexto de marca', 'Objetivo de campanha', 'Restrições de produção'],
      output: 'Diagnóstico visual claro o bastante para não pedir só imagem bonita.',
    },
    {
      key: 'canon_engine',
      title: 'Canon Engine',
      role: 'Ensina o que é excelência estrutural e craft alto para aquele tipo de problema.',
      sources: ['Cannes Lions', 'D&AD Annual', 'D&AD Archive', 'Cases proprietários da Edro'],
      output: 'Padrões fortes de solução, clareza, sistema e potência reconhecidos pela indústria.',
    },
    {
      key: 'trend_engine',
      title: 'Trend Engine',
      role: 'Lê sinais recentes de linguagem e detecta o que está emergente ou saturado.',
      sources: ['Adobe Creative Trends', 'Behance trend signals', 'Pinterest Predicts', 'Fontes criativas vivas'],
      output: 'Sinais atuais que podem atualizar a solução sem virar refém de moda.',
    },
    {
      key: 'edro_memory',
      title: 'Edro Memory',
      role: 'Guarda a memória curta e nobre da agência com o que já foi aprovado, usado ou aprendido.',
      sources: ['Cases aprovados', 'Rotas vencedoras', 'Erros recorrentes', 'Referências ouro da Edro'],
      output: 'Atalhos inteligentes e padrões confiáveis que reduzem repetição de erro.',
    },
    {
      key: 'edro_filter',
      title: 'Edro Filter',
      role: 'Decide o que é estrutural, o que é emergente útil, o que é ruído e o que é incompatível com a marca.',
      sources: ['Canon', 'Trend', 'Memory', 'Contexto do job'],
      output: 'Uma leitura crítica que transforma repertório em direção, não em colagem.',
    },
    {
      key: 'route_output',
      title: 'Route Output',
      role: 'Converte inteligência em rotas seguras, diferenciadas, ousadas ou de laboratório para o DA-IA executar.',
      sources: ['Leitura do filtro Edro', 'Objetivo da peça', 'Nível de risco escolhido'],
      output: 'Rotas visuais com repertório dominante, risco principal e recomendação de uso.',
    },
  ],
  specializedModules: [
    {
      key: 'kv_institucional',
      title: 'KV Institucional',
      function: 'Condensar a big idea, inaugurar território visual e abrir sistema de campanha.',
      coreQuestion: 'Essa peça cria um território forte o bastante para carregar a campanha inteira?',
      dominantRepertoires: ['Simbólico', 'Hero realista', 'Cinematográfico contido', 'Gráfico-conceitual'],
      successCriteria: ['Imagem central forte', 'Memorabilidade', 'Desdobramento', 'Percepção correta de marca'],
      antipatterns: ['Pôster bonito sem tese', 'Publicidade premium genérica', 'Hero dependente de truque único'],
    },
    {
      key: 'performance_conversao',
      title: 'Performance / Conversão',
      function: 'Gerar clique, lead, resposta ou venda com leitura rápida e benefício explícito.',
      coreQuestion: 'A pessoa entende rápido por que agir agora?',
      dominantRepertoires: ['Performance design', 'Resposta direta', 'Hierarquia agressiva', 'Valor de marca controlado'],
      successCriteria: ['Entendimento imediato', 'Benefício claro', 'CTA forte', 'Baixa fricção visual'],
      antipatterns: ['Cannes em espaço de clique', 'Atmosfera demais', 'Oferta escondida'],
    },
    {
      key: 'social_always_on',
      title: 'Social Always-On',
      function: 'Criar linguagem recorrente, escalável e reconhecível sem cansar a marca.',
      coreQuestion: 'Isso sustenta frequência sem parecer post genérico ou repetição vazia?',
      dominantRepertoires: ['Sistema modular', 'Retenção rápida', 'Códigos reconhecíveis', 'Adaptação por pauta'],
      successCriteria: ['Consistência', 'Escalabilidade', 'Ritmo', 'Reconhecimento de marca'],
      antipatterns: ['Cada post é uma marca', 'Tudo parece o mesmo template', 'Heroização desnecessária'],
    },
    {
      key: 'pdv_trade',
      title: 'PDV / Trade',
      function: 'Vender e orientar no espaço físico com leitura à distância e força comercial.',
      coreQuestion: 'A peça se impõe no ambiente e ajuda a decisão sem esforço?',
      dominantRepertoires: ['Trade marketing', 'Sinalização', 'Contraste alto', 'Design funcional de impacto'],
      successCriteria: ['Legibilidade', 'Contraste', 'Simplicidade', 'Adequação ao suporte'],
      antipatterns: ['Peça de apresentação no PDV', 'Sutileza demais', 'Informação ilegível'],
    },
    {
      key: 'branding_territorio',
      title: 'Branding / Território',
      function: 'Construir universo visual e simbólico de longo prazo para a marca.',
      coreQuestion: 'Isso cria uma linguagem que a marca pode possuir e repetir?',
      dominantRepertoires: ['Sistema gráfico', 'Símbolo', 'Universo semântico visual', 'Códigos proprietários'],
      successCriteria: ['Propriedade', 'Longevidade', 'Reconhecimento', 'Expansão'],
      antipatterns: ['Moda pela moda', 'Identidade neutra demais', 'Confundir branding com campanha sazonal'],
    },
    {
      key: 'apresentacao_defesa',
      title: 'Apresentação / Defesa',
      function: 'Vender raciocínio, valorizar ideia e facilitar defesa comercial ou institucional.',
      coreQuestion: 'Essa apresentação ajuda a ideia a parecer mais inevitável e defensável?',
      dominantRepertoires: ['Editorial', 'Keynote premium', 'Design de informação', 'Narrativa visual limpa'],
      successCriteria: ['Clareza narrativa', 'Elegância funcional', 'Força argumentativa', 'Legibilidade executiva'],
      antipatterns: ['Deck que atrapalha a ideia', 'Burocracia visual', 'Ornamento sem função'],
    },
    {
      key: 'imagem_conceitual',
      title: 'Imagem Conceitual / Exploração',
      function: 'Explorar hipóteses visuais, abrir linguagem e descobrir imagens mentais promissoras.',
      coreQuestion: 'Isso abre caminhos úteis ou só gera imagens bonitas e aleatórias?',
      dominantRepertoires: ['Poster thinking', 'Metáfora visual', 'Cinema', 'Exploração simbólica'],
      successCriteria: ['Originalidade útil', 'Potência imagética', 'Relevância estratégica', 'Valor de laboratório'],
      antipatterns: ['Parar no moodboard', 'Aleatoriedade', 'Tratar exploração como peça final'],
    },
    {
      key: 'tecnico_explicativo',
      title: 'Técnico / Explicativo',
      function: 'Simplificar serviço, produto, fluxo ou tecnologia sem infantilizar a comunicação.',
      coreQuestion: 'Isso ajuda a entender sem burocratizar nem poetizar demais?',
      dominantRepertoires: ['Design de informação', 'UX visual', 'Infografia', 'Motion explicativo'],
      successCriteria: ['Didatismo', 'Organização', 'Credibilidade', 'Retenção de informação'],
      antipatterns: ['Poetizar o que precisava esclarecer', 'Manual árido', 'Excesso de abstração'],
    },
  ],
  operationalArtifacts: [
    {
      key: 'input_form',
      title: 'Formulário de entrada',
      purpose: 'Transforma pedido solto em problema visual bem especificado antes de qualquer busca ou geração.',
      steps: ['Tipo de peça', 'Objetivo', 'Percepção desejada', 'Percepção a evitar', 'Canal', 'Restrições'],
    },
    {
      key: 'route_output',
      title: 'Template de rotas',
      purpose: 'Devolve rotas seguras, diferenciadas, ousadas ou de laboratório antes do DA-IA gerar imagens.',
      steps: ['Diagnóstico', 'Leitura de cânone', 'Leitura de tendência', 'Leitura da memória', 'Rotas recomendadas'],
    },
    {
      key: 'prompt_master',
      title: 'Prompt-mestre',
      purpose: 'Entrega ao DA-IA um briefing orientado por função, repertório, risco e estrutura, não por adjetivos vazios.',
      steps: ['Problema', 'Percepção', 'Tensão', 'Rota escolhida', 'Clichês proibidos', 'Entrega esperada'],
    },
    {
      key: 'critique_prompt',
      title: 'Prompt de crítica',
      purpose: 'Substitui "não gostei" por revisão objetiva baseada em tese, marca, canal e desdobramento.',
      steps: ['O que está forte', 'O que está fraco', 'O que está genérico', 'O que está promissor', 'O que simplificar'],
    },
    {
      key: 'refine_prompt',
      title: 'Prompt de refinamento',
      purpose: 'Consolida a rota escolhida em uma versão mais clara, própria, memorável e sistêmica.',
      steps: ['Manter', 'Aumentar', 'Reduzir', 'Eliminar', 'Garantir desdobramento'],
    },
  ],
};

export function buildArtDirectionCanonicalDoctrineBlock() {
  return [
    'MANUAL CANÔNICO DE PILOTAGEM DO DA-IA:',
    `- Tese: ${EDRO_DA_IA_CANONICAL_FRAMEWORK.thesis}`,
    `- Papel do operador: ${EDRO_DA_IA_CANONICAL_FRAMEWORK.operatorRole}`,
    `- Fórmula de direção: ${EDRO_DA_IA_CANONICAL_FRAMEWORK.directionFormula}`,
    '- Camadas obrigatórias de pilotagem:',
    ...EDRO_DA_IA_CANONICAL_FRAMEWORK.layers.map(
      (layer) => `  - ${layer.title}: ${layer.description}`,
    ),
    '- Edro OS visual:',
    ...EDRO_DA_IA_CANONICAL_FRAMEWORK.operatingSystem.map(
      (layer) => `  - ${layer.title}: ${layer.question} -> ${layer.output}`,
    ),
    '- Régua de grandeza visual:',
    ...EDRO_DA_IA_CANONICAL_FRAMEWORK.resultCriteria.map(
      (criterion) => `  - ${criterion.label} (${criterion.weight}%): ${criterion.description}`,
    ),
    '- Matriz problema -> repertório dominante:',
    ...EDRO_DA_IA_CANONICAL_FRAMEWORK.repertoireMatrix.map(
      (entry) => `  - ${entry.problem}: ${entry.dominantRepertoires.join(', ')} -> ${entry.desiredEffect}`,
    ),
    '- Stack híbrido de repertório:',
    ...EDRO_DA_IA_CANONICAL_FRAMEWORK.intelligenceStack.map(
      (layer) => `  - ${layer.title}: ${layer.role}`,
    ),
    '- Módulos especializados:',
    ...EDRO_DA_IA_CANONICAL_FRAMEWORK.specializedModules.map(
      (module) => `  - ${module.title}: ${module.function}`,
    ),
    '- Artefatos operacionais:',
    ...EDRO_DA_IA_CANONICAL_FRAMEWORK.operationalArtifacts.map(
      (artifact) => `  - ${artifact.title}: ${artifact.purpose}`,
    ),
    '- Mandamentos:',
    ...EDRO_DA_IA_CANONICAL_FRAMEWORK.commandments.map((item) => `  - ${item}`),
    '- Campos obrigatórios de briefing:',
    ...EDRO_DA_IA_CANONICAL_FRAMEWORK.briefingSchema.map(
      (field) => `  - ${field.label}: ${field.description}`,
    ),
  ].join('\n');
}

export function buildArtDirectionCanonicalCritiqueBlock() {
  return [
    'CRÍTICA CANÔNICA DO DA-IA:',
    '- Antes de julgar a imagem, confirme o módulo correto de operação: KV institucional, performance, social, PDV, branding, deck, exploração ou explicativo.',
    '- Julgue a peça pelos seguintes eixos:',
    ...EDRO_DA_IA_CANONICAL_FRAMEWORK.critiqueAxes.map(
      (axis) => `  - ${axis.label}: ${axis.question}`,
    ),
    '- Aplique também a régua de resultado incrível:',
    ...EDRO_DA_IA_CANONICAL_FRAMEWORK.resultCriteria.map(
      (criterion) => `  - ${criterion.label}: ${criterion.description}`,
    ),
    '- Lembretes de processo:',
    ...EDRO_DA_IA_CANONICAL_FRAMEWORK.workflowPhases.map(
      (phase) => `  - ${phase.title}: ${phase.description}`,
    ),
    '- Regras de repertório:',
    ...EDRO_DA_IA_CANONICAL_FRAMEWORK.repertoireMatrix.map(
      (entry) => `  - ${entry.problem}: evitar ${entry.principalRisk}`,
    ),
  ].join('\n');
}
