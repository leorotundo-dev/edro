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
};

export const EDRO_DA_IA_CANONICAL_FRAMEWORK: ArtDirectionCanonicalFramework = {
  title: 'Manual Canônico de Pilotagem do DA-IA',
  thesis:
    'A IA visual da Edro não deve receber pedidos de estética solta. Ela deve receber problema, percepção, repertório, estrutura e crítica com precisão operacional.',
  operatorRole:
    'Quem opera o motor não está usando uma ferramenta de imagem. Está dirigindo um diretor de arte cego, rápido, obediente e literal demais.',
  directionFormula: 'Funcao > sensacao > linguagem > execucao',
  layers: [
    {
      key: 'function',
      title: '1. Pedir função, não imagem',
      description:
        'Toda peça começa pelo problema de comunicação. A IA deve saber o que precisa resolver antes de desenhar qualquer estética.',
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
        'A IA abre possibilidades. O humano escolhe direção, corta exagero e transforma soluções isoladas em sistema.',
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
        'O loop de revisão deve apontar falhas em clareza, verdade, sistema, canal, repertório e tom. “Não gostei” é crítica fraca.',
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
};

export function buildArtDirectionCanonicalDoctrineBlock() {
  return [
    'MANUAL CANÔNICO DE PILOTAGEM DO DA-IA:',
    `- Tese: ${EDRO_DA_IA_CANONICAL_FRAMEWORK.thesis}`,
    `- Papel do operador: ${EDRO_DA_IA_CANONICAL_FRAMEWORK.operatorRole}`,
    `- Fórmula de direção: ${EDRO_DA_IA_CANONICAL_FRAMEWORK.directionFormula}`,
    '- Camadas obrigatórias:',
    ...EDRO_DA_IA_CANONICAL_FRAMEWORK.layers.map(
      (layer) => `  - ${layer.title}: ${layer.description}`,
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
    '- Julgue a peça pelos seguintes eixos:',
    ...EDRO_DA_IA_CANONICAL_FRAMEWORK.critiqueAxes.map(
      (axis) => `  - ${axis.label}: ${axis.question}`,
    ),
    '- Fases que devem ser respeitadas:',
    ...EDRO_DA_IA_CANONICAL_FRAMEWORK.workflowPhases.map(
      (phase) => `  - ${phase.title}: ${phase.description}`,
    ),
  ].join('\n');
}
