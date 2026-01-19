import { buildServer } from './server';
import { env } from './env';
import { runMigrations } from './migrate';
import { initializeScheduler } from './scheduler/jobScheduler';

async function main() {
  // Executar migrações apenas se DATABASE_URL estiver configurada
  if (env.DATABASE_URL && !env.DATABASE_URL.includes('host:')) {
    try {
      console.log('🚀 Iniciando sistema de migrações...');
      await runMigrations();
      console.log('✅ Sistema de migrações finalizado!');
    } catch (error: any) {
      console.error('❌ ERRO CRÍTICO ao executar migrações:');
      console.error('   Mensagem:', error.message);
      console.error('   Stack:', error.stack);
      console.error('⚠️  Backend iniciará SEM as migrações!');
      // NÃO ignorar erro - deixar visível
    }
  } else {
    console.log('⚠️  DATABASE_URL não configurada ou inválida, pulando migrações');
  }
  
  const app = await buildServer();

  try {
    await app.listen({ port: env.PORT || 3333, host: '0.0.0.0' });
    app.log.info(`🚀 Edro backend rodando na porta ${env.PORT || 3333}`);

    // Inicializar scheduler apenas se tudo estiver OK
    if (env.DATABASE_URL && !env.DATABASE_URL.includes('host:')) {
      try {
        await initializeScheduler();
      } catch (error: any) {
        console.log('⚠️  Scheduler não disponível:', error.message);
      }
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
