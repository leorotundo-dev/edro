// apps/backend/check-migrations.js
const { Pool } = require('pg');
// dotenv é carregado pelo ts-node-dev, mas não por node puro.
// Carregar manualmente para execução via node.
const dotenv = require('dotenv');
const path = require('path');

// Tentar carregar .env do diretório raiz do monorepo
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Tentar carregar .env específico do backend se existir
dotenv.config({ path: path.resolve(__dirname, '.env') });


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkMigrations() {
  const client = await pool.connect();
  try {
    console.log('Verificando o estado das migrações...');
    
    const tableExistsResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'schema_migrations'
      );
    `);

    if (!tableExistsResult.rows[0].exists) {
      console.log('---');
      console.log('STATUS: A tabela "schema_migrations" não existe.');
      console.log('Nenhuma migração foi aplicada ainda.');
      console.log('---');
      return;
    }

    const result = await client.query('SELECT name FROM schema_migrations ORDER BY name ASC');
    const appliedMigrations = result.rows.map(r => r.name);
    
    console.log('---');
    if (appliedMigrations.length === 0) {
        console.log('STATUS: A tabela "schema_migrations" existe, mas está vazia.');
    } else {
        console.log('STATUS: Migrações aplicadas no banco de dados:');
        appliedMigrations.forEach(name => {
            console.log(`- ${name}`);
        });
    }
    console.log('---');

  } catch (err) {
    console.error('---');
    console.error('ERRO: Não foi possível verificar as migrações.');
    console.error(err.message);
    console.error('---');
  } finally {
    await client.release();
    await pool.end();
  }
}

checkMigrations();
