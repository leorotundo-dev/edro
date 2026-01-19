export interface TopicNode {
  code: string;
  name: string;
  children?: TopicNode[];
}

export interface DisciplineBlueprint {
  name: string;
  code: string;
  topics: TopicNode[];
}

export interface ExamBlueprint {
  banca?: string | null;
  cargo?: string | null;
  disciplinas: DisciplineBlueprint[];
}
