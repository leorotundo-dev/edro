# Deploy da Correção para Railway (PowerShell)

Write-Host "🚀 Deploy da Correção para Railway" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script vai:" -ForegroundColor Yellow
Write-Host "1. Commitar as mudanças locais"
Write-Host "2. Fazer push para o repositório"
Write-Host "3. Instruções para Railway"
Write-Host ""

# Verificar se tem mudanças
$status = git status -s
if ([string]::IsNullOrEmpty($status)) {
    Write-Host "✅ Sem mudanças para commitar" -ForegroundColor Green
} else {
    Write-Host "📝 Commitando mudanças..." -ForegroundColor Yellow
    git add .
    git commit -m "fix: adiciona migração 0013 para resolver scheduled_for + corrige 0011"
}

Write-Host ""
Write-Host "🔄 Fazendo push..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "✅ Push concluído!" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 PRÓXIMOS PASSOS NO RAILWAY:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Acessar: https://railway.app"
Write-Host "2. Ir no projeto MemoDrops"
Write-Host "3. Clicar no serviço 'backend'"
Write-Host "4. Verificar se o deploy automático iniciou"
Write-Host "5. Se não iniciou, clicar em 'Deploy' manualmente"
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🔍 VERIFICAR LOGS:" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Procure por:"
Write-Host "  ✅ '🔄 Executando migração 0013_fix_jobs_scheduled_for.sql...'" -ForegroundColor Green
Write-Host "  ✅ '✅ Migração 0013_fix_jobs_scheduled_for.sql aplicada com sucesso!'" -ForegroundColor Green
Write-Host "  ✅ '🚀 MemoDrops backend rodando na porta 3333'" -ForegroundColor Green
Write-Host ""
Write-Host "Se ver erros de 'scheduled_for', execute o SQL manual:" -ForegroundColor Red
Write-Host "  → Veja: MANUAL_SQL_FIX_RAILWAY.sql" -ForegroundColor Yellow
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
