$ErrorActionPreference = 'Continue'
Write-Host '🔧 Corrigindo DATABASE_URL do web-aluno...' -ForegroundColor Cyan

$dbUrl = 'postgresql://postgres:tmSerwBuJUhmPmaesmLavawlXJxAZlfO@shinkansen.proxy.rlwy.net:31908/railway'
$projectId = '7d5e064d-822b-4500-af2a-fde22f961c23'
$envId = 'a61d21de-60c4-42cc-83bc-28506ff83620'
$serviceId = '44d4d21b-0a6f-4b4c-89c1-9d25350a4f18'

Write-Host '
📝 Tentando configurar via Railway CLI...' -ForegroundColor Yellow

# Tentar múltiplos métodos
Write-Host '
Método 1: railway variables' -ForegroundColor Magenta
railway variables set "DATABASE_URL=$dbUrl"

Write-Host '
🌐 Abrindo Railway Dashboard para configuração manual...' -ForegroundColor Cyan
Start-Process "https://railway.app/project/$projectId/service/$serviceId"

Write-Host '
✅ Abra o link acima e configure:' -ForegroundColor Green
Write-Host 'DATABASE_URL = ${{Postgres.DATABASE_URL}}' -ForegroundColor White
Write-Host 'ou' -ForegroundColor Yellow
Write-Host "DATABASE_URL = $dbUrl" -ForegroundColor White

Read-Host '
Pressione Enter após configurar no dashboard'

Write-Host '
🚀 Iniciando redeploy...' -ForegroundColor Cyan
railway up

Write-Host '
✅ Concluído!' -ForegroundColor Green
