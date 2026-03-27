import { CORE_ART_DIRECTION_CONCEPTS } from './artDirectionCoreConcepts';

export type ArtDirectionCanonModuleSeed = {
  moduleKey: string;
  title: string;
  description: string;
  entries: string[];
};

export type ArtDirectionCanonCurriculumSeed = {
  canonSlug: string;
  modules: ArtDirectionCanonModuleSeed[];
};

export type ArtDirectionCanonSeed = {
  canonSlug: string;
  entries: string[];
};

export const EDRO_DA_CANON_CURRICULUM: ArtDirectionCanonCurriculumSeed[] = [
  {
    canonSlug: 'fundamentos_visuais',
    modules: [
      {
        moduleKey: 'percepcao_composicao',
        title: 'Percepção e composição',
        description: 'Como a forma organiza leitura, ritmo, contraste e ordem visual.',
        entries: ['Abstração', 'Acaso e acidente', 'Gestalt', 'Grids', 'Hierarquia', 'Proporção', 'Padrões'],
      },
      {
        moduleKey: 'linguagem_simbolo',
        title: 'Linguagem, símbolo e leitura',
        description: 'Como signos, símbolos e sistemas visuais constroem significado.',
        entries: ['Inteligência gráfica', 'Linguagem visual', 'Pictogramas', 'Semiótica', 'Tipo como imagem', 'Vernacular'],
      },
      {
        moduleKey: 'materia_estetica',
        title: 'Matéria, estética e superfície',
        description: 'Recursos de tensão visual, apropriação formal e acabamento estético.',
        entries: ['Apropriação', 'Colagem', 'Estética', 'Ornamento', "Trompe l'oeil"],
      },
      {
        moduleKey: 'teoria_origens',
        title: 'Teoria, cor e origens gráficas',
        description: 'Base conceitual para entender origem, sistema e teoria do design visual.',
        entries: ['Infográficos', 'Origens gráficas', 'Teoria', 'Teoria das cores'],
      },
    ],
  },
  {
    canonSlug: 'tipografia',
    modules: [
      {
        moduleKey: 'familias_classificacoes',
        title: 'Famílias e classificações',
        description: 'Como as categorias tipográficas afetam tom, época e legibilidade.',
        entries: ['Fontes de exibição', 'Fontes não latinas', 'Sans-serifs', 'Scripts', 'Serifas'],
      },
      {
        moduleKey: 'historia_sistemas_tipograficos',
        title: 'História e sistemas tipográficos',
        description: 'Momentos e correntes que redefiniram o uso tipográfico.',
        entries: ['Nova tipografia', 'Origens tipográficas', 'Tipografia pós-moderna'],
      },
      {
        moduleKey: 'pratica_linguagem_tipografica',
        title: 'Prática e linguagem tipográfica',
        description: 'Uso aplicado da tipografia como sistema visual e ferramenta expressiva.',
        entries: ['Lettering', 'Léxico tipográfico', 'Tipografia', 'Tipografia digital'],
      },
      {
        moduleKey: 'psicologia_tom_tipografico',
        title: 'Psicologia e tom tipográfico',
        description: 'Como tipos constroem valor percebido, personalidade e confiança.',
        entries: ['Psicologia das fontes'],
      },
    ],
  },
  {
    canonSlug: 'historia_estilo',
    modules: [
      {
        moduleKey: 'movimentos_escolas_correntes',
        title: 'Movimentos, escolas e correntes',
        description: 'Linhas históricas e escolas formais que moldaram o repertório do design.',
        entries: ['Bauhaus', 'Design suíço', 'Estilo internacional', 'Estilo mid-century modern', 'Vanguarda'],
      },
      {
        moduleKey: 'pos_moderno_hibridismos',
        title: 'Pós-moderno e hibridismos',
        description: 'Linguagens de citação, tensão, ironia e colagem histórica.',
        entries: ['Pós-modernismo', 'Pastiche', 'Retrô'],
      },
      {
        moduleKey: 'cultura_ruptura_cena',
        title: 'Cultura, ruptura e cena',
        description: 'Movimentos culturais e criativos que deslocam o gosto dominante.',
        entries: ['Contraculturas', 'Revolução criativa'],
      },
      {
        moduleKey: 'historiografia_criterio',
        title: 'Historiografia e critério',
        description: 'Como a disciplina constrói memória, canon e leitura histórica.',
        entries: ['Cânone', 'Estilo', 'História'],
      },
    ],
  },
  {
    canonSlug: 'formatos_aplicacoes',
    modules: [
      {
        moduleKey: 'identidade_autoria_direcao',
        title: 'Identidade, autoria e direção',
        description: 'Como o design assume voz, autoria e construção de marca.',
        entries: ['Design como arte', 'Designer como autor', 'Direção de arte', 'Identidade de marca', 'Logo'],
      },
      {
        moduleKey: 'editorial_publicacao_cartaz',
        title: 'Editorial, publicação e cartaz',
        description: 'Formatos clássicos de narrativa visual, publicação e circulação cultural.',
        entries: ['Capas de álbum', 'Capas de livro', 'Editorial', 'Livros', 'Pôsteres'],
      },
      {
        moduleKey: 'imagem_narrativa_superficie',
        title: 'Imagem, narrativa e superfície',
        description: 'Campos em que imagem, materialidade e leitura espacial ganham protagonismo.',
        entries: ['Embalagem', 'Fotografia', 'Ilustração', 'Sinalização e orientação'],
      },
      {
        moduleKey: 'digital_interfaces_motion',
        title: 'Digital, interfaces e motion',
        description: 'Formatos contemporâneos de tela, fluxo, interação e mídia social.',
        entries: ['Design de animação', 'Design gráfico digital', 'Redes sociais', 'UI/UX design', 'Websites'],
      },
      {
        moduleKey: 'mercado_campanha_sistema',
        title: 'Mercado, campanha e sistema',
        description: 'Como o design opera em agência, mídia, publicidade e resolução de problemas.',
        entries: ['Agências de design', 'Mídias', 'Prática', 'Propaganda', 'Publicidade', 'Resolução de problemas'],
      },
    ],
  },
  {
    canonSlug: 'acessibilidade_critica',
    modules: [
      {
        moduleKey: 'inclusao_clareza_revisao',
        title: 'Inclusão, clareza e revisão',
        description: 'Critérios para tornar comunicação acessível, legível e menos enviesada.',
        entries: ['Acessibilidade', 'Clichês'],
      },
      {
        moduleKey: 'etica_politica_impacto',
        title: 'Ética, política e impacto',
        description: 'Como o design afeta cultura, ambiente e posicionamento social.',
        entries: ['Ética', 'Meio ambiente', 'Políticas do design', 'Protesto'],
      },
      {
        moduleKey: 'representacao_sociedade',
        title: 'Representação e sociedade',
        description: 'Tensões de representação, identidade e poder que atravessam o design.',
        entries: ['Gênero', 'Raça', 'Sexualidade'],
      },
    ],
  },
];

