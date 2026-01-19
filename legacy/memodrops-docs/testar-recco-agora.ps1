# Script de Teste Automatizado - ReccoEngine V3
# Prepara o ambiente e executa todos os testes

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE RECCOENGINE V3 - PREPARAÇÃO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# 1. Verificar diretório
# ============================================
Write-Host "📁 Verificando diretório..." -NoNewline

if (-Not (Test-Path "apps/backend/test-recco-engine.ts")) {
    Write-Host " ✗" -ForegroundColor Red
    Write-Host ""
    Write-Host "❌ Erro: Execute este script na raiz do projeto memodrops-main" -ForegroundColor Red
    Write-Host ""
    Write-Host "Use: cd memodrops-main" -ForegroundColor Yellow
    Write-Host "     .\testar-recco-agora.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host " ✓" -ForegroundColor Green

# ============================================
# 2. Verificar Node.js
# ============================================
Write-Host "📦 Verificando Node.js..." -NoNewline

try {
    $nodeVersion = node --version
    Write-Host " ✓ ($nodeVersion)" -ForegroundColor Green
} catch {
    Write-Host " ✗" -ForegroundColor Red
    Write-Host ""
    Write-Host "❌ Node.js não encontrado" -ForegroundColor Red
    Write-Host "Instale em: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# ============================================
# 3. Verificar .env
# ============================================
Write-Host "🔐 Verificando .env..." -NoNewline

if (-Not (Test-Path "apps/backend/.env")) {
    Write-Host " ✗" -ForegroundColor Red
    Write-Host ""
    Write-Host "❌ Arquivo .env não encontrado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Crie o arquivo apps/backend/.env com:" -ForegroundColor Yellow
    Write-Host "  DATABASE_URL=postgresql://..." -ForegroundColor Gray
    Write-Host "  JWT_SECRET=..." -ForegroundColor Gray
    Write-Host "  OPENAI_API_KEY=..." -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host " ✓" -ForegroundColor Green

# ============================================
# 4. Verificar node_modules
# ============================================
Write-Host "📚 Verificando dependências..." -NoNewline

if (-Not (Test-Path "apps/backend/node_modules")) {
    Write-Host " ✗" -ForegroundColor Red
    Write-Host ""
    Write-Host "⏳ Instalando dependências..." -ForegroundColor Yellow
    
    Push-Location apps/backend
    npm install | Out-Null
    Pop-Location
    
    Write-Host "✅ Dependências instaladas!" -ForegroundColor Green
} else {
    Write-Host " ✓" -ForegroundColor Green
}

# ============================================
# 5. Verificar migrations
# ============================================
Write-Host "🗄️  Verificando migrations..." -NoNewline

$migrationFiles = Get-ChildItem "apps/backend/src/db/migrations/*.sql" -ErrorAction SilentlyContinue

if ($migrationFiles.Count -lt 8) {
    Write-Host " ⚠️" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠️  Menos de 8 migrations encontradas" -ForegroundColor Yellow
    Write-Host "Execute: npm run db:migrate" -ForegroundColor Gray
} else {
    Write-Host " ✓ ($($migrationFiles.Count) migrations)" -ForegroundColor Green
}

# ============================================
# 6. Executar Testes
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EXECUTANDO TESTES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Push-Location apps/backend

Write-Host "⏳ Rodando test-recco-engine.ts..." -ForegroundColor Yellow
Write-Host ""

try {
    # Executar teste
    $output = npx ts-node test-recco-engine.ts 2>&1
    
    # Mostrar output
    $output | ForEach-Object { Write-Host $_ }
    
    # Verificar se passou
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  ✅ TODOS OS TESTES PASSARAM!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "ReccoEngine V3 está 100% funcional! 🚀" -ForegroundColor Green
        Write-Host ""
        
        Pop-Location
        exit 0
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "  ❌ ALGUNS TESTES FALHARAM" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        Write-Host ""
        
        Write-Host "Possíveis causas:" -ForegroundColor Yellow
        Write-Host "  1. Banco de dados não conectado" -ForegroundColor Gray
        Write-Host "  2. Migrations não executadas" -ForegroundColor Gray
        Write-Host "  3. .env incorreto" -ForegroundColor Gray
        Write-Host ""
        
        Write-Host "Comandos úteis:" -ForegroundColor Yellow
        Write-Host "  npm run db:migrate    # Rodar migrations" -ForegroundColor Gray
        Write-Host "  npm run dev           # Iniciar servidor" -ForegroundColor Gray
        Write-Host ""
        
        Pop-Location
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ Erro ao executar testes:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    
    Pop-Location
    exit 1
}

Pop-Location

# ============================================
# FIM
# ============================================
Write-Host ""
Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
