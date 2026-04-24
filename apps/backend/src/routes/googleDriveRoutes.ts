import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { query } from '../db';
import { env } from '../env';
import {
  buildDriveFolderUrl,
  disconnectDrive,
  driveOAuthUrl,
  exchangeDriveCode,
  extractDriveFolderId,
} from '../services/integrations/googleDriveService';
import {
  provisionDriveForJob,
  retryPendingDriveProvisioning,
} from '../services/jobs/jobDriveProvisioningService';

function getIntegrationsRedirectUrl(queryString: string) {
  const webUrl = env.WEB_URL?.replace(/\/$/, '');
  if (!webUrl) {
    throw new Error('WEB_URL não configurado para redirecionar o fluxo do Google Drive.');
  }
  return `${webUrl}/admin/integrations?${queryString}`;
}

export default async function googleDriveRoutes(app: FastifyInstance) {
  app.get('/auth/google/drive/start', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request: any, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const mode = typeof request.query?.mode === 'string' ? request.query.mode : '';
    try {
      const url = driveOAuthUrl(tenantId);
      const redirectUri = new URL(url).searchParams.get('redirect_uri') ?? null;
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
      if (mode === 'json') {
        return reply.send({ url, redirectUri });
      }
      return reply.redirect(url);
    } catch (err: any) {
      return reply.code(503).send({ error: err.message });
    }
  });

  app.get('/auth/google/drive/callback', async (request: any, reply) => {
    const { code, state, error } = request.query as Record<string, string>;

    if (error) {
      return reply.redirect(getIntegrationsRedirectUrl(`drive_error=${encodeURIComponent(error)}`));
    }

    if (!code || !state) {
      return reply.code(400).send({ error: 'Missing code or state' });
    }

    try {
      const { email } = await exchangeDriveCode(code, state);
      return reply.redirect(getIntegrationsRedirectUrl(`drive_connected=${encodeURIComponent(email)}`));
    } catch (err: any) {
      console.error('[googleDriveRoutes] callback error:', err?.message);
      return reply.redirect(getIntegrationsRedirectUrl(`drive_error=${encodeURIComponent(err.message)}`));
    }
  });

  app.get('/drive/status', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request) => {
    const tenantId = (request.user as any).tenant_id;
    const [connectionRes, settingsRes] = await Promise.all([
      query<{
      email_address: string;
      token_expiry: string | null;
      connected_at: string;
      last_error: string | null;
      client_roots_count: string;
      pending_jobs_count: string;
    }>(
      `SELECT
         g.email_address,
         g.token_expiry,
         g.connected_at,
         g.last_error,
         (SELECT COUNT(*) FROM client_drive_roots WHERE tenant_id = $1 AND active = true)::text AS client_roots_count,
         (SELECT COUNT(*) FROM jobs
           WHERE tenant_id = $1
             AND client_id IS NOT NULL
             AND drive_provision_status IN ('pending', 'needs_connection', 'needs_root', 'error'))::text AS pending_jobs_count
       FROM google_drive_connections g
      WHERE g.tenant_id = $1
      LIMIT 1`,
      [tenantId],
      ),
      query<{
        clients_root_folder_id: string | null;
        clients_root_folder_url: string | null;
      }>(
        `SELECT clients_root_folder_id, clients_root_folder_url
           FROM google_drive_settings
          WHERE tenant_id = $1
          LIMIT 1`,
        [tenantId],
      ),
    ]);

    const settings = settingsRes.rows[0] ?? null;

    if (!connectionRes.rows.length) {
      return {
        configured: false,
        clientRoots: 0,
        pendingJobs: 0,
        clientsRootFolderId: settings?.clients_root_folder_id ?? null,
        clientsRootFolderUrl: settings?.clients_root_folder_url ?? null,
      };
    }

    const row = connectionRes.rows[0];
    return {
      configured: true,
      email: row.email_address,
      tokenExpiry: row.token_expiry,
      connectedAt: row.connected_at,
      lastError: row.last_error,
      clientRoots: Number(row.client_roots_count || 0),
      pendingJobs: Number(row.pending_jobs_count || 0),
      clientsRootFolderId: settings?.clients_root_folder_id ?? null,
      clientsRootFolderUrl: settings?.clients_root_folder_url ?? null,
    };
  });

  app.get('/drive/settings', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request) => {
    const tenantId = (request.user as any).tenant_id;
    const { rows } = await query(
      `SELECT clients_root_folder_id, clients_root_folder_url, updated_at
         FROM google_drive_settings
        WHERE tenant_id = $1
        LIMIT 1`,
      [tenantId],
    );

    return { data: rows[0] ?? null };
  });

  app.put('/drive/settings', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request: any, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const body = z.object({
      clients_root_folder_id: z.string().trim().optional(),
      clients_root_folder_url: z.string().trim().optional(),
    }).parse(request.body ?? {});

    const folderSource = body.clients_root_folder_id || body.clients_root_folder_url || '';
    const folderId = extractDriveFolderId(folderSource);
    if (!folderId) {
      return reply.status(400).send({ error: 'Informe o link ou ID da pasta raiz geral dos clientes.' });
    }

    const folderUrl = body.clients_root_folder_url || buildDriveFolderUrl(folderId);
    const { rows } = await query(
      `INSERT INTO google_drive_settings
         (tenant_id, clients_root_folder_id, clients_root_folder_url)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id) DO UPDATE
         SET clients_root_folder_id = EXCLUDED.clients_root_folder_id,
             clients_root_folder_url = EXCLUDED.clients_root_folder_url,
             updated_at = now()
       RETURNING *`,
      [tenantId, folderId, folderUrl],
    );

    return { data: rows[0] };
  });

  app.delete('/drive/disconnect', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request) => {
    const tenantId = (request.user as any).tenant_id;
    await disconnectDrive(tenantId);
    return { ok: true };
  });

  app.get('/drive/client-roots', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request) => {
    const tenantId = (request.user as any).tenant_id;
    const { rows } = await query(
      `SELECT
         c.id AS client_id,
         c.name AS client_name,
         c.profile->>'job_code_prefix' AS job_code_prefix,
         cdr.drive_folder_id,
         cdr.drive_folder_url,
         cdr.active,
         cdr.updated_at
       FROM clients c
       LEFT JOIN client_drive_roots cdr
         ON cdr.tenant_id = c.tenant_id::text
        AND cdr.client_id = c.id
      WHERE c.tenant_id::text = $1
      ORDER BY c.name ASC`,
      [tenantId],
    );

    return { data: rows };
  });

  app.put('/drive/client-roots/:clientId', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request: any, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const { clientId } = request.params as { clientId: string };
    const body = z.object({
      folder_id: z.string().trim().optional(),
      folder_url: z.string().trim().optional(),
      active: z.boolean().optional(),
      job_code_prefix: z.string().trim().min(2).max(12).optional(),
    }).parse(request.body ?? {});

    const folderSource = body.folder_id || body.folder_url || '';
    const folderId = extractDriveFolderId(folderSource);
    if (!folderId) {
      return reply.status(400).send({ error: 'Informe folder_id ou folder_url da pasta raiz do cliente.' });
    }

    const clientCheck = await query<{ id: string }>(
      `SELECT id FROM clients WHERE tenant_id::text = $1 AND id = $2 LIMIT 1`,
      [tenantId, clientId],
    );
    if (!clientCheck.rows.length) {
      return reply.status(404).send({ error: 'Cliente não encontrado.' });
    }

    const folderUrl = body.folder_url || buildDriveFolderUrl(folderId);
    const { rows } = await query(
      `INSERT INTO client_drive_roots
         (tenant_id, client_id, drive_folder_id, drive_folder_url, active)
       VALUES ($1, $2, $3, $4, COALESCE($5, true))
       ON CONFLICT (tenant_id, client_id) DO UPDATE
         SET drive_folder_id = EXCLUDED.drive_folder_id,
             drive_folder_url = EXCLUDED.drive_folder_url,
             active = EXCLUDED.active,
             updated_at = now()
       RETURNING *`,
      [tenantId, clientId, folderId, folderUrl, body.active ?? true],
    );

    if (body.job_code_prefix) {
      await query(
        `UPDATE clients
            SET profile = COALESCE(profile, '{}'::jsonb) || $3::jsonb,
                updated_at = now()
          WHERE tenant_id::text = $1
            AND id = $2`,
        [tenantId, clientId, JSON.stringify({ job_code_prefix: body.job_code_prefix })],
      );
    }

    return { data: rows[0] };
  });

  app.delete('/drive/client-roots/:clientId', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request: any) => {
    const tenantId = (request.user as any).tenant_id;
    const { clientId } = request.params as { clientId: string };
    await query(
      `UPDATE client_drive_roots
          SET active = false,
              updated_at = now()
        WHERE tenant_id = $1
          AND client_id = $2`,
      [tenantId, clientId],
    );
    return { ok: true };
  });

  app.post('/drive/jobs/:jobId/provision', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request: any) => {
    const tenantId = (request.user as any).tenant_id;
    const { jobId } = request.params as { jobId: string };
    const result = await provisionDriveForJob(tenantId, jobId);
    return { data: result };
  });

  app.post('/drive/provision/retry', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request: any) => {
    const tenantId = (request.user as any).tenant_id;
    const body = z.object({
      limit: z.number().int().min(1).max(100).optional(),
    }).parse(request.body ?? {});
    const result = await retryPendingDriveProvisioning(tenantId, body.limit ?? 25);
    return { data: result };
  });
}
