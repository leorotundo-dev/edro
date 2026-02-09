import { FastifyInstance } from 'fastify';
import healthRoutes from './health';
import authRoutes from './auth';
import ssoRoutes from './sso';
import edroRoutes from './edro';
import calendarRoutes from './calendar';
import connectorsRoutes from './connectors';
import postRulesRoutes from './posts.rules';
import postEditRoutes from './posts.edit';
import searchRoutes from './search';
import webhooksRoutes from './webhooks';
import flagsRoutes from './flags';
import libraryRoutes from './library';
import libraryJobsRoutes from './libraryJobs';
import postSourcesRoutes from './postSources';
import eventsRoutes from './events';
import clientsRoutes from './clients';
import clippingRoutes from './clipping';
import productionRoutes from './production';
import campaignsRoutes from './campaigns';
import securityRoutes from './security';
import recommendationRoutes from './recommendations';
import socialListeningRoutes from './socialListening';
import integrationRoutes from './integration';
import mockupsRoutes from './mockups';
import planningRoutes from './planning';
import adminAiCostsRoutes from './adminAiCosts';
import tempPgVectorCheck from './_temp_pgvector_check';

export async function registerRoutes(app: FastifyInstance) {
  app.register(tempPgVectorCheck);
  app.register(healthRoutes);

  // ── TEMP: debug endpoint for LinkedIn profiles (remove after diagnosis) ──
  app.get('/debug/sl-profiles', async (request: any, reply) => {
    const { query: qm } = require('../db');
    const { rows } = await qm(
      `SELECT p.id, p.tenant_id, p.client_id, p.profile_url, p.display_name, p.is_active, p.last_collected_at, p.created_at
       FROM social_listening_profiles p
       ORDER BY p.created_at DESC
       LIMIT 50`
    );
    // Also check what tenants exist
    const { rows: tenants } = await qm(`SELECT DISTINCT tenant_id FROM social_listening_profiles`);
    // Check total mentions from linkedin profiles
    const { rows: mentionCount } = await qm(
      `SELECT COUNT(*) as total FROM social_listening_mentions WHERE platform='linkedin'`
    );
    return reply.send({ profiles: rows, tenants, linkedin_mentions: mentionCount[0]?.total || 0 });
  });
  app.register(authRoutes, { prefix: '/api' });
  app.register(ssoRoutes, { prefix: '/api' });
  app.register(edroRoutes, { prefix: '/api' });
  app.register(calendarRoutes, { prefix: '/api' });
  app.register(connectorsRoutes, { prefix: '/api' });
  app.register(postRulesRoutes, { prefix: '/api' });
  app.register(postEditRoutes, { prefix: '/api' });
  app.register(searchRoutes, { prefix: '/api' });
  app.register(webhooksRoutes, { prefix: '/api' });
  app.register(flagsRoutes, { prefix: '/api' });
  app.register(libraryRoutes, { prefix: '/api' });
  app.register(libraryJobsRoutes, { prefix: '/api' });
  app.register(postSourcesRoutes, { prefix: '/api' });
  app.register(eventsRoutes, { prefix: '/api' });
  app.register(clientsRoutes, { prefix: '/api' });
  app.register(clippingRoutes, { prefix: '/api' });
  app.register(productionRoutes, { prefix: '/api' });
  app.register(campaignsRoutes, { prefix: '/api' });
  app.register(securityRoutes, { prefix: '/api' });
  app.register(recommendationRoutes, { prefix: '/api' });
  app.register(socialListeningRoutes, { prefix: '/api' });
  app.register(integrationRoutes, { prefix: '/api' });
  app.register(mockupsRoutes, { prefix: '/api' });
  app.register(planningRoutes, { prefix: '/api' });
  app.register(adminAiCostsRoutes, { prefix: '/api' });
}
