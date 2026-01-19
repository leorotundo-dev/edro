# ═══════════════════════════════════════════════════════════
# SCRIPT: Iniciar Sistema Completo MemoDrops
# ═══════════════════════════════════════════════════════════

Write-Host "`n" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   INICIANDO SISTEMA COMPLETO MEMODROPS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Verificar se estamos no diretório correto
if (-not (Test-Path "apps/backend")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto memodrops-main" -ForegroundColor Red
    exit 1
}

# ═══════════════════════════════════════════════════════════
# 1. VERIFICAR SERVIÇOS
# ═══════════════════════════════════════════════════════════

Write-Host "📊 Verificando status dos serviços...`n" -ForegroundColor Yellow

# Web-Aluno Docker
$webAlunoDocker = docker ps --filter "name=web-aluno-container" --format "{{.Status}}"
if ($webAlunoDocker) {
    Write-Host "✅ Web-Aluno Docker: " -NoNewline -ForegroundColor Green
    Write-Host "RODANDO (porta 3001)" -ForegroundColor White
} else {
    Write-Host "⚠️  Web-Aluno Docker: " -NoNewline -ForegroundColor Yellow
    Write-Host "NÃO INICIADO" -ForegroundColor White
    
    $startDocker = Read-Host "`nDeseja iniciar o Web-Aluno Docker? (s/n)"
    if ($startDocker -eq 's') {
        Write-Host "`nIniciando Web-Aluno Docker..." -ForegroundColor Cyan
        docker run -d -p 3001:3000 --name web-aluno-container -e NEXT_PUBLIC_API_URL=http://localhost:3333 memodrops-web-aluno:latest
        Write-Host "✅ Web-Aluno Docker iniciado!" -ForegroundColor Green
    }
}

# ═══════════════════════════════════════════════════════════
# 2. BACKEND
# ═══════════════════════════════════════════════════════════

Write-Host "`n📦 Verificando Backend...`n" -ForegroundColor Yellow

# Verificar se .env existe
if (-not (Test-Path "apps/backend/.env")) {
    Write-Host "⚠️  Arquivo .env não encontrado no backend!" -ForegroundColor Yellow
    Write-Host "`nCrie o arquivo apps/backend/.env com as variáveis necessárias:" -ForegroundColor White
    Write-Host "- DATABASE_URL" -ForegroundColor Gray
    Write-Host "- JWT_SECRET" -ForegroundColor Gray
    Write-Host "- OPENAI_API_KEY" -ForegroundColor Gray
    Write-Host "- NODE_ENV=development`n" -ForegroundColor Gray
    
    $continuar = Read-Host "Deseja continuar mesmo assim? (s/n)"
    if ($continuar -ne 's') {
        exit 0
    }
}

# Verificar node_modules
if (-not (Test-Path "apps/backend/node_modules")) {
    Write-Host "📥 Instalando dependências do backend..." -ForegroundColor Cyan
    cd apps/backend
    pnpm install
    cd ../..
}

# Iniciar backend em nova janela
Write-Host "🚀 Iniciando Backend (porta 3333)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\apps\backend'; Write-Host '🚀 Backend MemoDrops' -ForegroundColor Cyan; pnpm run dev"

Write-Host "✅ Backend iniciado em nova janela!" -ForegroundColor Green
Start-Sleep -Seconds 3

# ═══════════════════════════════════════════════════════════
# 3. FRONTEND ADMIN
# ═══════════════════════════════════════════════════════════

Write-Host "`n🎨 Verificando Frontend Admin...`n" -ForegroundColor Yellow

# Verificar node_modules
if (-not (Test-Path "apps/web/node_modules")) {
    Write-Host "📥 Instalando dependências do frontend admin..." -ForegroundColor Cyan
    cd apps/web
    pnpm install
    cd ../..
}

# Iniciar frontend admin em nova janela
Write-Host "🚀 Iniciando Frontend Admin (porta 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\apps\web'; Write-Host '🎨 Frontend Admin MemoDrops' -ForegroundColor Cyan; pnpm run dev"

Write-Host "✅ Frontend Admin iniciado em nova janela!" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════
# 4. RESUMO
# ═══════════════════════════════════════════════════════════

Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   ✅ SISTEMA COMPLETO INICIADO!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "🌐 URLs disponíveis:`n" -ForegroundColor Yellow
Write-Host "  Backend API:       " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3333" -ForegroundColor Cyan
Write-Host "  Frontend Admin:    " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Frontend Aluno:    " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3001" -ForegroundColor Cyan

Write-Host "`n📋 Próximos passos:`n" -ForegroundColor Yellow
Write-Host "  1. Aguarde 10-20 segundos para tudo iniciar" -ForegroundColor White
Write-Host "  2. Acesse http://localhost:3333/health (testar backend)" -ForegroundColor White
Write-Host "  3. Acesse http://localhost:3000 (admin)" -ForegroundColor White
Write-Host "  4. Acesse http://localhost:3001 (aluno)" -ForegroundColor White
Write-Host "  5. Teste o fluxo completo: login, dashboard, etc.`n" -ForegroundColor White

Write-Host "Dica: Use Ctrl+C nas janelas do PowerShell para parar os servicos`n" -ForegroundColor Gray

Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
