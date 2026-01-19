# 🚀 Deploy via Vercel CLI

Write-Host "🚀 DEPLOY DO MEMODROPS VIA VERCEL CLI" -ForegroundColor Cyan
Write-Host ""

# 1. Login na Vercel (se necessário)
Write-Host "📝 PASSO 1: Verificando autenticação..." -ForegroundColor Yellow
Write-Host ""

# Definir token
$env:VERCEL_TOKEN = "vck_19ByYk2Uc5exZKO78ZmDBY6c2LaI2PBwUWCMWRCnP1TP7LxjnN43wYVm"

# 2. Ir para pasta do projeto
Write-Host "📂 PASSO 2: Navegando para apps/web..." -ForegroundColor Yellow
cd apps/web
Write-Host "✅ Pasta: $(Get-Location)" -ForegroundColor Green
Write-Host ""

# 3. Deploy para produção
Write-Host "🚀 PASSO 3: Iniciando deploy..." -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  Isso vai demorar 3-5 minutos..." -ForegroundColor Yellow
Write-Host "⚠️  Você pode acompanhar o progresso abaixo:" -ForegroundColor Yellow
Write-Host ""

vercel --prod --yes --token $env:VERCEL_TOKEN

Write-Host ""
Write-Host "✅ Deploy completo!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Acesse sua dashboard em:" -ForegroundColor Cyan
Write-Host "   A URL vai aparecer acima ↑" -ForegroundColor Gray
