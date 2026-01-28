export interface EmbeddingProvider {
  dim: number;
  embed(texts: string[]): Promise<number[][]>;
}
