// Completar migration 0003 (criar apenas o que falta)
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

async function complete() {
  console.log('🔧 Completando migration 0003...\n');
  
  const sql = `
-- Criar tabela job_logs
CREATE TABLE IF NOT EXISTS job_logs (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  items_processed INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB
);

-- Criar tabela job_schedule
CREATE TABLE IF NOT EXISTS job_schedule (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(255) NOT NULL UNIQUE,
  cron_expression VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_job_logs_job_name ON job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_job_logs_started_at ON job_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_job_schedule_job_name ON job_schedule(job_name);

-- Jobs padrão
INSERT INTO job_schedule (job_name, cron_expression, is_active)
VALUES
  ('extract-blueprints', '0 */6 * * *', true),
  ('generate-drops', '0 0 * * *', true),
  ('rag-feeder', '0 2 * * *', true)
ON CONFLICT (job_name) DO NOTHING;
  `;
  
  try {
    await pool.query(sql);
    console.log('✅ Migration 0003 completada com sucesso!\n');
    console.log('   ✅ Tabela job_logs criada');
    console.log('   ✅ Tabela job_schedule criada');
    console.log('   ✅ Índices criados');
    console.log('   ✅ 3 jobs padrão inseridos\n');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
  
  await pool.end();
}

complete().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
