# Fix Railway via CLI - Script Automatizado

Write-Host "🚀 Aplicando fix no Railway..." -ForegroundColor Cyan
Write-Host ""

# SQL commands em um arquivo temporário
$sqlCommands = @"
-- Marcar migração 0011
INSERT INTO schema_migrations (name) VALUES ('0011_jobs_system.sql') ON CONFLICT DO NOTHING;

-- Criar tabela jobs
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255),
  type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  data JSONB DEFAULT '{}',
  result JSONB,
  error TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar coluna scheduled_for
DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'scheduled_for') THEN ALTER TABLE jobs ADD COLUMN scheduled_for TIMESTAMPTZ; END IF; END `$`$;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);

-- Criar job_schedule
CREATE TABLE IF NOT EXISTS job_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Criar job_logs
CREATE TABLE IF NOT EXISTS job_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Marcar migração 0013
INSERT INTO schema_migrations (name) VALUES ('0013_fix_jobs_scheduled_for.sql') ON CONFLICT DO NOTHING;

-- Verificar
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'scheduled_for';
"@

# Salvar SQL em arquivo temporário
$tempFile = "$env:TEMP\railway-fix.sql"
$sqlCommands | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "📝 Comandos SQL preparados" -ForegroundColor Green
Write-Host ""
Write-Host "🔌 Conectando ao Railway e executando..." -ForegroundColor Yellow
Write-Host ""

# Executar via Railway CLI
railway run -- psql `$DATABASE_URL -f $tempFile

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Comandos executados!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Agora faça restart do backend:" -ForegroundColor Yellow
Write-Host "  railway restart" -ForegroundColor White
Write-Host ""
Write-Host "Ou via dashboard: https://railway.app" -ForegroundColor Yellow

# Limpar
Remove-Item $tempFile -ErrorAction SilentlyContinue
