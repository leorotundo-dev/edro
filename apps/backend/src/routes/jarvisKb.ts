/**
 * Jarvis KB Routes
 *
 * GET /clients/:clientId/jarvis-kb         — padrões aprendidos para um cliente
 * GET /clients/:clientId/jarvis-kb/search  — busca no KB por query
 * GET /agency-kb                           — padrões do Cérebro Mãe (admin)
 */

import { FastifyInstance } from 'fastify';
import { query } from '../db';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { requireClientPerm } from '../auth/clientPerms';
import { searchKbEntries, buildKbContext } from '../services/jarvisKbService';

export async function jarvisKbRoutes(app: FastifyInstance) {

  // ── GET /clients/:clientId/jarvis-kb ──────────────────────────────────────
  // Lista todos os padrões do KB de um cliente, agrupados por categoria.

  app.get('/clients/:clientId/jarvis-kb', {
    preHandler: [authGuard, requirePerm('clients:read'), tenantGuard(), requireClientPerm('read')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id as string;
    const { clientId } = request.params as { clientId: string };
    const q = request.query as Record<string, string>;

    const category = q['category'] ?? null;
    const evidenceFilter = q['evidence'] ?? null;
    const limit = Math.min(Number(q['limit'] ?? 100), 500);

    const params: any[] = [tenantId, clientId];
    const filters: string[] = [];

    if (category) { params.push(category); filters.push(`AND category = $${params.length}`); }
    if (evidenceFilter) { params.push(evidenceFilter); filters.push(`AND evidence_level = $${params.length}`); }

    const { rows } = await query(
      `SELECT id, topic, category, content, evidence_level,
              uplift_metric, uplift_value, confidence, sample_size,
              source, created_at, updated_at
       FROM jarvis_kb_entries
       WHERE tenant_id = $1 AND client_id = $2
         ${filters.join(' ')}
       ORDER BY
         CASE evidence_level
           WHEN 'rule'     THEN 1
           WHEN 'pattern'  THEN 2
           WHEN 'one_case' THEN 3
           ELSE 4
         END,
         uplift_value DESC NULLS LAST,
         updated_at DESC
       LIMIT ${limit}`,
      params
    );

    // Group by category for easier consumption
    const grouped: Record<string, any[]> = {};
    for (const row of rows) {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push({
        id: row.id,
        topic: row.topic,
        content: row.content,
        evidence_level: row.evidence_level,
        uplift_metric: row.uplift_metric,
        uplift_value: row.uplift_value !== null ? Number(row.uplift_value) : null,
        confidence: row.confidence !== null ? Number(row.confidence) : null,
        sample_size: row.sample_size,
        source: row.source,
        updated_at: row.updated_at,
      });
    }

    const summary = await buildKbContext(tenantId, clientId);

    return reply.send({
      success: true,
      data: {
        total: rows.length,
        by_category: grouped,
        prompt_block: summary.summary,
      },
    });
  });

  // ── GET /clients/:clientId/jarvis-kb/search ───────────────────────────────
  // Busca full-text no KB do cliente.

  app.get('/clients/:clientId/jarvis-kb/search', {
    preHandler: [authGuard, requirePerm('clients:read'), tenantGuard(), requireClientPerm('read')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id as string;
    const { clientId } = request.params as { clientId: string };
    const q = request.query as Record<string, string>;

    const searchQuery = q['q'];
    if (!searchQuery) return reply.status(400).send({ error: 'q param required' });

    const results = await searchKbEntries(tenantId, clientId, searchQuery, q['category']);

    return reply.send({ success: true, data: results });
  });

  // ── GET /agency-kb ────────────────────────────────────────────────────────
  // Padrões do Cérebro Mãe — requer permissão de admin.

  app.get('/agency-kb', {
    preHandler: [authGuard, requirePerm('admin'), tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id as string;
    const q = request.query as Record<string, string>;
    const category = q['category'] ?? null;
    const limit = Math.min(Number(q['limit'] ?? 100), 500);

    const params: any[] = [tenantId];
    const filters: string[] = [];
    if (category) { params.push(category); filters.push(`AND category = $${params.length}`); }

    const { rows } = await query(
      `SELECT id, topic, category, content, evidence_level,
              client_count, client_ids, avg_uplift, avg_confidence,
              promoted_at, last_validated
       FROM jarvis_agency_kb_entries
       WHERE tenant_id = $1
         ${filters.join(' ')}
       ORDER BY
         CASE evidence_level WHEN 'rule' THEN 1 ELSE 2 END,
         client_count DESC,
         avg_uplift DESC NULLS LAST
       LIMIT ${limit}`,
      params
    );

    return reply.send({
      success: true,
      data: {
        total: rows.length,
        entries: rows.map(r => ({
          id: r.id,
          topic: r.topic,
          category: r.category,
          content: r.content,
          evidence_level: r.evidence_level,
          client_count: r.client_count,
          avg_uplift: r.avg_uplift !== null ? Number(r.avg_uplift) : null,
          avg_confidence: r.avg_confidence !== null ? Number(r.avg_confidence) : null,
          promoted_at: r.promoted_at,
          last_validated: r.last_validated,
        })),
      },
    });
  });
}
