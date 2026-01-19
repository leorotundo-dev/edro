# FIX AUTOMÁTICO RAILWAY - Execute apenas este arquivo!

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "        FIX AUTOMÁTICO - RAILWAY DATABASE              " -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$DATABASE_URL = "postgresql://postgres:tmSerwBuJUhmPmaesmLavawlXJxAZlfO@shinkansen.proxy.rlwy.net:31908/railway"

Write-Host "🔌 Conectando ao banco Railway..." -ForegroundColor Yellow

# Criar arquivo SQL temporário
$sqlFile = "$env:TEMP\railway-fix-$(Get-Date -Format 'yyyyMMddHHmmss').sql"

$sqlContent = @'
INSERT INTO schema_migrations (name) VALUES (''0011_jobs_system.sql'') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS jobs (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(255), type VARCHAR(100), status VARCHAR(50) DEFAULT ''pending'', priority INTEGER DEFAULT 5, data JSONB DEFAULT ''{}'', result JSONB, error TEXT, attempts INTEGER DEFAULT 0, max_attempts INTEGER DEFAULT 3, scheduled_for TIMESTAMPTZ, started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW());
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = ''jobs'' AND column_name = ''scheduled_for'') THEN ALTER TABLE jobs ADD COLUMN scheduled_for TIMESTAMPTZ; END IF; END $$;
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
CREATE TABLE IF NOT EXISTS job_schedule (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(255) NOT NULL UNIQUE, type VARCHAR(100) NOT NULL, schedule VARCHAR(100) NOT NULL, data JSONB DEFAULT ''{}'', enabled BOOLEAN DEFAULT true, last_run TIMESTAMPTZ, next_run TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS job_logs (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), job_id UUID, level VARCHAR(20) NOT NULL, message TEXT NOT NULL, data JSONB, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW());
INSERT INTO schema_migrations (name) VALUES (''0013_fix_jobs_scheduled_for.sql'') ON CONFLICT DO NOTHING;
SELECT column_name FROM information_schema.columns WHERE table_name = ''jobs'' AND column_name = ''scheduled_for'';
'@

$sqlContent | Out-File -FilePath $sqlFile -Encoding UTF8 -NoNewline

Write-Host "✅ Comandos SQL preparados em: $sqlFile" -ForegroundColor Green
Write-Host ""

# Tentar com railway run
Write-Host "🚀 Executando comandos via Railway CLI..." -ForegroundColor Yellow
Write-Host ""

try {
    # Método 1: Via railway run com psql
    $env:PGPASSWORD = "tmSerwBuJUhmPmaesmLavawlXJxAZlfO"
    
    Write-Host "Tentando método 1: railway run psql..." -ForegroundColor Cyan
    $output = railway run -- psql "$DATABASE_URL" -f "$sqlFile" 2>&1
    
    Write-Host $output
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host "✅ FIX APLICADO COM SUCESSO!" -ForegroundColor Green
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "1. Fazer restart do backend:" -ForegroundColor White
        Write-Host "   railway restart" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "   OU via Dashboard:" -ForegroundColor White
        Write-Host "   https://railway.app/project -> Backend -> Restart" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "2. Verificar logs:" -ForegroundColor White
        Write-Host "   railway logs" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "3. Procurar por:" -ForegroundColor White
        Write-Host "   ✅ 'MemoDrops backend rodando'" -ForegroundColor Green
        Write-Host "   ✅ 'Scheduler inicializado'" -ForegroundColor Green
        Write-Host "   ❌ NÃO deve ter 'scheduled_for does not exist'" -ForegroundColor Red
    } else {
        throw "Erro ao executar psql"
    }
} catch {
    Write-Host "❌ Método 1 falhou. Tentando método alternativo..." -ForegroundColor Red
    Write-Host ""
    
    # Método 2: Instruções manuais
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host "EXECUTE MANUALMENTE:" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Execute:" -ForegroundColor White
    Write-Host "   railway connect postgres" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Quando abrir o psql, execute:" -ForegroundColor White
    Write-Host "   \i $sqlFile" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Ou copie e cole o conteúdo do arquivo:" -ForegroundColor White
    Write-Host "   notepad $sqlFile" -ForegroundColor Cyan
    Write-Host ""
}

# Limpar depois de 60 segundos
Start-Sleep -Seconds 5
Write-Host ""
Write-Host "Arquivo SQL salvo em: $sqlFile" -ForegroundColor Gray
Write-Host "Será mantido por segurança (delete manualmente se quiser)" -ForegroundColor Gray
