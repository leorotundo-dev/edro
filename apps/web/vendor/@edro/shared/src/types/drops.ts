/**
 * Tipos de Drop (conteúdo pedagógico)
 * 
 * Cada tipo representa uma abordagem diferente de aprendizado:
 * - fundamento: Conceito básico, definição, teoria
 * - regra: Regra específica, norma, lei
 * - excecao: Exceção à regra, caso especial
 * - pattern-banca: Padrão de cobrança de banca específica
 * - mini-questao: Questão objetiva curta
 * - comparativo: Comparação entre conceitos similares
 * - revisao: Resumo para revisão rápida
 * - aprofundamento: Conteúdo avançado, detalhado
 * - explanation: Explicação geral (legacy)
 * - flashcard: Cartão de memorização (legacy)
 */
export type DropType = 
  | 'fundamento'
  | 'regra'
  | 'excecao'
  | 'pattern-banca'
  | 'mini-questao'
  | 'comparativo'
  | 'revisao'
  | 'aprofundamento'
  | 'explanation'  // legacy
  | 'mini_question' // legacy
  | 'flashcard';    // legacy

/**
 * Níveis cognitivos baseados na Taxonomia de Bloom
 * 
 * Representa a profundidade de conhecimento exigida:
 * - remember: Memorização, reconhecimento
 * - understand: Compreensão, interpretação
 * - apply: Aplicação prática, uso
 * - analyze: Análise, decomposição
 * - evaluate: Avaliação, julgamento
 * - create: Criação, síntese
 */
export type CognitiveLevel = 
  | 'remember'    // Memorização
  | 'understand'  // Compreensão
  | 'apply'       // Aplicação
  | 'analyze'     // Análise
  | 'evaluate'    // Avaliação
  | 'create';     // Criação

/**
 * Dificuldade do drop (1-5)
 */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

/**
 * Conteúdo do drop
 */
export interface DropContent {
  /** Título do drop */
  title?: string;
  
  /** Texto explicativo principal */
  text?: string;
  
  /** Pergunta (se for questão) */
  question?: string;
  
  /** Alternativas (se for questão) */
  alternatives?: string[];
  
  /** Resposta correta */
  answer?: string;
  
  /** Explicação da resposta */
  explanation?: string;
  
  /** Dicas ou observações */
  hints?: string[];
  
  /** Referências ou fontes */
  references?: string[];
}

/**
 * Metadados pedagógicos do drop
 */
export interface DropMetadata {
  /** Tipo de drop */
  type: DropType;
  
  /** Nível cognitivo (Bloom) */
  cognitiveLevel: CognitiveLevel;
  
  /** Dificuldade (1-5) */
  difficulty: Difficulty;
  
  /** Tempo estimado em segundos */
  estimatedTime: number;
  
  /** Tags para categorização */
  tags: string[];
  
  /** Se contém questão */
  hasQuestion: boolean;
  
  /** Se contém explicação */
  hasExplanation: boolean;
  
  /** Banca específica (se aplicável) */
  banca?: string;
  
  /** Disciplina */
  disciplina?: string;
  
  /** Código do tópico */
  topicCode?: string;
  
  /** Nome do tópico */
  topicName?: string;
}

/**
 * Drop completo
 */
export interface Drop {
  /** ID único */
  id?: number;
  
  /** ID do blueprint de origem */
  blueprintId?: number;
  
  /** Código do tópico */
  topicCode: string;
  
  /** Tipo de drop */
  type: DropType;
  
  /** Dificuldade (1-5) */
  difficulty: Difficulty;
  
  /** Conteúdo do drop */
  content: DropContent;
  
  /** Metadados pedagógicos (opcional) */
  metadata?: DropMetadata;
  
  /** Data de criação */
  createdAt?: string;
  
  /** Data de atualização */
  updatedAt?: string;
}

/**
 * Mapeamento de tipo de drop para nível cognitivo padrão
 */
export const DROP_TYPE_TO_COGNITIVE_LEVEL: Record<DropType, CognitiveLevel> = {
  'fundamento': 'understand',
  'regra': 'remember',
  'excecao': 'analyze',
  'pattern-banca': 'apply',
  'mini-questao': 'apply',
  'comparativo': 'analyze',
  'revisao': 'remember',
  'aprofundamento': 'evaluate',
  'explanation': 'understand',
  'mini_question': 'apply',
  'flashcard': 'remember'
};

/**
 * Mapeamento de tipo de drop para tempo estimado (segundos)
 */
export const DROP_TYPE_TO_ESTIMATED_TIME: Record<DropType, number> = {
  'fundamento': 120,      // 2 minutos
  'regra': 90,            // 1.5 minutos
  'excecao': 150,         // 2.5 minutos
  'pattern-banca': 180,   // 3 minutos
  'mini-questao': 120,    // 2 minutos
  'comparativo': 180,     // 3 minutos
  'revisao': 60,          // 1 minuto
  'aprofundamento': 300,  // 5 minutos
  'explanation': 120,
  'mini_question': 120,
  'flashcard': 30         // 30 segundos
};
