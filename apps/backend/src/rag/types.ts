export interface RagBlock {
  id?: number;
  disciplina: string;
  topicCode: string;
  banca?: string | null;
  sourceUrl: string;
  summary: string;      // texto resumido (conteúdo para consulta)
  embedding?: number[] | null; // poderá ser preenchido em etapa futura
  createdAt?: Date;
}