export const EDRO_DA_CANON_SEED: ArtDirectionCanonSeed[] = EDRO_DA_CANON_CURRICULUM.map((canon) => ({
  canonSlug: canon.canonSlug,
  entries: canon.modules.flatMap((module) => module.entries),
}));

export function resolveCanonCurriculumModule(canonSlug: string, entryTitle: string) {
  const canon = EDRO_DA_CANON_CURRICULUM.find((item) => item.canonSlug === canonSlug);
  if (!canon) return null;

  const moduleIndex = canon.modules.findIndex((module) => module.entries.includes(entryTitle));
  if (moduleIndex === -1) return null;

  const module = canon.modules[moduleIndex];
  return {
    moduleKey: module.moduleKey,
    title: module.title,
    description: module.description,
    order: moduleIndex + 1,
  };
}

export const KNOWLEDGE_LIBRARY_SOURCE = {
  sourceType: 'book' as const,
  title: 'Bíblia do Design Gráfico',
  author: 'Theo Inglis',
  notes:
    'Taxonomia inicial da biblioteca de DA da Edro, estruturada a partir da lista de termos fornecida pelo usuário. Expandir editorialmente com definição, heurísticas, exemplos e aprofundamento histórico.',
  trustScore: 0.65,
};

export type CoreConceptSeed = (typeof CORE_ART_DIRECTION_CONCEPTS)[number];
