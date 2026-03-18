/**
 * Artwork Approval Routes
 *
 * Admin:
 *   POST  /artworks/upload               — upload criativo vinculado a briefing
 *   GET   /artworks/briefing/:id         — lista artworks de um briefing
 *   PATCH /artworks/:id                  — atualiza título
 *   DELETE /artworks/:id                 — remove artwork
 *
 * Portal cliente (JWT role='client'):
 *   GET   /portal/client/jobs/:id/artworks          — lista artworks do job
 *   POST  /portal/client/artworks/:id/approve       — cliente aprova
 *   POST  /portal/client/artworks/:id/revision      — cliente pede revisão
 */

import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { pool, query } from '../db';
import { buildKey, saveFile, deleteFile } from '../library/storage';

// ── helpers ──────────────────────────────────────────────────────────────────

function buildFileUrl(key: string): string {
  const base = process.env.S3_PUBLIC_URL ?? process.env.API_URL ?? '';
  if (base) return `${base.replace(/\/$/, '')}/api/artworks/file/${encodeURIComponent(key)}`;
  return `/api/artworks/file/${encodeURIComponent(key)}`;
}

function getPortalClientId(request: any): string | null {
  return request.user?.client_id ?? null;
}

// ── Admin routes ──────────────────────────────────────────────────────────────

