export type DropType =
  | 'fundamento'
  | 'regra'
  | 'excecao'
  | 'pattern-banca'
  | 'mini-questao'
  | 'comparativo'
  | 'revisao'
  | 'aprofundamento'
  | 'explanation'
  | 'mini_question'
  | 'flashcard';

export type CognitiveLevel =
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'create';

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface DropContent {
  title?: string;
  text?: string;
  question?: string;
  alternatives?: string[];
  answer?: string;
  explanation?: string;
  hints?: string[];
  references?: string[];
}

export interface DropMetadata {
  type: DropType;
  cognitiveLevel: CognitiveLevel;
  difficulty: Difficulty;
  estimatedTime: number;
  tags: string[];
  hasQuestion: boolean;
  hasExplanation: boolean;
  banca?: string;
  disciplina?: string;
  topicCode?: string;
  topicName?: string;
}

export interface Drop {
  id?: number;
  blueprintId?: number;
  topicCode: string;
  type: DropType;
  difficulty: Difficulty;
  content: DropContent;
  metadata?: DropMetadata;
  createdAt?: string;
  updatedAt?: string;
}
