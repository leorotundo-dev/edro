import { FastifyInstance } from 'fastify';
import { query } from '../db';
import { MonitoringService } from '../middleware/monitoring';

interface CountRow {
  count: string | number;
}

async function getCount(sql: string, params: any[] = []): Promise<number> {
  const { rows } = await query<CountRow>(sql, params);
  const value = rows[0]?.count ?? 0;
  return typeof value === 'number' ? value : parseInt(value, 10);
}

async function safeCount(sql: string, params: any[] = []): Promise<number> {
  try {
    return await getCount(sql, params);
  } catch (err) {
    console.warn('[admin-dashboard] Falha ao contar, retornando 0:', err);
    return 0;
  }
}

export default async function adminDashboardRoutes(app: FastifyInstance) {
  app.get('/admin/dashboard/summary', async (_req, reply) => {
    try {
      const [
        totalUsers,
        activeUsersToday,
        dropsConsumedToday,
        editaisMonitored,
        avgStudyTimeMinutes,
        pendingValidations,
        simuladosScheduled,
        newUsersThisWeek
      ] = await Promise.all([
        safeCount('SELECT COUNT(*) AS count FROM users'),
        safeCount(
          `SELECT COUNT(DISTINCT user_id) AS count
             FROM user_sessions
            WHERE active = true
              AND last_activity >= CURRENT_DATE`
        ),
        safeCount(
          `SELECT COALESCE(SUM(drops_completed), 0) AS count
             FROM tracking_sessions
            WHERE DATE(started_at) = CURRENT_DATE`
        ),
        safeCount('SELECT COUNT(*) AS count FROM editais'),
        safeCount(
          `SELECT COALESCE(ROUND(AVG(duration_minutes)), 0) AS count
             FROM tracking_sessions
            WHERE duration_minutes IS NOT NULL
              AND started_at >= CURRENT_DATE - INTERVAL '7 days'`
        ),
        safeCount(
          `SELECT COUNT(*) AS count
             FROM editais
            WHERE status IN ('rascunho', 'em_andamento', 'suspenso')`
        ),
        safeCount('SELECT COUNT(*) AS count FROM simulados'),
        safeCount(
          `SELECT COUNT(*) AS count
             FROM users
            WHERE created_at >= (CURRENT_DATE - INTERVAL '7 days')`
        )
      ]);

      const alerts = MonitoringService.getAlerts(50);
      const alertsOpen = alerts.filter((alert) => (alert as any).status !== 'resolved').length;
      const retentionRate = totalUsers > 0 ? Number((activeUsersToday / totalUsers).toFixed(2)) : 0;

      return reply.send({
        success: true,
        data: {
          totalUsers,
          activeUsersToday,
          dropsConsumedToday,
          editaisMonitored,
          avgStudyTimeMinutes,
          pendingValidations,
          alertsOpen,
          simuladosScheduled,
          newUsersThisWeek,
          retentionRate,
          lastSync: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('[admin-dashboard] Erro ao gerar resumo', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao carregar resumo do dashboard'
      });
    }
  });
}
