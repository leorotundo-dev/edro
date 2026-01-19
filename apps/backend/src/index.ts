import { buildServer } from './server';
import { env } from './env';
import { runMigrations } from './migrate';

async function main() {
  if (env.DATABASE_URL && !env.DATABASE_URL.includes('host:')) {
    try {
      await runMigrations();
    } catch (error: any) {
      console.error('[migrations] erro ao executar migracoes:', error.message);
    }
  }

  const app = await buildServer();

  try {
    await app.listen({ port: env.PORT || 3333, host: '0.0.0.0' });
    app.log.info(`Edro backend rodando na porta ${env.PORT || 3333}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
