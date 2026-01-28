import { FastifyInstance } from 'fastify';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { runLibraryWorkerOnce } from '../library/processWorker';

export default async function libraryJobsRoutes(app: FastifyInstance) {
  app.post(
    '/admin/jobs/library',
    { preHandler: [authGuard, tenantGuard(), requirePerm('admin:jobs')] },
    async () => {
      await runLibraryWorkerOnce();
      return { ok: true };
    }
  );
}
