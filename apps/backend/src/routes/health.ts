import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { generateCopy, getOrchestratorInfo, TaskType } from '../services/ai/copyService';

export default async function healthRoutes(app: FastifyInstance) {
  app.get('/', async () => ({ status: 'ok' }));
  app.get('/health', async () => ({ status: 'ok' }));

  // Endpoints públicos para teste do orquestrador (temporário)
  app.get('/orchestrator', async (_request, reply) => {
    const info = getOrchestratorInfo();
    return reply.send({ success: true, data: info });
  });

  app.post('/orchestrator/test', async (request, reply) => {
    const bodySchema = z.object({
      prompt: z.string().min(1),
      taskType: z.enum([
        'briefing_analysis',
        'social_post',
        'variations',
        'validation',
        'headlines',
        'institutional_copy',
        'campaign_strategy',
        'final_review',
      ]).optional(),
      forceProvider: z.enum(['openai', 'gemini', 'claude']).optional(),
    });

    const body = bodySchema.parse(request.body);

    try {
      const result = await generateCopy({
        prompt: body.prompt,
        taskType: body.taskType as TaskType,
        forceProvider: body.forceProvider,
      });

      return reply.send({
        success: true,
        data: {
          output: result.output,
          model: result.model,
          provider: result.payload.provider,
          tier: result.payload.tier,
          taskType: result.payload.taskType,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro ao gerar copy',
      });
    }
  });
}
