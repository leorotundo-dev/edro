import { fetchJobs, markJob } from '../jobs/jobQueue';
import { OpenAIEmbeddings } from './openaiEmbeddings';
import { extractText } from './extract';
import { chunkText, sha256 } from './chunk';
import { readFile } from './storage';
import {
  clearChunks,
  getLibraryItem,
  insertChunk,
  updateChunkEmbedding,
  upsertDoc,
  updateLibraryItem,
} from './libraryRepo';

const embedder = new OpenAIEmbeddings();

export async function runLibraryWorkerOnce() {
  const jobs = await fetchJobs('process_library_item', 3);

  for (const job of jobs) {
    try {
      await markJob(job.id, 'processing');

      const { library_item_id } = job.payload || {};
      const item = await getLibraryItem(job.tenant_id, library_item_id);
      if (!item) throw new Error('item_not_found');

      await updateLibraryItem(item.id, item.tenant_id, { status: 'processing', error_message: null });

      let rawText = '';
      if (item.type === 'note') rawText = item.notes || '';
      if (item.type === 'link') {
        rawText = `${item.title}\n\n${item.source_url || ''}\n\n${item.description || ''}\n\n${item.notes || ''}`;
      }
      if (item.type === 'file') {
        const buffer = await readFile(item.file_key);
        rawText = await extractText(item.file_mime || '', buffer);
      }

      rawText = (rawText || '').trim();
      const textHash = sha256(rawText);
      await upsertDoc(item.tenant_id, item.client_id, item.id, rawText, textHash);

      await clearChunks(item.id);

      const chunks = chunkText(rawText, 1100, 450)
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .slice(0, 200);

      for (let i = 0; i < chunks.length; i += 1) {
        await insertChunk({
          tenant_id: item.tenant_id,
          client_id: item.client_id,
          library_item_id: item.id,
          chunk_index: i,
          content: chunks[i],
          category: item.category,
          tags: item.tags,
          weight: item.weight,
          use_in_ai: item.use_in_ai,
        });
      }

      const batchSize = 32;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const embeddings = await embedder.embed(batch);
        for (let j = 0; j < embeddings.length; j += 1) {
          await updateChunkEmbedding(item.id, i + j, embeddings[j]);
        }
      }

      await updateLibraryItem(item.id, item.tenant_id, { status: 'ready', error_message: null });
      await markJob(job.id, 'done');
    } catch (error: any) {
      await markJob(job.id, 'failed', error?.message ?? 'process_failed');
      const { library_item_id } = job.payload || {};
      if (library_item_id) {
        try {
          await updateLibraryItem(library_item_id, job.tenant_id, {
            status: 'failed',
            error_message: error?.message ?? 'failed',
          });
        } catch {
          // ignore
        }
      }
    }
  }
}
