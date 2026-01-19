const { Client } = require('pg');

const sql = `
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  schedule VARCHAR(255),
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_schedules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,
  schedule VARCHAR(255),
  enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO jobs (name, description, schedule, enabled) VALUES
  ('extract-blueprints', 'Extrair estrutura de provas', '0 */6 * * *', true),
  ('generate-drops', 'Gerar drops de conteúdo', '0 0 * * *', true),
  ('rag-feeder', 'Alimentar sistema RAG', '0 2 * * *', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('0011_jobs_system.sql') ON CONFLICT (name) DO NOTHING;
INSERT INTO schema_migrations (name) VALUES ('0012_backup_system.sql') ON CONFLICT (name) DO NOTHING;
`;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔗 Conectando ao banco...');
    await client.connect();
    
    console.log('🔧 Executando fix das migrações...');
    await client.query(sql);
    
    console.log('✅ Fix aplicado com sucesso!');
    
    console.log('\n📊 Verificando migrações:');
    const migrations = await client.query('SELECT name FROM schema_migrations ORDER BY name');
    migrations.rows.forEach(row => console.log('  ✓', row.name));
    
    console.log('\n📊 Verificando tabelas:');
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('jobs', 'job_schedules') 
      ORDER BY table_name
    `);
    tables.rows.forEach(row => console.log('  ✓', row.table_name));
    
    console.log('\n🎉 TUDO CERTO! Agora reinicie o backend no Railway.');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

run();
