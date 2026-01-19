# 🚂 Setup Railway CLI

Write-Host "🚂 CONFIGURANDO RAILWAY CLI" -ForegroundColor Cyan
Write-Host ""

# 1. Link ao projeto
Write-Host "📌 PASSO 1: Linkando ao projeto MemoDrops..." -ForegroundColor Yellow
cd "D:\WORK\DESIGN ROTUNDO\MEMODROPS\memodrops-main\memodrops-main"

# Criar arquivo de config do Railway
$railwayConfig = @{
    "projectId" = "e0ca0841-18bc-4c48-942e-d90a6b725a5b"
    "environment" = "production"
} | ConvertTo-Json

New-Item -Path ".railway" -ItemType Directory -Force | Out-Null
$railwayConfig | Out-File -FilePath ".railway/config.json" -Encoding UTF8

Write-Host "✅ Projeto linkado!" -ForegroundColor Green
Write-Host ""

# 2. Ver status
Write-Host "📊 PASSO 2: Verificando serviços..." -ForegroundColor Yellow
railway status

Write-Host ""
Write-Host "✅ Setup completo!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 COMANDOS DISPONÍVEIS:" -ForegroundColor Cyan
Write-Host "  railway service          - Selecionar serviço" -ForegroundColor White
Write-Host "  railway variables        - Ver variáveis" -ForegroundColor White
Write-Host "  railway logs             - Ver logs" -ForegroundColor White
Write-Host "  railway up               - Fazer deploy" -ForegroundColor White
Write-Host "  railway domain           - Ver/adicionar domínio" -ForegroundColor White
