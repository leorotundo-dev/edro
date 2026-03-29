import { initRedis } from './cache/redis';
import { startJobsRunner } from './jobs/jobsRunner';
import { env } from './env';
import { runMigrations } from './migrate';

async function main() {
  // Migrations are optional in worker mode — the HTTP instance runs them on startup.
  // Set RUN_MIGRATIONS=true on the worker service only if you need a standalone worker deployment.
  if (process.env.RUN_MIGRATIONS === 'true' && env.DATABASE_URL && !env.DATABASE_URL.includes('host:')) {
    try {
      await runMigrations();
    } catch (error: any) {
      console.error('[migrations] erro ao executar migrações:', error.message);
    }
  }

  await initRedis().catch((e: any) => console.warn('[redis] connect failed:', e.message));

  startJobsRunner();
  console.log('[worker] background jobs started (HTTP disabled)');
}

main().catch((e) => {
  console.error('[worker] fatal:', e);
  process.exit(1);
});
