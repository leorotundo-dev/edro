// check-migrations.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkMigrations() {
  const client = await pool.connect();
  try {
    console.log('Verificando a tabela de migrações...');
    
    // Verificar se a tabela existe
    const tableExistsResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'schema_migrations'
      );
    `);

    if (!tableExistsResult.rows[0].exists) {
      console.log('A tabela "schema_migrations" não existe. Nenhuma migração foi aplicada ainda.');
      return;
    }

    // Buscar migrações aplicadas
    const result = await client.query('SELECT name FROM schema_migrations ORDER BY name ASC');
    const appliedMigrations = result.rows.map(r => r.name);
    
    if (appliedMigrations.length === 0) {
        console.log('A tabela "schema_migrations" existe, mas está vazia.');
    } else {
        console.log('Migrações aplicadas:');
        appliedMigrations.forEach(name => {
            console.log(`- ${name}`);
        });
    }

  } catch (err) {
    console.error('Erro ao verificar as migrações:', err);
  } finally {
    await client.release();
    await pool.end();
  }
}

checkMigrations();
