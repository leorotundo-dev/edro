import { FastifyInstance } from 'fastify';
import { query } from '../db/db';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { sendEmail } from '../services/emailService';

const STAGE_COLORS: Record<string, string> = {
  briefing: '#5D87FF', copy_ia: '#94a3b8', aprovacao: '#FFAE1F',
  producao: '#FA896B', revisao: '#ff6600', entrega: '#13DEB9', done: '#13DEB9',
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

    const { rows: briefingSummary } = await query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'done' OR status = 'concluido')::int AS completed,
        COUNT(*) FILTER (WHERE due_at < now() AND status NOT IN ('done', 'concluido'))::int AS overdue
      FROM edro_briefings
      WHERE client_id = $1 AND created_at >= $2 AND created_at <= $3::date + interval '1 day'
    `, [clientId, dateFrom, dateTo]);

    const { rows: byStage } = await query(`
      SELECT status, COUNT(*)::int AS count
      FROM edro_briefings
      WHERE client_id = $1 AND created_at >= $2 AND created_at <= $3::date + interval '1 day'
      GROUP BY status
      ORDER BY count DESC
    `, [clientId, dateFrom, dateTo]);

    const { rows: copySummary } = await query(`
      SELECT
        COUNT(*)::int AS total_copies,
        ROUND(AVG(char_length(COALESCE(output, ''))))::int AS avg_chars
      FROM edro_copy_versions cv
      JOIN edro_briefings b ON b.id = cv.briefing_id
      WHERE b.client_id = $1 AND cv.created_at >= $2 AND cv.created_at <= $3::date + interval '1 day'
    `, [clientId, dateFrom, dateTo]);

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

  // Send report via email with full data and Edro branding
  app.post('/clients/:clientId/reports/email', {
    preHandler: [authGuard, tenantGuard(), requirePerm('exports:read')],
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['recipientEmail'],
        properties: {
          recipientEmail: { type: 'string', format: 'email' },
          from: { type: 'string' },
          to: { type: 'string' },
          clientName: { type: 'string' },
          template: { type: 'string' },
        },
      },
    },
  }, async (request: any) => {
    const tenantId = request.user.tenant_id;
    const { clientId } = request.params as { clientId: string };
    const { recipientEmail, from, to, clientName, template } = request.body as {
      recipientEmail: string; from?: string; to?: string; clientName?: string; template?: string;
    };

    const dateFrom = from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const dateTo = to || new Date().toISOString().slice(0, 10);

    // Fetch actual client name if not provided
    let name = clientName;
    if (!name) {
      const { rows } = await query(`SELECT name FROM edro_clients WHERE id = $1 OR slug = $1 LIMIT 1`, [clientId]);
      name = rows[0]?.name || clientId;
    }

    // Fetch report data
    const { rows: briefingSummary } = await query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'done' OR status = 'concluido')::int AS completed,
        COUNT(*) FILTER (WHERE due_at < now() AND status NOT IN ('done', 'concluido'))::int AS overdue
      FROM edro_briefings
      WHERE client_id = $1 AND created_at >= $2 AND created_at <= $3::date + interval '1 day'
    `, [clientId, dateFrom, dateTo]);

    const { rows: byStage } = await query(`
      SELECT status, COUNT(*)::int AS count
      FROM edro_briefings
      WHERE client_id = $1 AND created_at >= $2 AND created_at <= $3::date + interval '1 day'
      GROUP BY status ORDER BY count DESC
    `, [clientId, dateFrom, dateTo]);

    const { rows: copySummary } = await query(`
      SELECT COUNT(*)::int AS total_copies
      FROM edro_copy_versions cv JOIN edro_briefings b ON b.id = cv.briefing_id
      WHERE b.client_id = $1 AND cv.created_at >= $2 AND cv.created_at <= $3::date + interval '1 day'
    `, [clientId, dateFrom, dateTo]);

    const summary = briefingSummary[0] || { total: 0, completed: 0, overdue: 0 };
    const copies = copySummary[0]?.total_copies || 0;
    const isCliente = template === 'cliente';
    const templateLabel = template === 'executivo' ? 'Resumo Executivo' : template === 'cliente' ? 'Relatorio do Cliente' : 'Performance Completo';
    const today = new Date().toLocaleDateString('pt-BR');

    // Build branded HTML
    const stageChips = byStage.map((s: any) =>
      `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${STAGE_COLORS[s.status] || '#94a3b8'};color:#fff;margin-right:4px;">${escapeHtml(s.status)}: ${s.count}</span>`
    ).join(' ');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#0f172a;background:#fff;">
  <!-- Header -->
  <div style="border-bottom:3px solid #ff6600;padding-bottom:14px;margin-bottom:20px;">
    <div style="font-size:20px;font-weight:800;color:#ff6600;margin-bottom:4px;">Edro Studio</div>
    <div style="font-size:16px;font-weight:700;">${escapeHtml(templateLabel)}</div>
    <div style="font-size:12px;color:#64748b;margin-top:4px;">
      Cliente: <strong>${escapeHtml(name)}</strong> &nbsp;·&nbsp; Periodo: ${escapeHtml(dateFrom)} a ${escapeHtml(dateTo)}
    </div>
  </div>

  <!-- Stats -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <tr>
      <td style="text-align:center;padding:12px;border:1px solid #e2e8f0;border-radius:6px;width:25%;">
        <div style="font-size:24px;font-weight:800;color:#ff6600;">${summary.total}</div>
        <div style="font-size:11px;color:#64748b;">${isCliente ? 'Demandas' : 'Briefings'}</div>
      </td>
      <td style="text-align:center;padding:12px;border:1px solid #e2e8f0;width:25%;">
        <div style="font-size:24px;font-weight:800;color:#13DEB9;">${summary.completed}</div>
        <div style="font-size:11px;color:#64748b;">${isCliente ? 'Entregues' : 'Concluidos'}</div>
      </td>
      <td style="text-align:center;padding:12px;border:1px solid #e2e8f0;width:25%;">
        <div style="font-size:24px;font-weight:800;color:#FA896B;">${summary.overdue}</div>
        <div style="font-size:11px;color:#64748b;">${isCliente ? 'Pendentes' : 'Atrasados'}</div>
      </td>
      <td style="text-align:center;padding:12px;border:1px solid #e2e8f0;width:25%;">
        <div style="font-size:24px;font-weight:800;color:#5D87FF;">${copies}</div>
        <div style="font-size:11px;color:#64748b;">${isCliente ? 'Pecas' : 'Copies'}</div>
      </td>
    </tr>
  </table>

  <!-- Stage Distribution -->
  ${byStage.length > 0 ? `
  <div style="margin-bottom:20px;">
    <div style="font-size:13px;font-weight:700;margin-bottom:8px;">${isCliente ? 'Status das Demandas' : 'Distribuicao por Etapa'}</div>
    <div>${stageChips}</div>
  </div>
  ` : ''}

  <!-- CTA -->
  <div style="text-align:center;margin:24px 0;">
    <a href="${process.env.FRONTEND_URL || 'https://edro.studio'}/clients/${clientId}/reports" style="display:inline-block;background:#ff6600;color:#fff;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:13px;">
      Ver Relatorio Completo
    </a>
  </div>

  <!-- Footer -->
  <div style="border-top:2px solid #ff6600;padding-top:12px;margin-top:24px;font-size:11px;color:#94a3b8;">
    <strong style="color:#ff6600;">Edro Studio</strong> &nbsp;·&nbsp; Relatorio gerado em ${today}<br>
    edro.studio
  </div>
</body>
</html>`;

    const text = [
      `${templateLabel} — ${name}`,
      `Periodo: ${dateFrom} a ${dateTo}`,
      '',
      `Briefings: ${summary.total} | Concluidos: ${summary.completed} | Atrasados: ${summary.overdue} | Copies: ${copies}`,
      '',
      byStage.map((s: any) => `${s.status}: ${s.count}`).join(', '),
      '',
      `Acesse o relatorio completo em: ${process.env.FRONTEND_URL || 'https://edro.studio'}/clients/${clientId}/reports`,
    ].join('\n');

    const result = await sendEmail({
      to: recipientEmail,
      subject: `[Edro] ${templateLabel} — ${name} (${dateFrom} a ${dateTo})`,
      text,
      html,
    });

    return { success: result.ok, error: result.error };
  });
}
