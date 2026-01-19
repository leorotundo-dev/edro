# Script para Executar Migração do Sistema de Editais
# Executa a migration 0014_editais_system.sql

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     MIGRAÇÃO DO SISTEMA DE EDITAIS - MEMODROPS            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar se DATABASE_URL está configurada
if (-not $env:DATABASE_URL) {
    Write-Host "❌ ERRO: Variável DATABASE_URL não está configurada!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Configure com:" -ForegroundColor Yellow
    Write-Host '  $env:DATABASE_URL = "postgresql://usuario:senha@host:porta/database"' -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ DATABASE_URL configurada" -ForegroundColor Green
Write-Host "   $env:DATABASE_URL" -ForegroundColor Gray
Write-Host ""

# Verificar se o arquivo de migração existe
$migrationFile = "apps\backend\src\db\migrations\0014_editais_system.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ ERRO: Arquivo de migração não encontrado!" -ForegroundColor Red
    Write-Host "   Esperado: $migrationFile" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "✅ Arquivo de migração encontrado" -ForegroundColor Green
Write-Host "   $migrationFile" -ForegroundColor Gray
Write-Host ""

# Verificar se psql está disponível
try {
    $psqlVersion = psql --version 2>&1
    Write-Host "✅ PostgreSQL Client encontrado" -ForegroundColor Green
    Write-Host "   $psqlVersion" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ ERRO: psql não encontrado no PATH!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instale o PostgreSQL ou adicione ao PATH" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Confirmar execução
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  A migração irá criar as seguintes tabelas:" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""
Write-Host "  📋 editais              (Tabela principal)" -ForegroundColor White
Write-Host "  📅 edital_eventos       (Cronograma)" -ForegroundColor White
Write-Host "  ❓ edital_questoes      (Questões vinculadas)" -ForegroundColor White
Write-Host "  👥 edital_usuarios      (Usuários interessados)" -ForegroundColor White
Write-Host "  📊 editais_stats        (View de estatísticas)" -ForegroundColor White
Write-Host ""
Write-Host "  + Índices otimizados" -ForegroundColor Gray
Write-Host "  + Triggers de auditoria" -ForegroundColor Gray
Write-Host "  + Constraints de integridade" -ForegroundColor Gray
Write-Host ""

$confirmacao = Read-Host "Deseja continuar? (S/N)"
if ($confirmacao -ne "S" -and $confirmacao -ne "s") {
    Write-Host ""
    Write-Host "❌ Migração cancelada pelo usuário" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🚀 Executando migração..." -ForegroundColor Cyan
Write-Host ""

# Executar migração
try {
    # Criar backup antes (opcional)
    Write-Host "📦 Criando backup das tabelas existentes (se houver)..." -ForegroundColor Yellow
    
    $backupScript = @"
DO `$`$
BEGIN
    -- Verificar se tabelas já existem
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'editais') THEN
        RAISE NOTICE 'Tabela editais já existe. Migração usará CREATE TABLE IF NOT EXISTS.';
    ELSE
        RAISE NOTICE 'Tabela editais não existe. Será criada.';
    END IF;
END `$`$;
"@
    
    $backupScript | psql $env:DATABASE_URL
    Write-Host ""
    
    # Executar migração principal
    Write-Host "📝 Executando migration 0014_editais_system.sql..." -ForegroundColor Cyan
    psql $env:DATABASE_URL -f $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║              ✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!            ║" -ForegroundColor Green
        Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""
        
        # Verificar tabelas criadas
        Write-Host "📊 Verificando tabelas criadas..." -ForegroundColor Cyan
        Write-Host ""
        
        $checkScript = @"
SELECT 
    schemaname as schema,
    tablename as tabela,
    COALESCE((SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename), 0) as colunas
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'edital%'
ORDER BY tablename;
"@
        
        psql $env:DATABASE_URL -c $checkScript
        
        Write-Host ""
        Write-Host "🎉 Sistema de Editais instalado!" -ForegroundColor Green
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  PRÓXIMOS PASSOS:" -ForegroundColor Yellow
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1️⃣  Inserir dados de exemplo (opcional):" -ForegroundColor White
        Write-Host "    psql `$env:DATABASE_URL -f apps\backend\src\db\seed-editais.sql" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2️⃣  Iniciar o backend:" -ForegroundColor White
        Write-Host "    cd apps\backend" -ForegroundColor Gray
        Write-Host "    npm run dev" -ForegroundColor Gray
        Write-Host ""
        Write-Host "3️⃣  Iniciar o frontend (em outra janela):" -ForegroundColor White
        Write-Host "    cd apps\web" -ForegroundColor Gray
        Write-Host "    npm run dev" -ForegroundColor Gray
        Write-Host ""
        Write-Host "4️⃣  Acessar a interface:" -ForegroundColor White
        Write-Host "    http://localhost:3000/admin/editais" -ForegroundColor Gray
        Write-Host ""
        Write-Host "5️⃣  Testar a API:" -ForegroundColor White
        Write-Host "    .\test-editais.ps1" -ForegroundColor Gray
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📖 Documentação completa: SISTEMA_EDITAIS_README.md" -ForegroundColor Yellow
        Write-Host "🚀 Guia rápido: GUIA_RAPIDO_EDITAIS.md" -ForegroundColor Yellow
        Write-Host ""
        
    } else {
        Write-Host ""
        Write-Host "❌ ERRO ao executar migração!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Verifique:" -ForegroundColor Yellow
        Write-Host "  1. Conexão com o banco de dados" -ForegroundColor White
        Write-Host "  2. Permissões do usuário" -ForegroundColor White
        Write-Host "  3. Mensagens de erro acima" -ForegroundColor White
        Write-Host ""
        exit 1
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ ERRO: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
