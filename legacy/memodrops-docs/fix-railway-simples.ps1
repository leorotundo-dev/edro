Write-Host "Aplicando fix no Railway..." -ForegroundColor Cyan

$DATABASE_URL = "postgresql://postgres:tmSerwBuJUhmPmaesmLavawlXJxAZlfO@shinkansen.proxy.rlwy.net:31908/railway"

$sql = "INSERT INTO schema_migrations (name) VALUES ('0011_jobs_system.sql') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS jobs (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(255), type VARCHAR(100), status VARCHAR(50) DEFAULT 'pending', priority INTEGER DEFAULT 5, data JSONB DEFAULT '{}', result JSONB, error TEXT, attempts INTEGER DEFAULT 0, max_attempts INTEGER DEFAULT 3, scheduled_for TIMESTAMPTZ, started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW());
DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'scheduled_for') THEN ALTER TABLE jobs ADD COLUMN scheduled_for TIMESTAMPTZ; END IF; END `$`$;
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE TABLE IF NOT EXISTS job_schedule (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(255) NOT NULL UNIQUE, type VARCHAR(100) NOT NULL, schedule VARCHAR(100) NOT NULL, data JSONB DEFAULT '{}', enabled BOOLEAN DEFAULT true, last_run TIMESTAMPTZ, next_run TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS job_logs (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), job_id UUID, level VARCHAR(20) NOT NULL, message TEXT NOT NULL, data JSONB, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW());
INSERT INTO schema_migrations (name) VALUES ('0013_fix_jobs_scheduled_for.sql') ON CONFLICT DO NOTHING;"

$tempFile = "$env:TEMP\fix.sql"
$sql | Out-File -FilePath $tempFile -Encoding ASCII

Write-Host "Executando comandos..." -ForegroundColor Yellow

railway run -- psql $DATABASE_URL -f $tempFile

Write-Host ""
Write-Host "Agora faca restart: railway restart" -ForegroundColor Green

Remove-Item $tempFile -ErrorAction SilentlyContinue