export default async function artworksRoutes(app: FastifyInstance) {
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

  // ── Admin: upload ──────────────────────────────────────────────────────────
  app.post(
    '/artworks/upload',
    { preHandler: [authGuard, tenantGuard(), requirePerm('briefings:write')] },
    async (request: any, reply) => {
      const tenantId = request.user.tenant_id;
      const userId   = request.user.id;

      const data = await request.file();
      if (!data) return reply.status(400).send({ error: 'No file uploaded' });

      const { briefing_id, title } = data.fields as any;
      if (!briefing_id?.value) return reply.status(400).send({ error: 'briefing_id required' });

      // Verify briefing belongs to tenant
      const bCheck = await query<{ main_client_id: string }>(
        `SELECT main_client_id FROM edro_briefings WHERE id = $1 AND tenant_id = $2`,
        [briefing_id.value, tenantId],
      );
      if (!bCheck.rows.length) return reply.status(404).send({ error: 'Briefing not found' });
      const clientId = bCheck.rows[0].main_client_id ?? tenantId;

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      // Compute version number
      const vRes = await query<{ max: string }>(
        `SELECT COALESCE(MAX(version), 0) AS max FROM briefing_artworks WHERE briefing_id = $1`,
        [briefing_id.value],
      );
      const version = parseInt(vRes.rows[0].max) + 1;

      const key = buildKey(tenantId, clientId, data.filename);
      await saveFile(buffer, key);
      const fileUrl = buildFileUrl(key);

      const ins = await query<{ id: string }>(
        `INSERT INTO briefing_artworks
           (briefing_id, tenant_id, uploader_id, title, file_key, file_url, mime_type, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [briefing_id.value, tenantId, userId, title?.value || data.filename, key, fileUrl, data.mimetype, version],
      );

      return reply.status(201).send({ id: ins.rows[0].id, file_url: fileUrl, version });
    },
  );

  // ── Admin: list artworks for briefing ────────────────────────────────────
  app.get(
    '/artworks/briefing/:id',
    { preHandler: [authGuard, tenantGuard(), requirePerm('briefings:read')] },
    async (request: any, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user.tenant_id;

      const res = await query(
        `SELECT a.id, a.title, a.file_url, a.mime_type, a.version, a.status,
                a.approved_at, a.revision_comment, a.created_at,
                u.name AS uploader_name
         FROM briefing_artworks a
         LEFT JOIN edro_users u ON u.id = a.uploader_id
         WHERE a.briefing_id = $1 AND a.tenant_id = $2
         ORDER BY a.version DESC, a.created_at DESC`,
        [id, tenantId],
      );

      return reply.send({ artworks: res.rows });
    },
  );

  // ── Admin: update title ───────────────────────────────────────────────────
  app.patch(
    '/artworks/:id',
    { preHandler: [authGuard, tenantGuard(), requirePerm('briefings:write')] },
    async (request: any, reply) => {
      const { id } = request.params as { id: string };
      const { title } = z.object({ title: z.string().min(1) }).parse(request.body);
      const tenantId = request.user.tenant_id;

      await pool.query(
        `UPDATE briefing_artworks SET title = $1 WHERE id = $2 AND tenant_id = $3`,
        [title, id, tenantId],
      );
      return reply.send({ ok: true });
    },
  );

  // ── Admin: delete ─────────────────────────────────────────────────────────
  app.delete(
    '/artworks/:id',
    { preHandler: [authGuard, tenantGuard(), requirePerm('briefings:write')] },
    async (request: any, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user.tenant_id;

      const res = await query<{ file_key: string }>(
        `DELETE FROM briefing_artworks WHERE id = $1 AND tenant_id = $2 RETURNING file_key`,
        [id, tenantId],
      );
      if (!res.rows.length) return reply.status(404).send({ error: 'Not found' });

      try { await deleteFile(res.rows[0].file_key); } catch { /* ignore if file missing */ }
      return reply.status(204).send();
    },
  );

  // ── Admin: serve file ─────────────────────────────────────────────────────
  app.get(
    '/artworks/file/:key',
    { preHandler: [authGuard] },
    async (request: any, reply) => {
      const { key } = request.params as { key: string };
      const { readFile } = await import('../library/storage');
      const buf = await readFile(decodeURIComponent(key));
      return reply.send(buf);
    },
  );

  // ── Portal cliente: list artworks for job ─────────────────────────────────
  app.get(
    '/portal/client/jobs/:id/artworks',
    { preHandler: [async (req: any, reply: any) => { try { await req.jwtVerify(); } catch { return reply.status(401).send({ error: 'Unauthorized' }); } }] },
    async (request: any, reply) => {
      const clientId = getPortalClientId(request);
      if (!clientId) return reply.status(401).send({ error: 'Client auth required' });

      const { id } = request.params as { id: string };

      // Verify job belongs to client
      const check = await pool.query(
        `SELECT id FROM edro_briefings WHERE id = $1 AND main_client_id = $2`,
        [id, clientId],
      );
      if (!check.rows.length) return reply.status(404).send({ error: 'Job not found' });

      const res = await query(
        `SELECT id, title, file_url, mime_type, version, status, approved_at, revision_comment, created_at
         FROM briefing_artworks
         WHERE briefing_id = $1
         ORDER BY version DESC, created_at DESC`,
        [id],
      );
      return reply.send({ artworks: res.rows });
    },
  );

  // ── Portal cliente: approve artwork ──────────────────────────────────────
  app.post(
    '/portal/client/artworks/:id/approve',
    { preHandler: [async (req: any, reply: any) => { try { await req.jwtVerify(); } catch { return reply.status(401).send({ error: 'Unauthorized' }); } }] },
    async (request: any, reply) => {
      const clientId = getPortalClientId(request);
      if (!clientId) return reply.status(401).send({ error: 'Client auth required' });

      const { id } = request.params as { id: string };
      const { comment } = z.object({ comment: z.string().optional() }).parse(request.body ?? {});

      // Verify artwork belongs to client's job
      const check = await pool.query(
        `SELECT a.id FROM briefing_artworks a
         JOIN edro_briefings b ON b.id = a.briefing_id
         WHERE a.id = $1 AND b.main_client_id = $2`,
        [id, clientId],
      );
      if (!check.rows.length) return reply.status(404).send({ error: 'Artwork not found' });

      await pool.query(
        `UPDATE briefing_artworks
         SET status = 'approved', approved_at = NOW(), revision_comment = NULL
         WHERE id = $1 AND EXISTS (
           SELECT 1 FROM edro_briefings b WHERE b.id = briefing_id AND b.main_client_id = $2
         )`,
        [id, clientId],
      );

      return reply.send({ ok: true });
    },
  );

  // ── Portal cliente: request revision ─────────────────────────────────────
  app.post(
    '/portal/client/artworks/:id/revision',
    { preHandler: [async (req: any, reply: any) => { try { await req.jwtVerify(); } catch { return reply.status(401).send({ error: 'Unauthorized' }); } }] },
    async (request: any, reply) => {
      const clientId = getPortalClientId(request);
      if (!clientId) return reply.status(401).send({ error: 'Client auth required' });

      const { id } = request.params as { id: string };
      const { comment } = z.object({ comment: z.string().min(1) }).parse(request.body ?? {});

      const check = await pool.query(
        `SELECT a.id FROM briefing_artworks a
         JOIN edro_briefings b ON b.id = a.briefing_id
         WHERE a.id = $1 AND b.main_client_id = $2`,
        [id, clientId],
      );
      if (!check.rows.length) return reply.status(404).send({ error: 'Artwork not found' });

      await pool.query(
        `UPDATE briefing_artworks
         SET status = 'revision', revision_comment = $1, approved_at = NULL
         WHERE id = $2 AND EXISTS (
           SELECT 1 FROM edro_briefings b WHERE b.id = briefing_id AND b.main_client_id = $3
         )`,
        [comment, id, clientId],
      );

      return reply.send({ ok: true });
    },
  );
}
