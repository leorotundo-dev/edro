# Script PowerShell para rodar migrations direto via psql

Write-Host "🚀 Iniciando migrations..." -ForegroundColor Green
Write-Host ""

# Ler DATABASE_URL do .env
$envFile = ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^DATABASE_URL=(.+)$") {
            $env:DATABASE_URL = $matches[1]
            Write-Host "✅ DATABASE_URL carregada do .env" -ForegroundColor Green
        }
    }
}

if (-not $env:DATABASE_URL) {
    Write-Host "❌ DATABASE_URL não encontrada no .env" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, crie o arquivo .env com:" -ForegroundColor Yellow
    Write-Host "DATABASE_URL=postgresql://user:password@host:5432/database" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Parse DATABASE_URL (formato: postgresql://user:password@host:port/database)
if ($env:DATABASE_URL -match "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)") {
    $DB_USER = $matches[1]
    $DB_PASS = $matches[2]
    $DB_HOST = $matches[3]
    $DB_PORT = $matches[4]
    $DB_NAME = $matches[5]
    
    Write-Host "📊 Banco: $DB_NAME @ $DB_HOST:$DB_PORT" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "❌ DATABASE_URL inválida" -ForegroundColor Red
    exit 1
}

# Criar tabela de migrations se não existir
$createMigrationsTable = @"
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"@

Write-Host "🔧 Criando tabela schema_migrations..." -ForegroundColor Yellow
$env:PGPASSWORD = $DB_PASS
echo $createMigrationsTable | psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -q 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao conectar no banco. Verifique DATABASE_URL" -ForegroundColor Red
    Write-Host ""
    Write-Host "Comando testado:" -ForegroundColor Yellow
    Write-Host "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Tabela schema_migrations OK" -ForegroundColor Green
Write-Host ""

# Buscar migrations aplicadas
$appliedQuery = "SELECT name FROM schema_migrations ORDER BY id ASC;"
$applied = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c $appliedQuery 2>$null | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }

$appliedSet = @{}
if ($applied) {
    $applied | ForEach-Object { $appliedSet[$_] = $true }
}

Write-Host "✅ $($appliedSet.Count) migrations já aplicadas" -ForegroundColor Green
Write-Host ""

# Listar migrations disponíveis
$migrationsDir = "src\db\migrations"
$migrations = Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object Name

Write-Host "📁 Encontradas $($migrations.Count) migrations:" -ForegroundColor Cyan
$migrations | ForEach-Object {
    if ($appliedSet[$_.Name]) {
        Write-Host "   ✅ $($_.Name) (já aplicada)" -ForegroundColor Gray
    } else {
        Write-Host "   🆕 $($_.Name) (nova)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Aplicar migrations novas
$newCount = 0
foreach ($migration in $migrations) {
    $migrationName = $migration.Name
    
    if ($appliedSet[$migrationName]) {
        continue
    }
    
    Write-Host "🔄 Aplicando $migrationName..." -ForegroundColor Yellow
    
    $sql = Get-Content $migration.FullName -Raw
    
    # Executar em uma transação
    $transaction = @"
BEGIN;
$sql
INSERT INTO schema_migrations (name) VALUES ('$migrationName');
COMMIT;
"@
    
    echo $transaction | psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -q 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ $migrationName aplicada com sucesso!" -ForegroundColor Green
        $newCount++
    } else {
        Write-Host "   ❌ Erro ao aplicar $migrationName" -ForegroundColor Red
        Write-Host ""
        Write-Host "Rodando ROLLBACK..." -ForegroundColor Yellow
        echo "ROLLBACK;" | psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME 2>$null
        exit 1
    }
}

Write-Host ""
Write-Host "🎉 Migrations concluídas!" -ForegroundColor Green
Write-Host "   📊 $newCount novas migrations aplicadas" -ForegroundColor Cyan
Write-Host "   ✅ Total: $($appliedSet.Count + $newCount) migrations no banco" -ForegroundColor Cyan
Write-Host ""
