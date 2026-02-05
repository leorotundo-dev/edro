import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db';
import { encryptJSON } from '../security/secrets';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { requireClientPerm } from '../auth/clientPerms';

let secretsColumnsExist: boolean | null = null;

async function ensureSecretsColumns() {
  if (secretsColumnsExist === true) return;
  try {
    await query(`SELECT secrets_enc FROM connectors LIMIT 0`);
    secretsColumnsExist = true;
  } catch {
    try {
      await query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS secrets_enc TEXT NULL`);
      await query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS secrets_meta JSONB NOT NULL DEFAULT '{}'::jsonb`);
      secretsColumnsExist = true;
    } catch (err: any) {
      console.error('[connectors] Failed to add secrets columns:', err.message);
      secretsColumnsExist = false;
    }
  }
}

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

      let enc: { enc: string; meta: Record<string, any> } | null = null;
      if (body.secrets) {
        try {
          enc = await encryptJSON(body.secrets);
        } catch (err: any) {
          console.error('[connectors] encryptJSON failed (MASTER_KEY_B64 missing?):', err.message);
        }
      }

      await ensureSecretsColumns();

      if (secretsColumnsExist) {
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
      } else {
        await query(
          `INSERT INTO connectors (tenant_id, client_id, provider, payload)
           VALUES ($1,$2,$3,$4::jsonb)
           ON CONFLICT (tenant_id, client_id, provider)
           DO UPDATE SET payload=EXCLUDED.payload, updated_at=now()`,
          [
            (request.user as any).tenant_id,
            params.clientId,
            params.provider,
            JSON.stringify(body.payload ?? {}),
          ]
        );
      }

      const provider = params.provider.toLowerCase();
      const payload = body.payload ?? {};
      if (provider === 'reportei') {
        const accountId = payload.reportei_account_id || payload.account_id || payload.id;
        if (accountId) {
          try {
            await query(
              `UPDATE clients SET reportei_account_id=$2, updated_at=now() WHERE id=$1`,
              [params.clientId, String(accountId)]
            );
          } catch (err: any) {
            console.error('[connectors] Failed to update clients.reportei_account_id:', err.message);
          }
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
      try {
        const { rows } = await query<any>(
          `SELECT provider, payload, secrets_meta, updated_at
           FROM connectors
           WHERE tenant_id=$1 AND client_id=$2
           ORDER BY provider ASC`,
          [(request.user as any).tenant_id, params.clientId]
        );
        return rows;
      } catch {
        // secrets_meta column may not exist yet
        const { rows } = await query<any>(
          `SELECT provider, payload, updated_at
           FROM connectors
           WHERE tenant_id=$1 AND client_id=$2
           ORDER BY provider ASC`,
          [(request.user as any).tenant_id, params.clientId]
        );
        return rows;
      }
    }
  );

  app.get(
    '/clients/:clientId/connectors/:provider',
    { preHandler: [tenantGuard(), requirePerm('clients:read'), requireClientPerm('read')] },
    async (request: any) => {
      const params = z.object({ clientId: z.string(), provider: z.string() }).parse(request.params);
      try {
        const { rows } = await query<any>(
          `SELECT provider, payload, secrets_meta, updated_at
           FROM connectors
           WHERE tenant_id=$1 AND client_id=$2 AND provider=$3
           LIMIT 1`,
          [(request.user as any).tenant_id, params.clientId, params.provider]
        );
        if (!rows[0]) return null;
        return rows[0];
      } catch {
        const { rows } = await query<any>(
          `SELECT provider, payload, updated_at
           FROM connectors
           WHERE tenant_id=$1 AND client_id=$2 AND provider=$3
           LIMIT 1`,
          [(request.user as any).tenant_id, params.clientId, params.provider]
        );
        if (!rows[0]) return null;
        return rows[0];
      }
    }
  );
}
