// Script SUPER SIMPLES para rodar migrations
// Usa apenas módulos nativos do Node.js

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

console.log('🚀 Iniciando migrations...\n');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada no .env');
  process.exit(1);
}

console.log('✅ DATABASE_URL encontrada\n');

// Importar pg DEPOIS de carregar env
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations() {
  const result = await pool.query(
    'SELECT name FROM schema_migrations ORDER BY id ASC'
  );
  return new Set(result.rows.map((r) => r.name));
}

async function run() {
  console.log('🔧 Criando tabela schema_migrations...');
  await ensureMigrationsTable();
  console.log('✅ OK\n');

  const migrationsDir = path.join(__dirname, 'src', 'db', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`📁 Encontradas ${files.length} migrations\n`);

  const applied = await getAppliedMigrations();
  console.log(`✅ ${applied.size} migrations já aplicadas\n`);

  let newCount = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`⏭️  ${file} (já aplicada)`);
      continue;
    }

    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, 'utf-8');

    console.log(`\n🔄 Aplicando ${file}...`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (name) VALUES ($1)',
        [file]
      );
      await client.query('COMMIT');
      console.log(`   ✅ Sucesso!`);
      newCount++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`   ❌ Erro: ${err.message}`);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  console.log(`\n\n🎉 CONCLUÍDO!`);
  console.log(`   📊 ${newCount} novas migrations aplicadas`);
  console.log(`   ✅ Total: ${applied.size + newCount} migrations no banco\n`);
  
  await pool.end();
}

run().catch((err) => {
  console.error('\n❌ Erro fatal:', err.message);
  process.exit(1);
});
