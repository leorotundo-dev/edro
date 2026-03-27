import { FastifyInstance } from 'fastify';
import { query } from '../db/db';

export default async function clientReportTokensRoutes(app: FastifyInstance) {
  // POST /clients/:clientId/report-token — generate or retrieve token for a period
  app.post('/clients/:clientId/report-token', async (req, reply) => {
    const tenantId = (req as any).tenantId || process.env.DEFAULT_TENANT_ID || 'edro';
    const { clientId } = req.params as { clientId: string };
    const { period_month } = (req.body as any) || {};

    if (!period_month || !/^\d{4}-\d{2}$/.test(period_month)) {
      return reply.status(400).send({ error: 'period_month required (YYYY-MM)' });
    }

    // Upsert token
    const { rows } = await query(
      `INSERT INTO client_report_tokens (tenant_id, client_id, period_month)
       VALUES ($1, $2, $3)
       ON CONFLICT (client_id, period_month) DO UPDATE SET period_month = EXCLUDED.period_month
       RETURNING *`,
      [tenantId, clientId, period_month]
    );
    return reply.send({ token: rows[0] });
  });

  // GET /clients/:clientId/report-tokens — list all tokens for a client
  app.get('/clients/:clientId/report-tokens', async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const { rows } = await query(
      `SELECT * FROM client_report_tokens WHERE client_id = $1 ORDER BY period_month DESC`,
      [clientId]
    );
    return reply.send({ tokens: rows });
  });

  // DELETE /clients/:clientId/report-tokens/:tokenId — revoke
  app.delete('/clients/:clientId/report-tokens/:tokenId', async (req, reply) => {
    const { tokenId } = req.params as { clientId: string; tokenId: string };
    await query(`DELETE FROM client_report_tokens WHERE id = $1`, [tokenId]);
    return reply.send({ ok: true });
  });

  // GET /relatorio/:token — PUBLIC route, no auth — returns report data
  app.get('/relatorio/:token', { config: { skipAuth: true } }, async (req, reply) => {
    const { token } = req.params as { token: string };

    const { rows: tokenRows } = await query(
      `SELECT crt.*, c.name AS client_name, c.segment_primary, c.city, c.uf
       FROM client_report_tokens crt
       JOIN clients c ON c.id = crt.client_id
       WHERE crt.token = $1
         AND (crt.expires_at IS NULL OR crt.expires_at > now())`,
      [token]
    );
    if (!tokenRows[0]) return reply.status(404).send({ error: 'Relatório não encontrado ou expirado.' });

    const row = tokenRows[0];
    const { client_id, period_month } = row;

    const [jobsRes, invoicesRes, budgetsRes, healthRes, metricsRes] = await Promise.all([
      query(
        `SELECT pc.title, pc.status, pc.due_at, pc.updated_at
         FROM project_cards pc
         WHERE pc.client_id = $1
           AND to_char(pc.created_at, 'YYYY-MM') = $2
         ORDER BY pc.updated_at DESC
         LIMIT 50`,
        [client_id, period_month]
      ),
      query(
        `SELECT description, amount_brl, status, due_date, paid_at
         FROM invoices
         WHERE client_id = $1 AND period_month = $2 AND status != 'cancelled'`,
        [client_id, period_month]
      ),
      query(
        `SELECT platform, planned_brl, realized_brl
         FROM media_budgets
         WHERE client_id = $1 AND period_month = $2`,
        [client_id, period_month]
      ),
      query(
        `SELECT score, trend, factors
         FROM client_health_scores
         WHERE client_id = $1
         ORDER BY period_date DESC LIMIT 1`,
        [client_id]
      ),
      query(
        `SELECT platform, time_window, payload
         FROM learned_insights
         WHERE client_id = $1
           AND time_window = '30d'
         ORDER BY created_at DESC`,
        [client_id]
      ),
    ]);

    return reply.send({
      client: {
        name: row.client_name,
        segment: row.segment_primary,
        city: row.city,
        uf: row.uf,
      },
      period_month,
      jobs: jobsRes.rows,
      invoices: invoicesRes.rows,
      media_budgets: budgetsRes.rows,
      health: healthRes.rows[0] || null,
      metrics: metricsRes.rows,
    });
  });
}
