import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createDiscipline, listDisciplines } from '../repositories/disciplineRepository';

export default async function disciplinesRoutes(app: FastifyInstance) {
  app.get('/disciplines', async () => {
    const disciplines = await listDisciplines();
    return { disciplines };
  });

  app.post('/disciplines', async (request, reply) => {
    const bodySchema = z.object({
      name: z.string().min(2)
    });
    const body = bodySchema.parse(request.body);
    const discipline = await createDiscipline({
      name: body.name
    });
    return reply.status(201).send({ discipline });
  });
}
