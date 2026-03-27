import { FastifyInstance } from 'fastify';
import { query } from '../db/db';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';

// SQL fragment: derive ops_status from list name + optional override
// Used in multiple queries to avoid duplicating the CASE expression.
const OPS_STATUS_EXPR = `COALESCE(
  tlsm.ops_status,
  CASE
    WHEN pl.name ~* 'bloqueado|blocked|impedido'                               THEN 'blocked'
    WHEN pl.name ~* 'conclu|done|fechad|arquivad|finaliz|finish'               THEN 'done'
    WHEN pl.name ~* 'publicad|entregue|delivered|published'                    THEN 'published'
    WHEN pl.name ~* 'aprovado' AND pl.name !~* 'aguard|wait'                   THEN 'approved'
    WHEN pl.name ~* 'aprovacao|aprovação|aguard.*aprov|approval|waiting'       THEN 'awaiting_approval'
    WHEN pl.name ~* 'revisao|revisão|review|revisar'                           THEN 'in_review'
    WHEN pl.name ~* 'producao|produção|andamento|in.?progress|fazendo|doing'   THEN 'in_progress'
    WHEN pl.name ~* 'alocad|allocated'                                         THEN 'allocated'
    WHEN pl.name ~* 'pronto\\b|ready\\b'                                       THEN 'ready'
    WHEN pl.name ~* 'planej|classif'                                           THEN 'planned'
    ELSE 'intake'
  END
)`;

