import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './env';
import { registerPlugins } from './plugins';
import { registerRoutes } from './routes';
import { JobService } from './services/jobService';
import { CronService } from './services/cronService';
import { SentryService } from './services/sentryService';
import { LoggerService } from './services/loggerService';
import { MonitoringService } from './middleware/monitoring';
import { BackupService } from './services/backupService';
import { DatabaseHealthService } from './services/databaseHealthService';
import { PerformanceService } from './middleware/performance';
import { RequestContextService } from './services/requestContext';

export async function buildServer() {
  // Inicializar Sentry
  SentryService.init();

  // Inicializar auto-monitoring
  MonitoringService.startAutoMonitoring();

  // Inicializar database health monitoring
  DatabaseHealthService.startHealthMonitoring(15); // A cada 15 minutos

  const app = fastify({
    logger: true
  });

  // Request context for per-request metrics/logging
  app.addHook('onRequest', RequestContextService.requestContextHook);

  // Request tracking middleware
  app.addHook('onRequest', MonitoringService.requestTracker);

  // Performance middlewares
  app.addHook('onRequest', PerformanceService.responseTimeMiddleware);
  app.addHook('preHandler', PerformanceService.requestSizeLimiter);

  // CORS - usar env ou defaults (inclui wildcard para *.vercel.app)
  const allowedOriginsList = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : [
        'https://*.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001'
      ];

  const allowAll = allowedOriginsList.includes('*');

  app.log.info('?? CORS habilitado para: ' + (allowAll ? 'ALL' : allowedOriginsList.join(', ')));

  await app.register(cors, {
    origin: (origin, cb) => {
      if (allowAll || !origin) return cb(null, true);

      const isAllowed = allowedOriginsList.some((allowed) => {
        if (allowed === origin) return true;
        if (allowed.startsWith('https://*.') && origin.startsWith('https://')) {
          const domain = allowed.replace('https://*.', '');
          return origin.endsWith(domain);
        }
        return false;
      });

      cb(null, isAllowed);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET
  });

  app.log.info('🔌 Registrando plugins...');
  await registerPlugins(app);
  app.log.info('✅ Plugins registrados!');
  
  app.log.info('🛣️  Iniciando registro de rotas...');
  await registerRoutes(app);
  app.log.info('✅ Registro de rotas concluído!');
  
  // Debug: listar todas as rotas registradas
  app.log.info('📋 Rotas registradas:');
  app.log.info(app.printRoutes());

  // Iniciar workers (apenas em produção ou se habilitado)
  if (process.env.ENABLE_WORKERS === 'true') {
    app.log.info('🚀 Iniciando Job Worker...');
    JobService.startJobWorker().catch(err => {
      app.log.error('Erro ao iniciar Job Worker:', err);
    });
    JobService.startJobWorkerWatchdog();

    app.log.info('🕐 Iniciando Cron...');
    CronService.startCron().catch(err => {
      app.log.error('Erro ao iniciar Cron:', err);
    });
  } else {
    app.log.info('⏸️  Workers desabilitados (use ENABLE_WORKERS=true para habilitar)');
  }

  // Graceful shutdown
  process.on('SIGTERM', () => {
    app.log.info('SIGTERM recebido, encerrando workers...');
    JobService.stopJobWorkerWatchdog();
    JobService.stopJobWorker();
    CronService.stopCron();
    app.close();
  });

  return app;
}
