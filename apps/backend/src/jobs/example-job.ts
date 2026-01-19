import 'dotenv/config';
import { pool } from '../db/db';

async function main() {
  console.log('[Etapa 9] Example job iniciado');

  // Aqui entraria a lógica do job:
  // - leitura do banco
  // - chamadas de API
  // - atualizações etc.

  console.log('[Etapa 9] Example job finalizado');
}

main()
  .catch((err) => {
    console.error('[Etapa 9] Erro no job:', err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
    console.log('[Etapa 9] Conexão com BD encerrada');
  });
