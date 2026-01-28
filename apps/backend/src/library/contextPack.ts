import { OpenAIEmbeddings } from './openaiEmbeddings';
import { countReadyLibraryItems, semanticSearch } from './libraryRepo';
import { query } from '../db';

const embedder = new OpenAIEmbeddings();

function weightBoost(weight: string) {
  if (weight === 'high') return 1.15;
  if (weight === 'low') return 0.9;
  return 1.0;
}

export async function buildContextPack(params: {
  tenant_id: string;
  client_id: string;
  query: string;
  k?: number;
  categories?: string[];
  tags?: string[];
}) {
  const total = await countReadyLibraryItems(params.tenant_id, params.client_id);
  if (total === 0) {
    return { sources: [], packedText: '' };
  }

  const [queryEmbedding] = await embedder.embed([params.query]);
  const chunks = await semanticSearch({
    tenant_id: params.tenant_id,
    client_id: params.client_id,
    queryEmbedding,
    k: params.k ?? 12,
    use_in_ai: true,
    categories: params.categories,
    tags: params.tags,
  });

  if (!chunks.length) {
    return { sources: [], packedText: '' };
  }

  const itemIds = Array.from(new Set(chunks.map((chunk: any) => chunk.library_item_id)));
  const { rows: items } = itemIds.length
    ? await query<any>(
        `SELECT id, title, type, category, tags, weight FROM library_items WHERE id = ANY($1::uuid[])`,
        [itemIds]
      )
    : { rows: [] as any[] };

  const itemMap = new Map(items.map((item: any) => [item.id, item]));

  const scored = chunks
    .map((chunk: any) => {
      const item = itemMap.get(chunk.library_item_id);
      const boost = weightBoost(item?.weight || chunk.weight);
      return { ...chunk, item, final_score: Number(chunk.score || 0) * boost };
    })
    .sort((a: any, b: any) => b.final_score - a.final_score);

  const byItem = new Map<string, any[]>();
  for (const chunk of scored) {
    const key = chunk.library_item_id;
    if (!byItem.has(key)) {
      byItem.set(key, []);
    }
    if (byItem.get(key)!.length < 3) {
      byItem.get(key)!.push(chunk);
    }
  }

  const sources = Array.from(byItem.entries()).map(([itemId, chunksForItem]) => {
    const item = chunksForItem[0].item;
    return {
      library_item_id: itemId,
      title: item?.title || 'Material',
      category: item?.category || chunksForItem[0].category,
      tags: item?.tags || chunksForItem[0].tags,
      weight: item?.weight || chunksForItem[0].weight,
      chunks: chunksForItem.map((c: any) => ({
        id: c.id,
        chunk_index: c.chunk_index,
        score: c.final_score,
      })),
      excerpts: chunksForItem.map((c: any) => c.content),
    };
  });

  const packedText = sources
    .map((source, idx) => {
      const header = `SOURCE ${idx + 1}: ${source.title} [${source.category}] (weight:${source.weight})`;
      const excerpts = source.excerpts
        .map((text, i) => `Excerpt ${i + 1}:\n${text}`)
        .join('\n\n');
      return `${header}\n${excerpts}`;
    })
    .join('\n\n---\n\n');

  return { sources, packedText };
}
