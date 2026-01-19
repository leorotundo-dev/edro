# Script para pegar logs do Railway

Write-Host "🔍 Pegando logs do Railway..." -ForegroundColor Cyan
Write-Host ""

# Verificar se Railway CLI está instalado
$railwayInstalled = Get-Command railway -ErrorAction SilentlyContinue

if (-not $railwayInstalled) {
    Write-Host "❌ Railway CLI não está instalado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instale com:" -ForegroundColor Yellow
    Write-Host "  powershell -c `"irm https://railway.app/install.ps1 | iex`"" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou veja os logs no dashboard: https://railway.app" -ForegroundColor Yellow
    exit
}

Write-Host "✅ Railway CLI encontrado!" -ForegroundColor Green
Write-Host ""

# Pegar logs
Write-Host "📋 Últimos 100 logs do backend:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

railway logs --tail 100

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔍 Procurando por erros específicos..." -ForegroundColor Yellow

# Filtrar erros
railway logs --tail 200 | Select-String -Pattern "scheduled_for|erro|error|failed|migra" -CaseSensitive:$false

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Logs capturados!" -ForegroundColor Green
Write-Host ""
Write-Host "Copie tudo acima e envie para análise." -ForegroundColor Yellow
