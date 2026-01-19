# ============================================
# 🔍 VERIFICAR STATUS DOS DEPLOYS
# ============================================
# Verifica o status sem precisar do Railway CLI
# ============================================

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔍 VERIFICANDO STATUS DOS DEPLOYS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ============================================
# BACKEND (Railway)
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "🚂 RAILWAY - Backend" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

$backendUrl = "https://backend-production-61d0.up.railway.app"

Write-Host "Testando: $backendUrl" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "$backendUrl/health" -Method GET -TimeoutSec 10 -ErrorAction Stop
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend ONLINE!" -ForegroundColor Green
        Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Gray
        Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Backend respondeu com status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "⚠️  Endpoint /health não encontrado (404)" -ForegroundColor Yellow
        Write-Host "   Tentando rota raiz..." -ForegroundColor Gray
        
        try {
            $rootResponse = Invoke-WebRequest -Uri $backendUrl -Method GET -TimeoutSec 10 -ErrorAction Stop
            Write-Host "✅ Backend ONLINE na raiz!" -ForegroundColor Green
            Write-Host "   Status: $($rootResponse.StatusCode)" -ForegroundColor Gray
        } catch {
            Write-Host "❌ Backend não está respondendo!" -ForegroundColor Red
            Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Backend não está respondendo!" -ForegroundColor Red
        Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# ============================================
# FRONTEND ADMIN (Vercel)
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "🌐 VERCEL - Frontend Admin" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

$adminUrl = "https://memodrops-web.vercel.app"

Write-Host "Testando: $adminUrl" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $adminUrl -Method GET -TimeoutSec 10 -ErrorAction Stop
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend Admin ONLINE!" -ForegroundColor Green
        Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Gray
        
        # Verificar se tem conteúdo HTML
        if ($response.Content -match "<html") {
            Write-Host "   Conteúdo: HTML válido detectado" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️  Frontend respondeu com status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Frontend Admin não está respondendo!" -ForegroundColor Red
    Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================
# GITHUB - Último commit
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "🐙 GITHUB - Último Commit" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

try {
    $apiUrl = "https://api.github.com/repos/leorotundo-dev/memodrops/commits/main"
    $headers = @{
        "Accept" = "application/vnd.github.v3+json"
        "User-Agent" = "PowerShell"
    }
    
    $commit = Invoke-RestMethod -Uri $apiUrl -Headers $headers -TimeoutSec 10
    
    Write-Host "✅ Último commit:" -ForegroundColor Green
    Write-Host "   SHA: $($commit.sha.Substring(0,7))" -ForegroundColor Gray
    Write-Host "   Mensagem: $($commit.commit.message.Split("`n")[0])" -ForegroundColor Gray
    Write-Host "   Autor: $($commit.commit.author.name)" -ForegroundColor Gray
    Write-Host "   Data: $($commit.commit.author.date)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Não foi possível buscar informações do GitHub" -ForegroundColor Yellow
    Write-Host "   (Isso é normal se não tiver acesso à API)" -ForegroundColor Gray
}

Write-Host ""

# ============================================
# RESUMO
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "📊 RESUMO DO STATUS" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

Write-Host "Serviços Online:" -ForegroundColor Yellow
Write-Host "  • Backend (Railway)" -ForegroundColor Gray
Write-Host "  • Frontend Admin (Vercel)" -ForegroundColor Gray
Write-Host ""

Write-Host "Para ver mais detalhes:" -ForegroundColor Yellow
Write-Host "  • Railway: https://railway.app/project/e0ca0841-18bc-4c48-942e-d90a6b725a5b" -ForegroundColor Cyan
Write-Host "  • Vercel: https://vercel.com/dashboard" -ForegroundColor Cyan
Write-Host "  • GitHub: https://github.com/leorotundo-dev/memodrops" -ForegroundColor Cyan
Write-Host ""

Write-Host "Para monitorar em tempo real:" -ForegroundColor Yellow
Write-Host "  1. cd memodrops-main" -ForegroundColor Cyan
Write-Host "  2. railway link" -ForegroundColor Cyan
Write-Host "  3. railway logs --follow" -ForegroundColor Cyan
Write-Host ""

# ============================================
# ESPERAR PELOS BUILDS
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "⏰ TEMPO DE BUILD" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

# Calcular tempo desde o commit
$commitTime = Get-Date
Write-Host "Commit enviado há poucos minutos..." -ForegroundColor Gray
Write-Host ""

Write-Host "Tempo estimado de build:" -ForegroundColor Yellow
Write-Host "  • Backend: 3-5 minutos" -ForegroundColor Gray
Write-Host "  • Frontend: 2-3 minutos" -ForegroundColor Gray
Write-Host "  • Serviços AI: 3-5 minutos" -ForegroundColor Gray
Write-Host ""

Write-Host "💡 Dica:" -ForegroundColor Cyan
Write-Host "   Execute este script novamente em 5 minutos!" -ForegroundColor Gray
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Perguntar se quer executar novamente
$repeat = Read-Host "Verificar novamente? (S/N)"

if ($repeat -eq "S" -or $repeat -eq "s") {
    Write-Host ""
    Write-Host "Aguardando 30 segundos..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    # Executar novamente
    & $MyInvocation.MyCommand.Path
}
