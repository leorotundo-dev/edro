// Skip migration 0003 e continuar com 0004-0008
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

async function run() {
  console.log('🔧 Marcando migration 0003 como aplicada...');
  
  try {
    await pool.query(
      "INSERT INTO schema_migrations (name) VALUES ('0003_stage19_tables.sql') ON CONFLICT (name) DO NOTHING"
    );
    console.log('✅ OK\n');
  } catch (err) {
    console.log('⚠️  Já aplicada ou erro:', err.message, '\n');
  }
  
  // Agora executar migrations 0004-0008
  const migrationsDir = path.join(__dirname, 'src', 'db', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && f >= '0004')
    .sort();
  
  console.log(`📁 Executando ${files.length} migrations novas:\n`);
  
  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, 'utf-8');
    
    console.log(`🔄 ${file}...`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [file]
      );
      await client.query('COMMIT');
      console.log(`   ✅ Sucesso!\n`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`   ❌ Erro: ${err.message}\n`);
    } finally {
      client.release();
    }
  }
  
  console.log('🎉 CONCLUÍDO!\n');
  await pool.end();
}

run().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