export default async function relatoriosRoutes(app: FastifyInstance) {

  // ─── Painel Executivo ────────────────────────────────────────────────────────
  // GET /admin/relatorios/painel — all clients with health, risk, production data
  app.get('/admin/relatorios/painel', { preHandler: [authGuard, tenantGuard(), requirePerm('admin')] }, async (req, reply) => {
    const tenantId = (req as any).tenantId || process.env.DEFAULT_TENANT_ID;
    if (!tenantId) return reply.status(401).send({ error: 'missing_tenant' });

    const { rows: clients } = await query(`
      WITH card_ops AS (
        -- Derive ops_status per card from list name or explicit override
        SELECT
          pc.id,
          pc.board_id,
          pc.due_date,
          pc.updated_at,
          ${OPS_STATUS_EXPR} AS ops_status
        FROM project_cards pc
        JOIN project_lists pl ON pl.id = pc.list_id
        LEFT JOIN trello_list_status_map tlsm
          ON tlsm.list_id = pl.id AND tlsm.tenant_id = $1
        WHERE pc.is_archived = false
          AND pc.tenant_id = $1
      ),
      board_stats AS (
        SELECT
          pb.client_id,
          COUNT(co.id) FILTER (WHERE co.ops_status NOT IN ('done','published','approved')) AS active_jobs,
          COUNT(co.id) FILTER (WHERE co.ops_status = 'blocked')                            AS blocked_jobs,
          COUNT(co.id) FILTER (
            WHERE co.due_date < CURRENT_DATE
              AND co.ops_status NOT IN ('done','published','approved')
          )                                                                                  AS overdue_jobs,
          MAX(co.updated_at)                                                                 AS last_job_activity
        FROM project_boards pb
        LEFT JOIN card_ops co ON co.board_id = pb.id
        WHERE pb.tenant_id = $1
          AND pb.client_id IS NOT NULL
          AND pb.client_id != ''
          AND pb.is_archived = false
        GROUP BY pb.client_id
      )
      SELECT
        c.id,
        c.name,
        c.segment_primary AS segment,
        hs.score          AS health_score,
        hs.trend          AS health_trend,
        COALESCE(bs.active_jobs,  0)::int AS active_jobs,
        COALESCE(bs.blocked_jobs, 0)::int AS blocked_jobs,
        COALESCE(bs.overdue_jobs, 0)::int AS overdue_jobs,
        bs.last_job_activity,
        (SELECT MAX(li.created_at) FROM learned_insights li WHERE li.client_id = c.id) AS last_metric_sync
      FROM clients c
      INNER JOIN board_stats bs ON bs.client_id = c.id
      LEFT JOIN LATERAL (
        SELECT score, trend FROM client_health_scores
        WHERE client_id = c.id ORDER BY period_date DESC LIMIT 1
      ) hs ON true
      ORDER BY hs.score ASC NULLS LAST, bs.active_jobs DESC
    `, [tenantId]);

    const enriched = clients.map((cl: any) => {
      const score   = cl.health_score !== null ? parseInt(cl.health_score, 10) : null;
      const blocked = cl.blocked_jobs as number;
      const overdue = cl.overdue_jobs as number;
      let risk: 'critical' | 'warning' | 'ok' = 'ok';
      if (score !== null && score < 40)        risk = 'critical';
      else if (score !== null && score < 65)   risk = 'warning';
      else if (blocked > 0 || overdue > 0)     risk = 'warning';
      if (blocked >= 3 || overdue >= 3)        risk = 'critical';
      return { ...cl, health_score: score, risk };
    });

    const withHealth = enriched.filter((c: any) => c.health_score !== null);
    const summary = {
      total:      enriched.length,
      critical:   enriched.filter((c: any) => c.risk === 'critical').length,
      warning:    enriched.filter((c: any) => c.risk === 'warning').length,
      ok:         enriched.filter((c: any) => c.risk === 'ok').length,
      avg_health: withHealth.length > 0
        ? Math.round(withHealth.reduce((s: number, c: any) => s + c.health_score, 0) / withHealth.length)
        : null,
    };

    return reply.send({ clients: enriched, summary });
  });

  // ─── Fila de Ação ────────────────────────────────────────────────────────────
  // GET /admin/relatorios/fila — prioritized action items across all clients
  app.get('/admin/relatorios/fila', { preHandler: [authGuard, tenantGuard(), requirePerm('admin')] }, async (req, reply) => {
    const tenantId = (req as any).tenantId || process.env.DEFAULT_TENANT_ID;
    if (!tenantId) return reply.status(401).send({ error: 'missing_tenant' });

    // CTE to filter clients that belong to this tenant (via project_boards)
    const clientsInTenantSql = `
      SELECT DISTINCT client_id FROM project_boards
      WHERE tenant_id = $1 AND client_id IS NOT NULL AND client_id != ''
    `;

    const [signalsRes, blockedRes, overdueRes, noMetricsRes, healthDropRes] = await Promise.all([

      // Active operational signals
      query(`
        SELECT id, domain, signal_type, severity, title, summary,
               entity_type, entity_id, client_id, client_name, actions, created_at
        FROM operational_signals
        WHERE tenant_id = $1
          AND resolved_at IS NULL
          AND (snoozed_until IS NULL OR snoozed_until < now())
        ORDER BY severity DESC, created_at DESC
        LIMIT 30
      `, [tenantId]).catch(() => ({ rows: [] as any[] })),

      // Blocked cards older than 1 day
      query(`
        SELECT pc.id, pc.title, c.name AS client_name, c.id AS client_id,
               pc.updated_at,
               EXTRACT(DAY FROM now() - pc.updated_at)::int AS days_blocked
        FROM project_cards pc
        JOIN project_lists pl ON pl.id = pc.list_id
        LEFT JOIN trello_list_status_map tlsm ON tlsm.list_id = pl.id AND tlsm.tenant_id = $1
        JOIN project_boards pb ON pb.id = pc.board_id AND pb.tenant_id = $1
        JOIN clients c ON c.id = pb.client_id
        WHERE pc.is_archived = false
          AND ${OPS_STATUS_EXPR} = 'blocked'
          AND pc.updated_at < now() - interval '1 day'
        ORDER BY pc.updated_at ASC
        LIMIT 20
      `, [tenantId]),

      // Overdue cards (past due_date, not done)
      query(`
        SELECT pc.id, pc.title, c.name AS client_name, c.id AS client_id,
               pc.due_date,
               EXTRACT(DAY FROM now() - pc.due_date)::int AS days_overdue
        FROM project_cards pc
        JOIN project_lists pl ON pl.id = pc.list_id
        LEFT JOIN trello_list_status_map tlsm ON tlsm.list_id = pl.id AND tlsm.tenant_id = $1
        JOIN project_boards pb ON pb.id = pc.board_id AND pb.tenant_id = $1
        JOIN clients c ON c.id = pb.client_id
        WHERE pc.is_archived = false
          AND pc.due_date < CURRENT_DATE
          AND ${OPS_STATUS_EXPR} NOT IN ('done', 'published', 'approved')
        ORDER BY pc.due_date ASC
        LIMIT 20
      `, [tenantId]),

      // Clients without recent metric sync (> 7 days) — scoped via project_boards
      query(`
        SELECT c.id, c.name, MAX(li.created_at) AS last_sync
        FROM clients c
        LEFT JOIN learned_insights li ON li.client_id = c.id
        WHERE c.id IN (${clientsInTenantSql})
        GROUP BY c.id, c.name
        HAVING MAX(li.created_at) < now() - interval '7 days' OR MAX(li.created_at) IS NULL
        ORDER BY last_sync ASC NULLS FIRST
        LIMIT 10
      `, [tenantId]),

      // Health score drops (>10 pts) — scoped via project_boards
      query(`
        SELECT c.id, c.name,
               hs_new.score AS current_score,
               hs_old.score AS previous_score,
               hs_new.score - hs_old.score AS drop
        FROM clients c
        JOIN LATERAL (
          SELECT score FROM client_health_scores WHERE client_id = c.id ORDER BY period_date DESC LIMIT 1
        ) hs_new ON true
        JOIN LATERAL (
          SELECT score FROM client_health_scores WHERE client_id = c.id ORDER BY period_date DESC LIMIT 1 OFFSET 1
        ) hs_old ON true
        WHERE c.id IN (${clientsInTenantSql})
          AND hs_new.score - hs_old.score < -10
        ORDER BY (hs_new.score - hs_old.score) ASC
        LIMIT 10
      `, [tenantId]),
    ]);

    type ActionItem = {
      id: string;
      type: 'signal' | 'blocked_job' | 'overdue_job' | 'no_metrics' | 'health_drop';
      severity: number;
      title: string;
      summary: string | null;
      client_name: string | null;
      client_id: string | null;
      actions: any[];
      created_at: string | null;
    };

    const items: ActionItem[] = [];

    for (const s of signalsRes.rows) {
      items.push({
        id: s.id, type: 'signal', severity: s.severity,
        title: s.title, summary: s.summary,
        client_name: s.client_name, client_id: s.client_id,
        actions: s.actions || [], created_at: s.created_at,
      });
    }

    for (const j of blockedRes.rows) {
      const days = j.days_blocked ?? 0;
      items.push({
        id: `blocked-${j.id}`, type: 'blocked_job',
        severity: Math.min(95, 60 + days * 5),
        title: `Job bloqueado há ${days}d: ${j.title}`,
        summary: null, client_name: j.client_name, client_id: j.client_id,
        actions: [], created_at: j.updated_at,
      });
    }

    for (const j of overdueRes.rows) {
      const days = j.days_overdue ?? 0;
      items.push({
        id: `overdue-${j.id}`, type: 'overdue_job',
        severity: Math.min(99, 70 + days * 5),
        title: `Job atrasado ${days}d: ${j.title}`,
        summary: null, client_name: j.client_name, client_id: j.client_id,
        actions: [], created_at: j.due_date,
      });
    }

    for (const cl of noMetricsRes.rows) {
      items.push({
        id: `nometrics-${cl.id}`, type: 'no_metrics', severity: 45,
        title: `Métricas desatualizadas: ${cl.name}`,
        summary: cl.last_sync
          ? `Última sync: ${new Date(cl.last_sync).toLocaleDateString('pt-BR')}`
          : 'Nunca sincronizado',
        client_name: cl.name, client_id: cl.id,
        actions: [], created_at: cl.last_sync,
      });
    }

    for (const cl of healthDropRes.rows) {
      items.push({
        id: `healthdrop-${cl.id}`, type: 'health_drop', severity: 75,
        title: `Saúde caiu ${Math.abs(cl.drop ?? 0)} pontos: ${cl.name}`,
        summary: `Score atual: ${cl.current_score} (era ${cl.previous_score})`,
        client_name: cl.name, client_id: cl.id,
        actions: [], created_at: null,
      });
    }

    items.sort((a, b) => b.severity - a.severity);

    return reply.send({
      items,
      summary: {
        total:    items.length,
        critical: items.filter((i) => i.severity >= 80).length,
        warning:  items.filter((i) => i.severity >= 50 && i.severity < 80).length,
        info:     items.filter((i) => i.severity < 50).length,
      },
    });
  });

  // ─── Financeiro Cruzado ──────────────────────────────────────────────────────
  // GET /admin/relatorios/financeiro?period=YYYY-MM
  app.get('/admin/relatorios/financeiro', { preHandler: [authGuard, tenantGuard(), requirePerm('admin')] }, async (req, reply) => {
    const tenantId = (req as any).tenantId || process.env.DEFAULT_TENANT_ID;
    if (!tenantId) return reply.status(401).send({ error: 'missing_tenant' });

    const { period } = (req.query as any) || {};
    const now = new Date();
    const currentMonth = period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [contractsRes, invoicesRes, budgetsRes, billingRes] = await Promise.all([

      // Active contracts
      query(`
        SELECT sc.client_id, c.name AS client_name,
               sc.type, sc.monthly_value_brl, sc.status
        FROM service_contracts sc
        JOIN clients c ON c.id = sc.client_id
        WHERE sc.tenant_id = $1::uuid AND sc.status = 'active'
        ORDER BY sc.monthly_value_brl DESC NULLS LAST
      `, [tenantId]).catch(() => ({ rows: [] as any[] })),

      // Invoices for the period
      query(`
        SELECT i.client_id, c.name AS client_name,
               SUM(i.amount_brl)                                       AS total_invoiced,
               COUNT(*) FILTER (WHERE i.status = 'paid')               AS paid_count,
               COUNT(*) FILTER (WHERE i.status = 'overdue')            AS overdue_count,
               SUM(i.amount_brl) FILTER (WHERE i.status = 'paid')      AS paid_amount
        FROM invoices i
        JOIN clients c ON c.id = i.client_id
        WHERE i.period_month = $1
        GROUP BY i.client_id, c.name
        ORDER BY total_invoiced DESC
      `, [currentMonth]).catch(() => ({ rows: [] as any[] })),

      // Media budgets for the period
      query(`
        SELECT mb.client_id, c.name AS client_name,
               SUM(mb.planned_brl)   AS total_planned,
               SUM(mb.realized_brl)  AS total_realized,
               json_agg(json_build_object(
                 'platform', mb.platform,
                 'planned',  mb.planned_brl,
                 'realized', mb.realized_brl
               )) AS platforms
        FROM media_budgets mb
        JOIN clients c ON c.id = mb.client_id
        WHERE mb.period_month = $1
        GROUP BY mb.client_id, c.name
        ORDER BY total_planned DESC
      `, [currentMonth]).catch(() => ({ rows: [] as any[] })),

      // DA billing entries for the period
      query(`
        SELECT dbe.period_month,
               SUM(dbe.rate_cents)                                   AS total_cents,
               COUNT(*)                                               AS entry_count,
               COUNT(*) FILTER (WHERE dbe.status = 'paid')           AS paid_count
        FROM da_billing_entries dbe
        WHERE dbe.period_month = $1
        GROUP BY dbe.period_month
      `, [currentMonth]).catch(() => ({ rows: [] as any[] })),
    ]);

    const totalMRR           = contractsRes.rows.reduce((s: number, r: any) => s + parseFloat(r.monthly_value_brl || '0'), 0);
    const totalInvoiced      = invoicesRes.rows.reduce((s: number, r: any) => s + parseFloat(r.total_invoiced || '0'), 0);
    const totalPaid          = invoicesRes.rows.reduce((s: number, r: any) => s + parseFloat(r.paid_amount || '0'), 0);
    const totalMediaPlanned  = budgetsRes.rows.reduce((s: number, r: any) => s + parseFloat(r.total_planned || '0'), 0);
    const totalMediaRealized = budgetsRes.rows.reduce((s: number, r: any) => s + parseFloat(r.total_realized || '0'), 0);
    const daCost = billingRes.rows[0]
      ? Math.round(parseInt(billingRes.rows[0].total_cents ?? '0', 10) / 100)
      : 0;

    return reply.send({
      period: currentMonth,
      summary: {
        mrr:            Math.round(totalMRR),
        invoiced:       Math.round(totalInvoiced),
        paid:           Math.round(totalPaid),
        overdue:        Math.round(totalInvoiced - totalPaid),
        media_planned:  Math.round(totalMediaPlanned),
        media_realized: Math.round(totalMediaRealized),
        da_cost:        daCost,
      },
      contracts:    contractsRes.rows,
      invoices:     invoicesRes.rows,
      media_budgets: budgetsRes.rows,
    });
  });
}
