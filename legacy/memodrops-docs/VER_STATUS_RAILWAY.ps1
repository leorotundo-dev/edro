# Ver Status dos Deploys no Railway

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "   STATUS DO RAILWAY - MEMODROPS" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

# Backend
Write-Host "BACKEND (apps/backend)" -ForegroundColor Magenta
Write-Host "-------------------------------------------------------------" -ForegroundColor Gray
Set-Location "apps/backend"
Write-Host ""
Write-Host "Status do servico:" -ForegroundColor Yellow
railway status 2>&1
Write-Host ""
Write-Host "URL/Dominio:" -ForegroundColor Yellow
railway domain 2>&1
Write-Host ""
Write-Host "Variaveis de ambiente:" -ForegroundColor Yellow
railway variables 2>&1 | Select-Object -First 20
Set-Location "../.."

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

# Frontend
Write-Host "FRONTEND (apps/web)" -ForegroundColor Magenta
Write-Host "-------------------------------------------------------------" -ForegroundColor Gray
Set-Location "apps/web"
Write-Host ""
Write-Host "Status do servico:" -ForegroundColor Yellow
railway status 2>&1
Write-Host ""
Write-Host "URL/Dominio:" -ForegroundColor Yellow
railway domain 2>&1
Write-Host ""
Write-Host "Variaveis de ambiente:" -ForegroundColor Yellow
railway variables 2>&1 | Select-Object -First 20
Set-Location "../.."

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "Para ver logs em tempo real:" -ForegroundColor Yellow
Write-Host "  Backend:  cd apps/backend; railway logs" -ForegroundColor Cyan
Write-Host "  Frontend: cd apps/web; railway logs" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""
