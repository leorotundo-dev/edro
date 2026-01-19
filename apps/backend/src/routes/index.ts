import { FastifyInstance } from 'fastify';
import healthRoutes from './health';
import plansRoutes from './plans';
import authRoutes from './auth';
import disciplinesRoutes from './disciplines';
import dropsRoutes from './drops';
import trailRoutes from './trail';
import srsRoutes from './srs';
import { adminPlanRoutes } from './admin-plan';
import { dailyPlanRoutes } from './daily-plan';
import { dailyPlanRoutesV2 } from './daily-plan-v2';
import { adminLearnRoutes } from './admin-learn';
import { learnRoutes } from './learn';
import { adminDebugRoutes, adminBlueprintsRoutes } from './admin-debug';
import { adminMetricsRoutes, adminHarvestRoutes, adminRagRoutes, adminUsersRoutes } from './admin-metrics';
import { adminCostsRealRoutes } from './admin-costs-real';
import { jobsRoutes } from './jobs';
import trackingRoutes from './tracking';
import reccoRoutes from './recco';
import questionsRoutes from './questions';
import simuladosRoutes from './simulados';
import progressRoutes from './progress';
import mnemonicsRoutes from './mnemonics';
import harvestRoutes from './harvest';
import ragRoutes from './rag';
import jobsAdminRoutes from './jobs-admin';
import monitoringRoutes from './monitoring';
import backupRoutes from './backup';
import databaseHealthRoutes from './database-health';
// import performanceRoutes from './performance'; // Temporariamente desabilitado
import securityRoutes from './security';
import apmRoutes from './apm';
import queuesRoutes from './queues';
import editaisRoutes from './editais';
import adminDashboardRoutes from './admin-dashboard';
import adminPaymentsRoutes from './admin-payments';
import bancasRoutes from './bancas';
import tutorRoutes from './tutor';
import gamificationRoutes from './gamification';
import notificationsRoutes from './notifications';
import simplifyRoutes from './simplify';
import accessibilityRoutes from './accessibility';
import circuitBreakersRoutes from './circuit-breakers';
import adminGamificationRoutes from './admin-gamification';
import adminNotificationsRoutes from './admin-notifications';
import paywallRoutes from './paywall';
import edroRoutes from './edro';
import { attachResolvedRole, enforceRoutePolicy } from '../middleware/rbac';
import { RequestContextService } from '../services/requestContext';

export async function registerRoutes(app: FastifyInstance) {
  // Health route at root
  app.register(healthRoutes);
  // Expor auth tamb├®m na raiz para compatibilidade (frontend antigo)
  app.register(authRoutes);

  // All other routes under /api prefix
  app.register(async (apiApp) => {
    // PreHandler: tenta decodificar JWT para popular req.user (rotas que exigem user.id)
    apiApp.addHook('preHandler', async (req, reply) => {
      let resolvedRole: string | null = null;
      try {
        await (req as any).jwtVerify();
        const jwtUser = req.user as { id?: string; sub?: string } | undefined;
        if (jwtUser?.sub && !jwtUser.id) {
          (req.user as any).id = jwtUser.sub;
        }
        resolvedRole = attachResolvedRole(req);
      } catch {
        // Ignorar; rotas que exigem auth responder├úo 401 quando req.user estiver indefinido
      }
      const user = req.user as { id?: string; sub?: string; plan?: string; role?: string } | undefined;
      RequestContextService.setRequestContext({
        userId: user?.id || user?.sub || null,
        plan: user?.plan ?? null,
        role: resolvedRole ?? user?.role ?? null,
      });
      return enforceRoutePolicy(req, reply);
    });

    apiApp.register(plansRoutes);
    apiApp.register(authRoutes);
    apiApp.register(disciplinesRoutes);
    apiApp.register(dropsRoutes);
    apiApp.register(trailRoutes);
    apiApp.register(srsRoutes);
    // adminAIRoutes dependem de pipelines de IA externos ao contexto do deploy atual.
    // apiApp.register(adminAIRoutes);
    apiApp.register(adminPlanRoutes);
    apiApp.register(dailyPlanRoutes);
    apiApp.register(dailyPlanRoutesV2);
    apiApp.register(adminLearnRoutes);
    apiApp.register(learnRoutes);
    apiApp.register(adminDebugRoutes);
    apiApp.register(adminBlueprintsRoutes);
    apiApp.register(adminMetricsRoutes);
    apiApp.register(adminHarvestRoutes);
    apiApp.register(adminRagRoutes);
    apiApp.register(adminUsersRoutes);
    apiApp.register(adminCostsRealRoutes);
    apiApp.register(jobsRoutes);
    apiApp.register(trackingRoutes);
    apiApp.register(reccoRoutes);
    apiApp.register(questionsRoutes);
    apiApp.register(simuladosRoutes);
    apiApp.register(progressRoutes);
    apiApp.register(mnemonicsRoutes);
    apiApp.register(harvestRoutes);
    apiApp.register(ragRoutes);
    apiApp.register(jobsAdminRoutes);
    apiApp.register(monitoringRoutes);
    apiApp.register(adminDashboardRoutes);
    apiApp.register(adminPaymentsRoutes);
    apiApp.register(backupRoutes);
    apiApp.register(databaseHealthRoutes);
    // apiApp.register(performanceRoutes); // Temporariamente desabilitado
    apiApp.register(securityRoutes);
    apiApp.register(apmRoutes);
    apiApp.register(queuesRoutes);
    apiApp.register(editaisRoutes);
    apiApp.register(circuitBreakersRoutes);
    apiApp.register(bancasRoutes);
    apiApp.register(tutorRoutes);
    apiApp.register(simplifyRoutes);
    apiApp.register(gamificationRoutes);
    apiApp.register(notificationsRoutes);
    apiApp.register(accessibilityRoutes);
    apiApp.register(adminGamificationRoutes);
    apiApp.register(adminNotificationsRoutes);
    apiApp.register(paywallRoutes);
    apiApp.register(edroRoutes);
  }, { prefix: '/api' });
}
