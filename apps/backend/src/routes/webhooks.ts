import { FastifyInstance } from 'fastify';
import { query } from '../db';

export default async function webhooksRoutes(app: FastifyInstance) {
  app.post('/webhooks/publisher', async (request: any, reply: any) => {
    const secret = String(request.headers?.authorization || '').replace('Bearer ', '');
    const expected = process.env.GATEWAY_SHARED_SECRET;
    if (expected && secret !== expected) {
      return reply.status(403).send({ error: 'forbidden' });
    }

    const { jobId, status, result, error } = request.body ?? {};
    if (!jobId) {
      return reply.status(400).send({ error: 'jobId_required' });
    }

    if (status === 'published') {
      await query(
        `UPDATE publish_queue SET status='published', updated_at=now(), error_message=NULL WHERE id=$1`,
        [jobId]
      );
      const { rows } = await query<{ post_asset_id: string }>(
        `SELECT post_asset_id FROM publish_queue WHERE id=$1`,
        [jobId]
      );
      const postId = rows[0]?.post_asset_id;
      if (postId) {
        await query(
          `UPDATE post_assets SET status='published', published_at=now(), updated_at=now() WHERE id=$1`,
          [postId]
        );
      }
    } else {
      await query(
        `UPDATE publish_queue SET status='failed', error_message=$2, updated_at=now() WHERE id=$1`,
        [jobId, error ?? result ?? 'failed']
      );
    }

    return { ok: true };
  });
}
