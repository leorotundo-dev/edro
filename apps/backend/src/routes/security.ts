import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { pool } from '../db';

export default async function securityRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  app.get('/security/immutable-audit', { preHandler: [requirePerm('clients:read')] }, async (request: any) => {
    const tenantId = (request.user as any).tenant_id as string;

    const querySchema = z.object({
      status: z.string().optional(),
      risk_level: z.string().optional(),
      min_risk: z.coerce.number().int().optional(),
      max_risk: z.coerce.number().int().optional(),
      limit: z.coerce.number().int().min(1).max(500).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    });

    const query = querySchema.parse(request.query ?? {});
    const params: any[] = [tenantId];
    let where = 'WHERE tenant_id=$1';

    if (query.status) {
      params.push(query.status);
      where += ` AND action_status=$${params.length}`;
    }
    if (query.risk_level) {
      params.push(query.risk_level);
      where += ` AND risk_level=$${params.length}`;
    }
    if (query.min_risk != null) {
      params.push(query.min_risk);
      where += ` AND risk_points >= $${params.length}`;
    }
    if (query.max_risk != null) {
      params.push(query.max_risk);
      where += ` AND risk_points <= $${params.length}`;
    }

    const limit = Math.min(query.limit ?? 200, 500);
    const offset = query.offset ?? 0;
    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT * FROM immutable_fields_audit ${where} ORDER BY created_at DESC LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      params
    );

    return { success: true, data: rows };
  });

  app.get('/security/access-logs', { preHandler: [requirePerm('clients:read')] }, async (request: any) => {
    const tenantId = (request.user as any).tenant_id as string;

    const querySchema = z.object({
      campaign_format_id: z.string().uuid().optional(),
      campaign_id: z.string().uuid().optional(),
      operation_type: z.string().optional(),
      suspicious: z.coerce.boolean().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(500).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    });

    const query = querySchema.parse(request.query ?? {});
    const params: any[] = [tenantId];
    let where = 'WHERE tenant_id=$1';

    if (query.campaign_format_id) {
      params.push(query.campaign_format_id);
      where += ` AND campaign_format_id=$${params.length}`;
    }
    if (query.campaign_id) {
      params.push(query.campaign_id);
      where += ` AND campaign_id=$${params.length}`;
    }
    if (query.operation_type) {
      params.push(query.operation_type);
      where += ` AND operation_type=$${params.length}`;
    }
    if (query.suspicious != null) {
      params.push(query.suspicious);
      where += ` AND is_suspicious=$${params.length}`;
    }
    if (query.from) {
      params.push(query.from);
      where += ` AND log_timestamp >= $${params.length}`;
    }
    if (query.to) {
      params.push(query.to);
      where += ` AND log_timestamp <= $${params.length}`;
    }

    const limit = Math.min(query.limit ?? 200, 500);
    const offset = query.offset ?? 0;
    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT * FROM catalog_snapshot_access_log ${where} ORDER BY log_timestamp DESC LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      params
    );

    return { success: true, data: rows };
  });

  app.get('/security/dashboard', { preHandler: [requirePerm('clients:read')] }, async (request: any) => {
    const tenantId = (request.user as any).tenant_id as string;

    const { rows: auditStats } = await pool.query(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE risk_level IN ('high', 'critical'))::int AS high_risk,
        COUNT(*) FILTER (WHERE action_status = 'blocked')::int AS blocked,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS last_7d
       FROM immutable_fields_audit
       WHERE tenant_id=$1`,
      [tenantId]
    );

    const { rows: accessStats } = await pool.query(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_suspicious = TRUE)::int AS suspicious,
        COUNT(*) FILTER (WHERE operation_type = 'SELECT')::int AS reads,
        COUNT(*) FILTER (WHERE operation_type = 'UPDATE')::int AS updates,
        COUNT(*) FILTER (WHERE operation_type = 'DELETE')::int AS deletes
       FROM catalog_snapshot_access_log
       WHERE tenant_id=$1
         AND log_timestamp > NOW() - INTERVAL '30 days'`,
      [tenantId]
    );

    const { rows: accessTimeline } = await pool.query(
      `SELECT * FROM catalog_snapshot_access_stats ORDER BY day DESC LIMIT 30`
    );

    return {
      success: true,
      data: {
        immutable_audit: auditStats[0] || {},
        access_log: accessStats[0] || {},
        access_timeline: accessTimeline || [],
      },
    };
  });
}
