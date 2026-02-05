import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db';
import { encryptJSON } from '../security/secrets';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { requireClientPerm } from '../auth/clientPerms';

export default async function connectorsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.post(
    '/clients/:clientId/connectors/:provider',
    { preHandler: [tenantGuard(), requirePerm('integrations:write'), requireClientPerm('publish')] },
    async (request: any) => {
      const params = z.object({ clientId: z.string(), provider: z.string() }).parse(request.params);
      const body = z
        .object({
          payload: z.any().optional(),
          secrets: z.any().optional(),
        })
        .parse(request.body);

      const enc = body.secrets ? await encryptJSON(body.secrets) : null;

      await query(
        `INSERT INTO connectors (tenant_id, client_id, provider, payload, secrets_enc, secrets_meta)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6::jsonb)
         ON CONFLICT (tenant_id, client_id, provider)
         DO UPDATE SET payload=EXCLUDED.payload, secrets_enc=EXCLUDED.secrets_enc, secrets_meta=EXCLUDED.secrets_meta, updated_at=now()`,
        [
          (request.user as any).tenant_id,
          params.clientId,
          params.provider,
          JSON.stringify(body.payload ?? {}),
          enc?.enc ?? null,
          JSON.stringify(enc?.meta ?? {}),
        ]
      );

      const provider = params.provider.toLowerCase();
      const payload = body.payload ?? {};
      if (provider === 'reportei') {
        const accountId = payload.reportei_account_id || payload.account_id || payload.id;
        if (accountId) {
          await query(
            `UPDATE clients SET reportei_account_id=$3, updated_at=now() WHERE id=$1 AND tenant_id=$2`,
            [params.clientId, (request.user as any).tenant_id, String(accountId)]
          );
        }
      }

      return { ok: true };
    }
  );

  app.get(
    '/clients/:clientId/connectors',
    { preHandler: [tenantGuard(), requirePerm('clients:read'), requireClientPerm('read')] },
    async (request: any) => {
      const params = z.object({ clientId: z.string() }).parse(request.params);
      const { rows } = await query<any>(
        `SELECT provider, payload, secrets_meta, updated_at
         FROM connectors
         WHERE tenant_id=$1 AND client_id=$2
         ORDER BY provider ASC`,
        [(request.user as any).tenant_id, params.clientId]
      );
      return rows;
    }
  );

  app.get(
    '/clients/:clientId/connectors/:provider',
    { preHandler: [tenantGuard(), requirePerm('clients:read'), requireClientPerm('read')] },
    async (request: any) => {
      const params = z.object({ clientId: z.string(), provider: z.string() }).parse(request.params);
      const { rows } = await query<any>(
        `SELECT provider, payload, secrets_meta, updated_at
         FROM connectors
         WHERE tenant_id=$1 AND client_id=$2 AND provider=$3
         LIMIT 1`,
        [(request.user as any).tenant_id, params.clientId, params.provider]
      );
      if (!rows[0]) return null;
      return rows[0];
    }
  );
}
