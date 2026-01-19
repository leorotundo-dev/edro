import { FastifyInstance } from 'fastify';
import { extractBlueprint } from '../services/ai/extractBlueprint';
import { generateDropBatchForTopic } from '../services/ai/generateDropBatch';

export async function adminAIRoutes(app: FastifyInstance) {

  app.post('/admin/extract-blueprint', async (req, reply) => {
    const { html } = req.body as { html: string };
    const blueprint = await extractBlueprint(html);
    return { blueprint };
  });

  app.post('/admin/generate-drops', async (req, reply) => {
    const { disciplina, topicCode, topicName, banca, nivel, ragContext } = req.body as any;

    const result = await generateDropBatchForTopic({
      disciplina,
      topicCode,
      topicName,
      banca,
      nivel,
      ragContext
    });

    return result;
  });
}
