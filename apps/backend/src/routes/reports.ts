import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db/db';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { sendEmail } from '../services/emailService';

export default async function reportsRoutes(app: FastifyInstance) {
  // Get report summary for a client
  app.get('/clients/:clientId/reports/summary', {
    preHandler: [authGuard, tenantGuard(), requirePerm('exports:read')],
  }, async (request: any) => {
    const tenantId = request.user.tenant_id;
    const { clientId } = request.params as { clientId: string };
    const { from, to } = request.query as { from?: string; to?: string };

    const dateFrom = from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const dateTo = to || new Date().toISOString().slice(0, 10);

    // Briefings summary
    const { rows: briefingSummary } = await query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'done' OR status = 'concluido')::int AS completed,
        COUNT(*) FILTER (WHERE due_at < now() AND status NOT IN ('done', 'concluido'))::int AS overdue
      FROM edro_briefings
      WHERE client_id = $1 AND created_at >= $2 AND created_at <= $3::date + interval '1 day'
    `, [clientId, dateFrom, dateTo]);

    // Briefings by stage
    const { rows: byStage } = await query(`
      SELECT status, COUNT(*)::int AS count
      FROM edro_briefings
      WHERE client_id = $1 AND created_at >= $2 AND created_at <= $3::date + interval '1 day'
      GROUP BY status
      ORDER BY count DESC
    `, [clientId, dateFrom, dateTo]);

    // Copy versions
    const { rows: copySummary } = await query(`
      SELECT
        COUNT(*)::int AS total_copies,
        ROUND(AVG(char_length(COALESCE(output, ''))))::int AS avg_chars
      FROM edro_copy_versions cv
      JOIN edro_briefings b ON b.id = cv.briefing_id
      WHERE b.client_id = $1 AND cv.created_at >= $2 AND cv.created_at <= $3::date + interval '1 day'
    `, [clientId, dateFrom, dateTo]);

    // Stage timeline (avg time per stage)
    const { rows: stageTimeline } = await query(`
      SELECT
        bs.stage,
        ROUND(AVG(EXTRACT(epoch FROM (bs.updated_at - bs.created_at)) / 3600), 1) AS avg_hours
      FROM edro_briefing_stages bs
      JOIN edro_briefings b ON b.id = bs.briefing_id
      WHERE b.client_id = $1 AND bs.created_at >= $2 AND bs.created_at <= $3::date + interval '1 day'
      GROUP BY bs.stage
      ORDER BY MIN(bs.position)
    `, [clientId, dateFrom, dateTo]);

    // Recent briefings list
    const { rows: briefings } = await query(`
      SELECT id, title, status, due_at, created_at
      FROM edro_briefings
      WHERE client_id = $1 AND created_at >= $2 AND created_at <= $3::date + interval '1 day'
      ORDER BY created_at DESC
      LIMIT 20
    `, [clientId, dateFrom, dateTo]);

    return {
      period: { from: dateFrom, to: dateTo },
      summary: briefingSummary[0] || { total: 0, completed: 0, overdue: 0 },
      byStage,
      copies: copySummary[0] || { total_copies: 0, avg_chars: 0 },
      stageTimeline,
      briefings,
    };
  });

  // Send report via email
  app.post('/clients/:clientId/reports/email', {
    preHandler: [authGuard, tenantGuard(), requirePerm('exports:read')],
    schema: {
      body: z.object({
        recipientEmail: z.string().email(),
        from: z.string().optional(),
        to: z.string().optional(),
        clientName: z.string().optional(),
      }),
    },
  }, async (request: any) => {
    const { recipientEmail, from, to, clientName } = request.body as {
      recipientEmail: string; from?: string; to?: string; clientName?: string;
    };

    const dateFrom = from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const dateTo = to || new Date().toISOString().slice(0, 10);

    const result = await sendEmail({
      to: recipientEmail,
      subject: `Edro: Relatorio ${clientName || 'Cliente'} (${dateFrom} a ${dateTo})`,
      text: `Relatorio de performance para ${clientName || 'o cliente'} no periodo de ${dateFrom} a ${dateTo}.\n\nAcesse o painel Edro para visualizar os detalhes completos.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff6600;">Relatorio de Performance</h2>
          <p><strong>Cliente:</strong> ${clientName || 'N/A'}</p>
          <p><strong>Periodo:</strong> ${dateFrom} a ${dateTo}</p>
          <p>Acesse o painel Edro para visualizar os detalhes completos do relatorio.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #6b7280; font-size: 12px;">Edro Studio - Relatorio automatico</p>
        </div>
      `,
    });

    return { success: result.ok, error: result.error };
  });
}
