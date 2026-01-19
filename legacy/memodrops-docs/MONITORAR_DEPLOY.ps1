# ============================================
# 🚂 MONITORAR DEPLOYS - Railway + Vercel
# ============================================
# Este script monitora o status dos deploys
# em tempo real
# ============================================

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚂 MONITOR DE DEPLOYS - MemoDrops" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ============================================
# VERIFICAR RAILWAY CLI
# ============================================
Write-Host "📊 Verificando Railway CLI..." -ForegroundColor Yellow

$railwayInstalled = Get-Command railway -ErrorAction SilentlyContinue

if (-not $railwayInstalled) {
    Write-Host "❌ Railway CLI não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instalando Railway CLI..." -ForegroundColor Cyan
    npm install -g @railway/cli
    Write-Host "✅ Railway CLI instalado!" -ForegroundColor Green
    Write-Host ""
}

# ============================================
# VERIFICAR LOGIN
# ============================================
Write-Host "🔑 Verificando login..." -ForegroundColor Yellow

$loginCheck = railway whoami 2>&1

if ($loginCheck -match "Unauthorized") {
    Write-Host "❌ Você não está logado no Railway!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, execute:" -ForegroundColor Yellow
    Write-Host "  railway login" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Depois execute este script novamente." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host "✅ Logado no Railway!" -ForegroundColor Green
Write-Host ""

# ============================================
# VERIFICAR LINK DO PROJETO
# ============================================
Write-Host "🔗 Verificando projeto linkado..." -ForegroundColor Yellow

$projectCheck = railway status 2>&1

if ($projectCheck -match "not linked") {
    Write-Host "❌ Projeto não linkado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Execute:" -ForegroundColor Yellow
    Write-Host "  railway link" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "E selecione: memodrops" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host "✅ Projeto linkado!" -ForegroundColor Green
Write-Host ""

# ============================================
# FUNÇÃO DE MONITORAMENTO
# ============================================
function Show-DeployStatus {
    Clear-Host
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "🚂 RAILWAY - STATUS DOS DEPLOYS" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    # Status do Railway
    Write-Host "📊 Status Atual:" -ForegroundColor Yellow
    Write-Host ""
    railway status
    Write-Host ""
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "📝 LOGS RECENTES (últimas 20 linhas)" -ForegroundColor Blue
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host ""
    
    # Logs recentes
    railway logs --tail 20
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host ""
    
    # Informações adicionais
    Write-Host "🌐 URLs dos Serviços:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Backend:   " -NoNewline -ForegroundColor Gray
    Write-Host "https://backend-production-61d0.up.railway.app" -ForegroundColor Cyan
    Write-Host "  Admin:     " -NoNewline -ForegroundColor Gray
    Write-Host "https://memodrops-web.vercel.app" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "⏰ Última atualização: " -NoNewline -ForegroundColor Gray
    Write-Host "$(Get-Date -Format 'HH:mm:ss')" -ForegroundColor White
    Write-Host ""
    Write-Host "🔄 Atualizando a cada 30 segundos..." -ForegroundColor DarkGray
    Write-Host "   (Pressione Ctrl+C para sair)" -ForegroundColor DarkGray
    Write-Host ""
}

# ============================================
# LOOP DE MONITORAMENTO
# ============================================
Write-Host "🚀 Iniciando monitoramento..." -ForegroundColor Green
Write-Host "   Pressione Ctrl+C para parar" -ForegroundColor Gray
Write-Host ""
Start-Sleep -Seconds 2

try {
    while ($true) {
        Show-DeployStatus
        Start-Sleep -Seconds 30
    }
}
catch {
    Write-Host ""
    Write-Host "⏸️  Monitoramento interrompido" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================
# COMANDOS ÚTEIS
# ============================================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📚 COMANDOS ÚTEIS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Ver logs em tempo real:" -ForegroundColor Yellow
Write-Host "  railway logs --follow" -ForegroundColor Cyan
Write-Host ""

Write-Host "Ver logs de um serviço específico:" -ForegroundColor Yellow
Write-Host "  railway logs --service backend" -ForegroundColor Cyan
Write-Host "  railway logs --service ai" -ForegroundColor Cyan
Write-Host ""

Write-Host "Abrir dashboard no browser:" -ForegroundColor Yellow
Write-Host "  railway open" -ForegroundColor Cyan
Write-Host ""

Write-Host "Ver variáveis de ambiente:" -ForegroundColor Yellow
Write-Host "  railway variables" -ForegroundColor Cyan
Write-Host ""

Write-Host "Executar comando remoto:" -ForegroundColor Yellow
Write-Host "  railway run <comando>" -ForegroundColor Cyan
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
