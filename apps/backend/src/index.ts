import { buildServer } from './server';
import { env } from './env';
import { runMigrations } from './migrate';
import { startJobsRunner } from './jobs/jobsRunner';
import { bootstrapCalendarEvents } from './services/calendarBootstrap';
import { configureWebhook } from './services/integrations/evolutionApiService';
import { query } from './db';

async function main() {
  if (env.DATABASE_URL && !env.DATABASE_URL.includes('host:')) {
    try {
      await runMigrations();
    } catch (error: any) {
      console.error('[migrations] erro ao executar migrações:', error.message);
    }
  }

  try {
    const result = await bootstrapCalendarEvents();
    if (!result.skipped) {
      console.log(
        `[calendar] CSV bootstrap loaded ${result.loaded} eventos (${result.errors} erros).`
      );
    }
  } catch (error: any) {
    console.error('[calendar] falha ao carregar CSV:', error.message);
  }

  const app = await buildServer();
  startJobsRunner();

  try {
    await app.listen({ port: env.PORT || 3333, host: '0.0.0.0' });
    app.log.info(`Edro backend rodando na porta ${env.PORT || 3333}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Auto-configure Evolution API webhooks for all tenants on startup
  if (env.PUBLIC_API_URL && env.EVOLUTION_API_URL) {
    try {
      const { rows } = await query<{ id: string }>('SELECT id FROM tenants');
      for (const t of rows) {
        await configureWebhook(t.id).catch((e: any) =>
          console.warn(`[evolutionApi] webhook config failed for tenant ${t.id}:`, e.message),
        );
      }
      if (rows.length) console.log(`[evolutionApi] Webhooks configured for ${rows.length} tenant(s)`);
    } catch (e: any) {
      console.warn('[evolutionApi] Failed to auto-configure webhooks:', e.message);
    }
  }
}

main();
