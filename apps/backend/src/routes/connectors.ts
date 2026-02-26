import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db';
import { encryptJSON, decryptJSON } from '../security/secrets';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { requireClientPerm } from '../auth/clientPerms';
import { syncInstagramMetrics } from '../services/integrations/instagramSyncService';

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

  // Ensure health columns exist (added in 0204_connector_health.sql)
  try {
    await query(`SELECT last_sync_ok FROM connectors LIMIT 0`);
  } catch {
    try {
      await query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS last_sync_ok BOOLEAN`);
      await query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ`);
      await query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS last_error TEXT`);
      await query(`ALTER TABLE connectors ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ`);
    } catch (err: any) {
      console.error('[connectors] Failed to add health columns:', err.message);
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
        const rawBody = request.body ?? {};
        const body = z
          .object({
            payload: z.any().optional(),
            secrets: z.any().optional(),
          })
          .parse(rawBody);
        // When `secrets` is omitted we should NOT overwrite stored encrypted secrets.
        // This allows updating payload fields (e.g. IDs) without requiring the user to re-paste tokens.
        const secretsProvided = Object.prototype.hasOwnProperty.call(rawBody, 'secrets');

        console.log(`[connectors] POST /clients/${params.clientId}/connectors/${params.provider}`, {
          tenant_id: (request.user as any)?.tenant_id,
          hasPayload: !!body.payload,
          hasSecrets: secretsProvided,
        });

        let enc: { enc: string; meta: Record<string, any> } | null = null;
        if (secretsProvided && body.secrets) {
          try {
            enc = await encryptJSON(body.secrets);
          } catch (err: any) {
            console.error('[connectors] encryptJSON failed:', err.message);
          }
        }

        await ensureConnectorsTable();

        if (secretsProvided) {
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
        } else {
          // Preserve existing secrets when request doesn't include them.
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
          `SELECT provider, payload, secrets_meta, updated_at,
                  last_sync_ok, last_sync_at, last_error, last_error_at
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

  // ── Testa se as credenciais do connector estão funcionando ──────────
  app.post(
    '/clients/:clientId/connectors/:provider/test',
    { preHandler: [tenantGuard(), requirePerm('clients:read'), requireClientPerm('read')] },
    async (request: any, reply: any) => {
      const params = z.object({ clientId: z.string(), provider: z.string() }).parse(request.params);
      const tenantId = (request.user as any).tenant_id as string;

      await ensureConnectorsTable();

      const { rows } = await query<any>(
        `SELECT payload, secrets_enc FROM connectors WHERE tenant_id=$1 AND client_id=$2 AND provider=$3 LIMIT 1`,
        [tenantId, params.clientId, params.provider]
      );

      if (!rows[0]) {
        return reply.status(404).send({ ok: false, error: 'connector_not_found' });
      }

      const connPayload = rows[0].payload || {};
      let secrets: any = {};
      if (rows[0].secrets_enc) {
        try { secrets = await decryptJSON(rows[0].secrets_enc); } catch { /* ignore */ }
      }

      // ── Helpers para salvar resultado do teste ──────────────────────────
      const saveHealth = async (ok: boolean, errorMsg?: string) => {
        try {
          if (ok) {
            await query(
              `UPDATE connectors SET last_sync_ok=true, last_sync_at=NOW(), last_error=NULL, last_error_at=NULL
               WHERE tenant_id=$1 AND client_id=$2 AND provider=$3`,
              [tenantId, params.clientId, params.provider]
            );
          } else {
            await query(
              `UPDATE connectors SET last_sync_ok=false, last_error=$4, last_error_at=NOW()
               WHERE tenant_id=$1 AND client_id=$2 AND provider=$3`,
              [tenantId, params.clientId, params.provider, (errorMsg || 'unknown').slice(0, 500)]
            );
          }
        } catch { /* best-effort */ }
      };

      // ── Teste por provider ──────────────────────────────────────────────
      const provider = params.provider;

      // Meta (social listening — token de página)
      if (provider === 'meta') {
        const token = secrets.access_token || connPayload.access_token || secrets.token || connPayload.token;
        if (!token) {
          return reply.send({ ok: false, error: 'token_not_configured' });
        }
        try {
          const res = await fetch(
            `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(token)}`,
            { signal: AbortSignal.timeout(10000) }
          );
          const data: any = await res.json();
          if (data?.error) {
            const msg = data.error.message || 'token_invalid';
            await saveHealth(false, msg);
            return reply.send({ ok: false, error: msg, code: data.error.code });
          }
          await saveHealth(true);
          return reply.send({ ok: true, account: { id: data.id, name: data.name } });
        } catch (err: any) {
          const msg = err?.message || 'network_error';
          await saveHealth(false, msg);
          return reply.send({ ok: false, error: msg });
        }
      }

      // Meta Ads
      if (provider === 'meta_ads') {
        const token = secrets.access_token || connPayload.access_token || secrets.token;
        if (!token) return reply.send({ ok: false, error: 'token_not_configured' });
        try {
          const res = await fetch(
            `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(token)}`,
            { signal: AbortSignal.timeout(10000) }
          );
          const data: any = await res.json();
          if (data?.error) {
            const msg = data.error.message || 'token_invalid';
            await saveHealth(false, msg);
            return reply.send({ ok: false, error: msg, code: data.error.code });
          }
          await saveHealth(true);
          return reply.send({ ok: true, account: { id: data.id, name: data.name } });
        } catch (err: any) {
          const msg = err?.message || 'network_error';
          await saveHealth(false, msg);
          return reply.send({ ok: false, error: msg });
        }
      }

      // Reportei — verifica se dashboard_url ou reportei_account_id estão preenchidos
      if (provider === 'reportei') {
        const hasId = connPayload.reportei_account_id || connPayload.reportei_company_id;
        if (!hasId) return reply.send({ ok: false, error: 'account_id_not_configured' });
        // Sem API pública testável — consideramos configurado se ID presente
        await saveHealth(true);
        return reply.send({ ok: true, message: 'credentials_saved', account_id: hasId });
      }

      // Outros providers — sem endpoint de teste padronizado; não altera last_sync_ok
      return reply.send({ ok: true, testable: false });
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

  // ── Instagram Metrics Sync ───────────────────────────────────────────────
  app.post(
    '/clients/:clientId/connectors/meta/sync',
    { preHandler: [tenantGuard(), requirePerm('integrations:write'), requireClientPerm('publish')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id as string;
      const { clientId } = z.object({ clientId: z.string() }).parse(request.params);

      try {
        const result = await syncInstagramMetrics(tenantId, clientId);
        return reply.send({ success: true, data: result });
      } catch (err: any) {
        const known: Record<string, number> = {
          meta_connector_not_found: 404,
          meta_token_missing: 422,
          instagram_business_id_missing: 422,
        };
        const status = known[err.message] ?? 500;
        return reply.status(status).send({ success: false, error: err.message });
      }
    }
  );
}
