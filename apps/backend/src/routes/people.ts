import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool, query } from '../db';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';

const PERSON_SELECT = `
  SELECT
    p.id,
    p.display_name,
    p.is_internal,
    p.avatar_url,
    p.notes,
    p.created_at,
    (
      SELECT json_agg(json_build_object(
        'type', pi.identity_type,
        'value', pi.identity_value,
        'primary', pi.is_primary
      ) ORDER BY pi.is_primary DESC)
      FROM person_identities pi
      WHERE pi.person_id = p.id AND pi.tenant_id = $1
    ) AS identities,
    (
      SELECT json_agg(json_build_object(
        'client_id', cc.client_id::text,
        'client_name', c.name,
        'contact_name', cc.name,
        'role', cc.role
      ))
      FROM client_contacts cc
      JOIN clients c ON c.id::text = cc.client_id::text
      WHERE cc.person_id = p.id AND cc.tenant_id = $1
    ) AS client_links,
    COALESCE((
      SELECT COUNT(*)::text
      FROM meeting_participants mp
      WHERE mp.person_id = p.id AND mp.tenant_id = $1
    ), '0') AS meeting_count
  FROM people p
`;

export default async function peopleRoutes(app: FastifyInstance) {
  // ── GET /people ──────────────────────────────────────────────────────────
  app.get('/people', {
    preHandler: [authGuard, requirePerm('clients:read'), tenantGuard()],
  }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const qs = request.query as { q?: string; limit?: string; internal?: string };
    const q = (qs.q || '').trim().toLowerCase();
    const limit = Math.min(Number(qs.limit || 100), 300);

    const params: any[] = [tenantId, limit];
    let searchClause = '';
    if (q) {
      params.push(`%${q}%`);
      const idx = params.length;
      searchClause = `AND (
        LOWER(p.display_name) LIKE $${idx}
        OR EXISTS (
          SELECT 1 FROM person_identities pi
          WHERE pi.person_id = p.id AND LOWER(pi.identity_value) LIKE $${idx}
        )
      )`;
    }

    let internalClause = '';
    if (qs.internal === 'true') internalClause = 'AND p.is_internal = true';
    if (qs.internal === 'false') internalClause = 'AND p.is_internal = false';

    const { rows } = await query(
      `${PERSON_SELECT}
       WHERE p.tenant_id = $1
         ${searchClause}
         ${internalClause}
       ORDER BY p.is_internal ASC, p.display_name ASC
       LIMIT $2`,
      params,
    );

    return reply.send({ success: true, data: rows });
  });

  // ── POST /people ─────────────────────────────────────────────────────────
  app.post('/people', {
    preHandler: [authGuard, requirePerm('clients:write'), tenantGuard()],
  }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const body = z.object({
      display_name: z.string().min(1).max(200),
      is_internal: z.boolean().optional().default(true),
      notes: z.string().max(2000).nullable().optional(),
      email: z.string().email().optional(),
    }).parse(request.body || {});

    const { rows } = await query(
      `INSERT INTO people (tenant_id, display_name, is_internal, notes)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [tenantId, body.display_name, body.is_internal ?? true, body.notes ?? null],
    );
    const personId = rows[0].id;

    if (body.email) {
      await query(
        `INSERT INTO person_identities (person_id, tenant_id, identity_type, identity_value, normalized_value, is_primary)
         VALUES ($1, $2, 'email', $3, LOWER($3), true)
         ON CONFLICT (tenant_id, identity_type, normalized_value) DO NOTHING`,
        [personId, tenantId, body.email.trim().toLowerCase()],
      );
    }

    return reply.code(201).send({ success: true, id: personId });
  });

  // ── PATCH /people/:id ────────────────────────────────────────────────────
  app.patch('/people/:id', {
    preHandler: [authGuard, requirePerm('clients:write'), tenantGuard()],
  }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { id } = request.params as { id: string };
    const body = z.object({
      display_name: z.string().min(1).max(200).optional(),
      is_internal: z.boolean().optional(),
      notes: z.string().max(2000).nullable().optional(),
      email: z.string().email().nullable().optional(),
    }).parse(request.body || {});

    const sets: string[] = ['updated_at = now()'];
    const vals: any[] = [id, tenantId];
    if (body.display_name !== undefined) { vals.push(body.display_name); sets.push(`display_name = $${vals.length}`); }
    if (body.is_internal !== undefined) { vals.push(body.is_internal); sets.push(`is_internal = $${vals.length}`); }
    if (body.notes !== undefined) { vals.push(body.notes); sets.push(`notes = $${vals.length}`); }

    const { rows } = await query(
      `UPDATE people SET ${sets.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      vals,
    );
    if (!rows.length) return reply.code(404).send({ error: 'not_found' });

    // Update primary email identity if provided
    if (body.email !== undefined) {
      await query(
        `DELETE FROM person_identities WHERE person_id = $1 AND tenant_id = $2 AND identity_type = 'email'`,
        [id, tenantId],
      );
      if (body.email) {
        await query(
          `INSERT INTO person_identities (person_id, tenant_id, identity_type, identity_value, normalized_value, is_primary)
           VALUES ($1, $2, 'email', $3, LOWER($3), true)
           ON CONFLICT (tenant_id, identity_type, normalized_value) DO NOTHING`,
          [id, tenantId, body.email.trim().toLowerCase()],
        );
      }
    }

    return reply.send({ success: true });
  });

  // ── DELETE /people/:id ───────────────────────────────────────────────────
  app.delete('/people/:id', {
    preHandler: [authGuard, requirePerm('clients:write'), tenantGuard()],
  }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { id } = request.params as { id: string };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query<{ id: string }>(
        `SELECT id FROM people WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        [id, tenantId],
      );
      if (!existing.rows.length) {
        await client.query('ROLLBACK');
        return reply.code(404).send({ error: 'not_found' });
      }

      const linkedUsers = await client.query<{ user_id: string }>(
        `SELECT DISTINCT eu.id AS user_id
           FROM edro_users eu
           JOIN tenant_users tu
             ON tu.user_id = eu.id
            AND tu.tenant_id = $2
           LEFT JOIN freelancer_profiles fp
             ON fp.user_id = eu.id
           LEFT JOIN person_identities pi
             ON pi.person_id::text = $1::text
            AND pi.tenant_id = $2
            AND pi.identity_type = 'email'
          WHERE fp.person_id::text = $1::text
             OR LOWER(eu.email) = pi.normalized_value`,
        [id, tenantId],
      );
      const userIds = linkedUsers.rows.map((row) => row.user_id);

      // Clear known references explicitly so delete does not depend on FK shape in legacy data.
      await client.query(
        `UPDATE client_contacts
            SET person_id = NULL
          WHERE person_id::text = $1::text
            AND tenant_id = $2`,
        [id, tenantId],
      );
      await client.query(
        `UPDATE freelancer_profiles
            SET person_id = NULL
          WHERE person_id::text = $1::text`,
        [id],
      );
      await client.query(
        `UPDATE meeting_participants
            SET person_id = NULL
          WHERE person_id::text = $1::text
            AND tenant_id = $2`,
        [id, tenantId],
      );
      await client.query(
        `UPDATE whatsapp_group_messages
            SET sender_person_id = NULL
          WHERE sender_person_id::text = $1::text
            AND tenant_id = $2`,
        [id, tenantId],
      );
      await client.query(
        `UPDATE whatsapp_messages
            SET sender_person_id = NULL
          WHERE sender_person_id::text = $1::text
            AND tenant_id = $2`,
        [id, tenantId],
      );

      if (userIds.length) {
        await client.query(
          `UPDATE freelancer_profiles
              SET is_active = false,
                  person_id = NULL,
                  updated_at = now()
            WHERE user_id = ANY($1::uuid[])`,
          [userIds],
        );
        await client.query(
          `DELETE FROM client_permissions
            WHERE tenant_id = $1
              AND user_id = ANY($2::uuid[])`,
          [tenantId, userIds],
        );
        await client.query(
          `DELETE FROM tenant_users
            WHERE tenant_id = $1
              AND user_id = ANY($2::uuid[])`,
          [tenantId, userIds],
        );
        await client.query(
          `UPDATE edro_users eu
              SET status = 'inactive',
                  updated_at = now()
            WHERE eu.id = ANY($1::uuid[])
              AND NOT EXISTS (
                SELECT 1
                  FROM tenant_users tu
                 WHERE tu.user_id = eu.id
              )`,
          [userIds],
        );
      }

      await client.query(
        `DELETE FROM person_identities
          WHERE person_id::text = $1::text
            AND tenant_id = $2`,
        [id, tenantId],
      );

      const deleted = await client.query<{ id: string }>(
        `DELETE FROM people WHERE id = $1 AND tenant_id = $2 RETURNING id`,
        [id, tenantId],
      );
      if (!deleted.rows.length) {
        await client.query('ROLLBACK');
        return reply.code(404).send({ error: 'not_found' });
      }

      await client.query('COMMIT');
      return reply.send({ success: true });
    } catch (error: any) {
      await client.query('ROLLBACK').catch(() => {});
      // Log full PG error details so Railway logs show the exact cause
      request.log?.error?.({
        err: error,
        pg_code: error?.code,
        pg_detail: error?.detail,
        pg_constraint: error?.constraint,
        pg_table: error?.table,
        pg_message: error?.message,
      }, 'people.delete failed');
      return reply.code(409).send({
        error: 'delete_failed',
        message: 'Não foi possível excluir este colaborador porque ainda existem vínculos operacionais ativos.',
        // Include pg details to help debug (remove after fix)
        debug: {
          code: error?.code,
          constraint: error?.constraint,
          table: error?.table,
          detail: error?.detail,
          message: error?.message,
        },
      });
    } finally {
      client.release();
    }
  });

  // ── DELETE /people/nameless — bulk-delete orphan records with no name and no linked data ──
  app.delete('/people/nameless', {
    preHandler: [authGuard, requirePerm('clients:write'), tenantGuard()],
  }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;

    const { rows } = await query(
      `DELETE FROM people p
       WHERE p.tenant_id = $1
         AND (COALESCE(TRIM(p.display_name), '') = '' OR p.display_name = 'Pessoa sem nome')
         AND NOT EXISTS (SELECT 1 FROM person_identities pi WHERE pi.person_id = p.id AND pi.tenant_id = $1)
         AND NOT EXISTS (SELECT 1 FROM meeting_participants mp WHERE mp.person_id = p.id AND mp.tenant_id = $1)
         AND NOT EXISTS (SELECT 1 FROM client_contacts cc WHERE cc.person_id = p.id AND cc.tenant_id = $1)
       RETURNING id`,
      [tenantId],
    );

    return reply.send({ success: true, deleted: rows.length });
  });

  // ── POST /people/:id/merge — merge targetId INTO id ──────────────────────
  // Re-parents all identities, contacts and meeting_participants from targetId to id,
  // then deletes targetId.
  app.post('/people/:id/merge', {
    preHandler: [authGuard, requirePerm('clients:write'), tenantGuard()],
  }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { id } = request.params as { id: string };
    const { target_id } = z.object({ target_id: z.string().uuid() }).parse(request.body || {});

    if (id === target_id) return reply.code(400).send({ error: 'same_person' });

    // Verify both belong to tenant
    const { rows: check } = await query(
      `SELECT id FROM people WHERE id = ANY($1) AND tenant_id = $2`,
      [[id, target_id], tenantId],
    );
    if (check.length < 2) return reply.code(404).send({ error: 'not_found' });

    // Move identities (skip on conflict — survivor already has it)
    await query(
      `UPDATE person_identities SET person_id = $1
       WHERE person_id = $2 AND tenant_id = $3
         AND NOT EXISTS (
           SELECT 1 FROM person_identities x
           WHERE x.person_id = $1 AND x.identity_type = person_identities.identity_type
             AND x.normalized_value = person_identities.normalized_value
         )`,
      [id, target_id, tenantId],
    );
    // Move client_contacts
    await query(
      `UPDATE client_contacts SET person_id = $1
       WHERE person_id = $2 AND tenant_id = $3`,
      [id, target_id, tenantId],
    );
    // Move meeting_participants
    await query(
      `UPDATE meeting_participants SET person_id = $1
       WHERE person_id = $2 AND tenant_id = $3`,
      [id, target_id, tenantId],
    );
    // Delete the duplicate
    await query(`DELETE FROM people WHERE id = $1 AND tenant_id = $2`, [target_id, tenantId]);

    return reply.send({ success: true });
  });
}
