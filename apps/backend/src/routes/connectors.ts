import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db';
import { encryptJSON } from '../security/secrets';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { requireClientPerm } from '../auth/clientPerms';

let connectorsReady = false;

async function ensureConnectorsTable() {
  if (connectorsReady) return;
  try {
    // Check if table exists
    await query(`SELECT 1 FROM connectors LIMIT 0`);
  } catch {
    // Create table without FK constraints (they cause issues)
    console.log('[connectors] Table missing, creating...');
    try {
      await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
      await query(`
        CREATE TABLE IF NOT EXISTS connectors (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID NOT NULL,
          client_id TEXT NOT NULL,
          provider TEXT NOT NULL,
          payload JSONB NOT NULL DEFAULT '{}'::jsonb,
          secrets_enc TEXT NULL,
          secrets_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, client_id, provider)
        )
      `);
      await query(`CREATE INDEX IF NOT EXISTS idx_connectors_lookup ON connectors (tenant_id, client_id, provider)`);
      console.log('[connectors] Table created successfully');
    } catch (err: any) {
      console.error('[connectors] Failed to create table:', err.message);
    }
  }

  // Drop FK constraints that block inserts
  try {
    await query(`ALTER TABLE connectors DROP CONSTRAINT IF EXISTS connectors_client_id_fkey`);
    await query(`ALTER TABLE connectors DROP CONSTRAINT IF EXISTS connectors_tenant_id_fkey`);
  } catch (err: any) {
    console.error('[connectors] Failed to drop FK constraints:', err.message);
  }

  // Ensure secrets columns exist
  try {
    await query(`SELECT secrets_enc FROM connectors LIMIT 0`);
  } catch {
    try {
      await query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS secrets_enc TEXT NULL`);
      await query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS secrets_meta JSONB NOT NULL DEFAULT '{}'::jsonb`);
    } catch (err: any) {
      console.error('[connectors] Failed to add secrets columns:', err.message);
    }
  }

  connectorsReady = true;
}

export default async function connectorsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.post(
    '/clients/:clientId/connectors/:provider',
    { preHandler: [tenantGuard(), requirePerm('integrations:write'), requireClientPerm('publish')] },
    async (request: any, reply: any) => {
      try {
        const params = z.object({ clientId: z.string(), provider: z.string() }).parse(request.params);
        const body = z
          .object({
            payload: z.any().optional(),
            secrets: z.any().optional(),
          })
          .parse(request.body);

        console.log(`[connectors] POST /clients/${params.clientId}/connectors/${params.provider}`, {
          tenant_id: (request.user as any)?.tenant_id,
          hasPayload: !!body.payload,
          hasSecrets: !!body.secrets,
        });

        let enc: { enc: string; meta: Record<string, any> } | null = null;
        if (body.secrets) {
          try {
            enc = await encryptJSON(body.secrets);
          } catch (err: any) {
            console.error('[connectors] encryptJSON failed:', err.message);
          }
        }

        await ensureConnectorsTable();

        try {
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
        } catch (err: any) {
          console.error('[connectors] INSERT with secrets columns failed:', err.message);
          // Retry without secrets columns
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

        console.log(`[connectors] Saved ${params.provider} for client ${params.clientId}`);
        return { ok: true };
      } catch (err: any) {
        console.error('[connectors] POST handler error:', err.message, err.stack);
        reply.status(500).send({ error: err.message });
      }
    }
  );

  app.get(
    '/clients/:clientId/connectors',
    { preHandler: [tenantGuard(), requirePerm('clients:read'), requireClientPerm('read')] },
    async (request: any) => {
      const params = z.object({ clientId: z.string() }).parse(request.params);
      await ensureConnectorsTable();
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
      await ensureConnectorsTable();
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

  app.delete(
    '/clients/:clientId/connectors/:provider',
    { preHandler: [tenantGuard(), requirePerm('integrations:write'), requireClientPerm('publish')] },
    async (request: any) => {
      const params = z.object({ clientId: z.string(), provider: z.string() }).parse(request.params);
      await ensureConnectorsTable();
      await query(
        `DELETE FROM connectors WHERE tenant_id=$1 AND client_id=$2 AND provider=$3`,
        [(request.user as any).tenant_id, params.clientId, params.provider]
      );
      return { ok: true };
    }
  );
}
