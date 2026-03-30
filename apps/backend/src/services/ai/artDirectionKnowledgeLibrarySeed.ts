import { CORE_ART_DIRECTION_CONCEPTS } from './artDirectionCoreConcepts';

export type ArtDirectionCanonSeed = {
  canonSlug: string;
  entries: string[];
};

export const EDRO_DA_CANON_SEED: ArtDirectionCanonSeed[] = [
  {
    canonSlug: 'fundamentos_visuais',
    entries: [
      'Abstração',
      'Acaso e acidente',
      'Apropriação',
      'Colagem',
      'Estética',
      'Gestalt',
      'Grids',
      'Hierarquia',
      'Infográficos',
      'Inteligência gráfica',
      'Linguagem visual',
      'Origens gráficas',
      'Ornamento',
      'Padrões',
      'Pictogramas',
      'Proporção',
      'Semiótica',
      'Teoria',
      'Teoria das cores',
      'Tipo como imagem',
      "Trompe l'oeil",
      'Vernacular',
    ],
  },
  {
    canonSlug: 'tipografia',
    entries: [
      'Fontes de exibição',
      'Fontes não latinas',
      'Lettering',
      'Léxico tipográfico',
      'Nova tipografia',
      'Origens tipográficas',
      'Psicologia das fontes',
      'Sans-serifs',
      'Scripts',
      'Serifas',
      'Tipografia',
      'Tipografia digital',
      'Tipografia pós-moderna',
    ],
  },
  {
    canonSlug: 'historia_estilo',
    entries: [
      'Bauhaus',
      'Cânone',
      'Contraculturas',
      'Design suíço',
      'Estilo',
      'Estilo internacional',
      'Estilo mid-century modern',
      'História',
      'Pastiche',
      'Pós-modernismo',
      'Retrô',
      'Revolução criativa',
      'Vanguarda',
    ],
  },
  {
    canonSlug: 'formatos_aplicacoes',
    entries: [
      'Agências de design',
      'Capas de álbum',
      'Capas de livro',
      'Design como arte',
      'Design de animação',
      'Design gráfico digital',
      'Designer como autor',
      'Direção de arte',
      'Editorial',
      'Embalagem',
      'Fotografia',
      'Identidade de marca',
      'Ilustração',
      'Livros',
      'Logo',
      'Mídias',
      'Pôsteres',
      'Prática',
      'Propaganda',
      'Publicidade',
      'Redes sociais',
      'Resolução de problemas',
      'Sinalização e orientação',
      'UI/UX design',
      'Websites',
    ],
  },
  {
    canonSlug: 'acessibilidade_critica',
    entries: [
      'Acessibilidade',
      'Clichês',
      'Ética',
      'Gênero',
      'Meio ambiente',
      'Políticas do design',
      'Protesto',
      'Raça',
      'Sexualidade',
    ],
  },
];

export const KNOWLEDGE_LIBRARY_SOURCE = {
  sourceType: 'book' as const,
  title: 'Bíblia do Design Gráfico',
  author: 'Theo Inglis',
  notes:
    'Taxonomia inicial da biblioteca de DA da Edro, estruturada a partir da lista de termos fornecida pelo usuário. Expandir editorialmente com definição, heurísticas e exemplos.',
  trustScore: 0.65,
};

export type CoreConceptSeed = (typeof CORE_ART_DIRECTION_CONCEPTS)[number];

