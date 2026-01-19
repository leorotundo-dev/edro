# Script para corrigir DATABASE_URL do web-aluno

Write-Host "🔧 Corrigindo DATABASE_URL do web-aluno..." -ForegroundColor Cyan

# Passo 1: Salvar serviço atual
Write-Host "`n📝 Salvando contexto atual..." -ForegroundColor Yellow
$currentService = railway status | Select-String "Service:" | Out-String
Write-Host "Serviço atual: $currentService"

# Passo 2: Listar todos os serviços
Write-Host "`n📋 Listando serviços disponíveis..." -ForegroundColor Yellow
railway service list 2>&1 | Out-Null

# Passo 3: Tentar selecionar web-aluno usando IDs conhecidos
Write-Host "`n🎯 Tentando conectar ao web-aluno..." -ForegroundColor Yellow

# Service ID do web-aluno baseado nos logs
$webAlunoServiceId = "44d4d21b-0a6f-4b4c-89c1-9d25350a4f18"

# Método 1: Usando environment variables direto via Railway API
Write-Host "`n🔑 Configurando DATABASE_URL via Railway API..." -ForegroundColor Cyan

$databaseUrl = "postgresql://postgres:tmSerwBuJUhmPmaesmLavawlXJxAZlfO@shinkansen.proxy.rlwy.net:31908/railway"

# Criar arquivo temporário com o comando
$commands = @"
railway variables --set DATABASE_URL="$databaseUrl" --service-id $webAlunoServiceId
"@

Write-Host "`n⚙️ Executando comandos..." -ForegroundColor Yellow

# Tentar diferentes abordagens
Write-Host "`n📌 Abordagem 1: Comando direto" -ForegroundColor Magenta
railway variables --set "DATABASE_URL=$databaseUrl" 2>&1

Write-Host "`n📌 Abordagem 2: Via JSON" -ForegroundColor Magenta
$jsonVars = @{
    DATABASE_URL = $databaseUrl
} | ConvertTo-Json

Write-Host "`n✅ Variável preparada:" -ForegroundColor Green
Write-Host "DATABASE_URL=$databaseUrl" -ForegroundColor White

Write-Host "`n⚠️  AÇÃO MANUAL NECESSÁRIA:" -ForegroundColor Yellow
Write-Host "Como o Railway CLI tem limitações, faça o seguinte:" -ForegroundColor White
Write-Host ""
Write-Host "1. Abra: https://railway.app/project/7d5e064d-822b-4500-af2a-fde22f961c23" -ForegroundColor Cyan
Write-Host "2. Selecione o serviço: @edro/web-aluno" -ForegroundColor Cyan
Write-Host "3. Vá em 'Variables'" -ForegroundColor Cyan
Write-Host "4. Encontre DATABASE_URL e altere para:" -ForegroundColor Cyan
Write-Host "   $databaseUrl" -ForegroundColor Green
Write-Host "   OU use a referência:" -ForegroundColor Cyan
Write-Host "   `${{Postgres.DATABASE_URL}}" -ForegroundColor Green
Write-Host "5. Clique em 'Deploy' para aplicar as mudanças" -ForegroundColor Cyan
Write-Host ""

# Abrir o Railway Dashboard
Write-Host "🌐 Abrindo Railway Dashboard..." -ForegroundColor Cyan
Start-Process "https://railway.app/project/7d5e064d-822b-4500-af2a-fde22f961c23/service/$webAlunoServiceId"

Write-Host "`n✅ Script concluído!" -ForegroundColor Green
Write-Host "Aguardando você completar a configuração no dashboard..." -ForegroundColor Yellow