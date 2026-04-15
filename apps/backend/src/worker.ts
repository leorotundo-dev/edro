import http from 'http';
import { initRedis } from './cache/redis';
import { startJobsRunner } from './jobs/jobsRunner';
import { env } from './env';
import { runMigrations } from './migrate';

// Minimal HTTP server so Railway healthcheck passes.
// Workers have no application routes — only /health is served.
const PORT = Number(process.env.PORT || 3001);
const healthServer = http.createServer((req, res) => {
  res.writeHead(req.url === '/health' || req.url === '/' ? 200 : 404);
  res.end('ok');
});

async function main() {
  process.env.EDRO_PROCESS_KIND = process.env.EDRO_PROCESS_KIND || 'worker';

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

  healthServer.listen(PORT, () => {
    console.log(`[worker] healthcheck server on :${PORT}`);
  });

  startJobsRunner();
  console.log('[worker] background jobs started');
}

main().catch((e) => {
  console.error('[worker] fatal:', e);
  process.exit(1);
});
