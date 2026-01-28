import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import mime from 'mime-types';
import { tenantGuard } from '../auth/tenantGuard';
import { requireClientPerm, hasClientPerm } from '../auth/clientPerms';
import { requirePerm, authGuard } from '../auth/rbac';
import { audit } from '../audit/audit';
import { jsonDiff } from '../utils/diff';
import { query } from '../db';
import { buildKey, saveFile, readFile, deleteFile } from '../library/storage';
import { createLibraryItem, listLibraryItems, updateLibraryItem, getLibraryItem } from '../library/libraryRepo';
import { enqueueJob } from '../jobs/jobQueue';

export default async function libraryRoutes(app: FastifyInstance) {
  await app.register(multipart);

  app.get(
    '/clients/:clientId/library',
    { preHandler: [authGuard, tenantGuard(), requirePerm('library:read'), requireClientPerm('read')] },
    async (request: any) => {
      return listLibraryItems(
        (request.user as any).tenant_id,
        request.params.clientId,
        request.query || {}
      );
    }
  );

  app.post(
    '/clients/:clientId/library',
    { preHandler: [authGuard, tenantGuard(), requirePerm('library:write'), requireClientPerm('write')] },
    async (request: any) => {
      const body = z
        .object({
          type: z.enum(['note', 'link']),
          title: z.string().min(2),
          description: z.string().optional(),
          category: z.string().optional(),
          tags: z.array(z.string()).optional(),
          weight: z.enum(['low', 'medium', 'high']).optional(),
          use_in_ai: z.boolean().optional(),
          valid_from: z.string().optional(),
          valid_to: z.string().optional(),
          notes: z.string().optional(),
          source_url: z.string().url().optional(),
        })
        .parse(request.body);

      const item = await createLibraryItem({
        tenant_id: (request.user as any).tenant_id,
        client_id: request.params.clientId,
        ...body,
        created_by: (request.user as any).email,
      });

      await audit({
        actor_user_id: (request.user as any).sub,
        actor_email: (request.user as any).email,
        action: 'LIBRARY_ITEM_CREATED',
        entity_type: 'library_item',
        entity_id: item.id,
        after: item,
        ip: request.ip,
        user_agent: request.headers['user-agent'],
      });

      await enqueueJob((request.user as any).tenant_id, 'process_library_item', {
        library_item_id: item.id,
      });

      return item;
    }
  );

  app.post(
    '/clients/:clientId/library/upload',
    { preHandler: [authGuard, tenantGuard(), requirePerm('library:write'), requireClientPerm('write')] },
    async (request: any, reply: any) => {
      const data = await request.file();
      if (!data) return reply.code(400).send({ error: 'missing_file' });

      const buffer = await data.toBuffer();
      const mimeType = data.mimetype || (mime.lookup(data.filename) as string) || 'application/octet-stream';
      const key = buildKey((request.user as any).tenant_id, request.params.clientId, data.filename);

      await saveFile(buffer, key);

      const item = await createLibraryItem({
        tenant_id: (request.user as any).tenant_id,
        client_id: request.params.clientId,
        type: 'file',
        title: data.filename,
        category: 'geral',
        tags: [],
        weight: 'medium',
        use_in_ai: true,
        file_key: key,
        file_mime: mimeType,
        file_size_bytes: buffer.length,
        created_by: (request.user as any).email,
      });

      await audit({
        actor_user_id: (request.user as any).sub,
        actor_email: (request.user as any).email,
        action: 'LIBRARY_FILE_UPLOADED',
        entity_type: 'library_item',
        entity_id: item.id,
        after: { title: item.title, file_key: item.file_key, file_mime: item.file_mime, file_size_bytes: item.file_size_bytes },
        ip: request.ip,
        user_agent: request.headers['user-agent'],
      });

      await enqueueJob((request.user as any).tenant_id, 'process_library_item', {
        library_item_id: item.id,
      });

      return item;
    }
  );

  app.get(
    '/library/:id/file',
    { preHandler: [authGuard, tenantGuard(), requirePerm('library:read')] },
    async (request: any, reply: any) => {
      const item = await getLibraryItem((request.user as any).tenant_id, request.params.id);
      if (!item || item.type !== 'file') return reply.code(404).send({ error: 'not_found' });

      const allowed = await hasClientPerm({
        tenantId: (request.user as any).tenant_id,
        userId: (request.user as any).sub,
        role: (request.user as any).role,
        clientId: item.client_id,
        perm: 'read',
      });
      if (!allowed) return reply.code(403).send({ error: 'client_forbidden' });

      const buffer = await readFile(item.file_key);
      reply.header('Content-Type', item.file_mime || 'application/octet-stream');
      reply.header('Content-Disposition', `inline; filename="${item.title}"`);
      return reply.send(buffer);
    }
  );

  app.patch(
    '/library/:id',
    { preHandler: [authGuard, tenantGuard(), requirePerm('library:write')] },
    async (request: any, reply: any) => {
      const body = z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
          category: z.string().optional(),
          tags: z.array(z.string()).optional(),
          weight: z.enum(['low', 'medium', 'high']).optional(),
          use_in_ai: z.boolean().optional(),
          valid_from: z.string().nullable().optional(),
          valid_to: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
          source_url: z.string().url().nullable().optional(),
        })
        .parse(request.body);

      const { rows } = await query<any>(
        `SELECT * FROM library_items WHERE id=$1 AND tenant_id=$2`,
        [request.params.id, (request.user as any).tenant_id]
      );
      const current = rows[0];
      if (!current) return reply.code(404).send({ error: 'not_found' });

      const allowed = await hasClientPerm({
        tenantId: (request.user as any).tenant_id,
        userId: (request.user as any).sub,
        role: (request.user as any).role,
        clientId: current.client_id,
        perm: 'write',
      });
      if (!allowed) return reply.code(403).send({ error: 'client_forbidden' });

      const diff = jsonDiff(current, body);
      const next = await updateLibraryItem(request.params.id, (request.user as any).tenant_id, { ...body });

      const { rows: versionRows } = await query<any>(
        `SELECT COALESCE(MAX(version),0) v FROM library_item_versions WHERE library_item_id=$1`,
        [current.id]
      );
      const nextVersion = Number(versionRows[0]?.v ?? 0) + 1;

      await query(
        `INSERT INTO library_item_versions (library_item_id, version, snapshot, diff, created_by)
         VALUES ($1,$2,$3::jsonb,$4::jsonb,$5)`,
        [
          current.id,
          nextVersion,
          JSON.stringify(next),
          JSON.stringify(diff),
          (request.user as any).email ?? null,
        ]
      );

      await audit({
        actor_user_id: (request.user as any).sub,
        actor_email: (request.user as any).email,
        action: 'LIBRARY_ITEM_UPDATED',
        entity_type: 'library_item',
        entity_id: current.id,
        before: current,
        after: next,
        ip: request.ip,
        user_agent: request.headers['user-agent'],
      });

      await enqueueJob((request.user as any).tenant_id, 'process_library_item', {
        library_item_id: current.id,
      });

      return next;
    }
  );

  app.delete(
    '/library/:id',
    { preHandler: [authGuard, tenantGuard(), requirePerm('library:write')] },
    async (request: any, reply: any) => {
      const item = await getLibraryItem((request.user as any).tenant_id, request.params.id);
      if (!item) return reply.code(404).send({ error: 'not_found' });

      const allowed = await hasClientPerm({
        tenantId: (request.user as any).tenant_id,
        userId: (request.user as any).sub,
        role: (request.user as any).role,
        clientId: item.client_id,
        perm: 'write',
      });
      if (!allowed) return reply.code(403).send({ error: 'client_forbidden' });

      if (item.type === 'file' && item.file_key) {
        await deleteFile(item.file_key);
      }

      await query(`DELETE FROM library_items WHERE id=$1 AND tenant_id=$2`, [
        request.params.id,
        (request.user as any).tenant_id,
      ]);

      await audit({
        actor_user_id: (request.user as any).sub,
        actor_email: (request.user as any).email,
        action: 'LIBRARY_ITEM_DELETED',
        entity_type: 'library_item',
        entity_id: item.id,
        before: item,
        ip: request.ip,
        user_agent: request.headers['user-agent'],
      });

      return { ok: true };
    }
  );
}
