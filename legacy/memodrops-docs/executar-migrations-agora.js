#!/usr/bin/env node
/**
 * Script para executar migrações do sistema de jobs
 * Executa AUTOMATICAMENTE sem intervenção do usuário
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// SQL das migrações (inline para executar diretamente)
const MIGRATIONS_SQL = `
-- =====================================================
-- 0. CRIAR TABELA DE CONTROLE DE MIGRAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 1. JOBS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  data JSONB DEFAULT '{}',
  result JSONB,
  error TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_queue ON jobs(status, priority DESC, created_at ASC) 
  WHERE status = 'pending';

-- =====================================================
-- 2. JOB SCHEDULES
-- =====================================================
CREATE TABLE IF NOT EXISTS job_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(100) NOT NULL,
  schedule VARCHAR(100) NOT NULL,
  data JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_schedules_enabled ON job_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_job_schedules_next_run ON job_schedules(next_run);

-- =====================================================
-- 3. JOB LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_logs_job ON job_logs(job_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_job_logs_level ON job_logs(level);
CREATE INDEX IF NOT EXISTS idx_job_logs_timestamp ON job_logs(timestamp DESC);

-- =====================================================
-- 4. HARVEST SOURCES
-- =====================================================
CREATE TABLE IF NOT EXISTS harvest_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  base_url TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_harvest_sources_enabled ON harvest_sources(enabled);
CREATE INDEX IF NOT EXISTS idx_harvest_sources_type ON harvest_sources(type);
CREATE INDEX IF NOT EXISTS idx_harvest_sources_priority ON harvest_sources(priority DESC);

-- =====================================================
-- 5. HARVESTED CONTENT
-- =====================================================
CREATE TABLE IF NOT EXISTS harvested_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES harvest_sources(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  title VARCHAR(500),
  content_type VARCHAR(50),
  raw_html TEXT,
  parsed_content JSONB,
  metadata JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_harvested_content_source ON harvested_content(source_id);
CREATE INDEX IF NOT EXISTS idx_harvested_content_status ON harvested_content(status);
CREATE INDEX IF NOT EXISTS idx_harvested_content_type ON harvested_content(content_type);
CREATE INDEX IF NOT EXISTS idx_harvested_content_created ON harvested_content(created_at DESC);

-- =====================================================
-- 6. INSERIR JOBS AGENDADOS
-- =====================================================
INSERT INTO job_schedules (name, type, schedule, data, enabled)
VALUES 
  ('Daily Cleanup', 'cleanup', '0 3 * * *', '{}', true),
  ('Daily Harvest', 'harvest', '0 2 * * *', '{"limit": 20}', true),
  ('Weekly Stats Update', 'update_stats', '0 4 * * 0', '{}', true),
  ('Weekly Embedding Generation', 'generate_embeddings', '0 1 * * 6', '{}', false)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 7. REGISTRAR MIGRAÇÃO
-- =====================================================
INSERT INTO schema_migrations (name)
VALUES ('0011_jobs_system.sql')
ON CONFLICT (name) DO NOTHING;
`;

async function main() {
  console.log('\n🚀 EXECUTANDO MIGRAÇÕES DO SISTEMA DE JOBS\n');
  
  // Tentar obter DATABASE_URL de várias fontes
  let databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    // Tentar ler de .env.production (se existir)
    try {
      const envPath = path.join(__dirname, '.env.production');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/DATABASE_URL=(.+)/);
        if (match) {
          databaseUrl = match[1].trim();
        }
      }
    } catch (err) {
      // Ignorar erro
    }
  }
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não encontrada!');
    console.error('\n📝 Configure DATABASE_URL de uma destas formas:');
    console.error('   1. Variável de ambiente: export DATABASE_URL="postgresql://..."');
    console.error('   2. Arquivo .env na raiz do projeto');
    console.error('   3. Executar via Railway CLI: railway run node executar-migrations-agora.js\n');
    process.exit(1);
  }
  
  console.log('✅ DATABASE_URL encontrada');
  console.log(`📍 Host: ${new URL(databaseUrl).host}`);
  console.log('');
  
  const client = new Client({ connectionString: databaseUrl });
  
  try {
    console.log('🔌 Conectando ao PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado com sucesso!\n');
    
    console.log('🔄 Iniciando transação...');
    await client.query('BEGIN');
    
    console.log('📝 Executando SQL de migrações...');
    await client.query(MIGRATIONS_SQL);
    
    console.log('✅ SQL executado com sucesso!');
    
    console.log('💾 Commitando transação...');
    await client.query('COMMIT');
    
    console.log('✅ Transação commitada!\n');
    
    // Verificar tabelas criadas
    console.log('🔍 Verificando tabelas criadas...');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('jobs', 'job_schedules', 'job_logs', 'harvest_sources', 'harvested_content')
      ORDER BY table_name
    `);
    
    console.log(`\n📊 Tabelas criadas: ${result.rows.length}/5`);
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    // Verificar jobs agendados
    const schedules = await client.query('SELECT name, enabled FROM job_schedules ORDER BY name');
    console.log(`\n📅 Jobs agendados: ${schedules.rows.length}`);
    schedules.rows.forEach(row => {
      const status = row.enabled ? '🟢' : '🔴';
      console.log(`   ${status} ${row.name}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 MIGRAÇÕES EXECUTADAS COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n📋 PRÓXIMOS PASSOS:\n');
    console.log('   1. Reiniciar o backend no Railway');
    console.log('   2. Verificar logs do backend');
    console.log('   3. Testar endpoint: GET /api/admin/jobs/stats');
    console.log('   4. Criar um job de teste\n');
    console.log('✅ Sistema de jobs pronto para uso!\n');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ ERRO AO EXECUTAR MIGRAÇÕES:\n');
    console.error(err.message);
    console.error('\n📝 Detalhes do erro:');
    console.error(err);
    console.error('\n💡 Possíveis soluções:');
    console.error('   - Verificar se DATABASE_URL está correta');
    console.error('   - Verificar se PostgreSQL está acessível');
    console.error('   - Verificar permissões do usuário no banco');
    console.error('   - Tentar executar SQL manualmente no Railway Query Editor\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Executar
main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
