// Verificar o que existe da migration 0003
const fs = require('fs');
const path = require('path');

// Ler .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  console.log('🔍 Verificando status da migration 0003...\n');
  
  // Verificar tabelas
  const tables = ['drop_cache', 'job_logs', 'job_schedule'];
  
  for (const table of tables) {
    try {
      const result = await pool.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
        [table]
      );
      if (result.rows[0].exists) {
        console.log(`✅ Tabela ${table} existe`);
      } else {
        console.log(`❌ Tabela ${table} NÃO existe`);
      }
    } catch (err) {
      console.log(`❌ Erro ao verificar ${table}: ${err.message}`);
    }
  }
  
  console.log('\n🔍 Verificando colunas na tabela drops...\n');
  
  const columns = ['blueprint_id', 'topic_code', 'drop_type', 'drop_text'];
  
  for (const column of columns) {
    try {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'drops' AND column_name = $1
        )`,
        [column]
      );
      if (result.rows[0].exists) {
        console.log(`✅ Coluna drops.${column} existe`);
      } else {
        console.log(`❌ Coluna drops.${column} NÃO existe`);
      }
    } catch (err) {
      console.log(`❌ Erro: ${err.message}`);
    }
  }
  
  await pool.end();
}

check().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
