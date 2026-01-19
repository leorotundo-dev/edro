# Verificar Status dos Deploys
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  VERIFICANDO STATUS DOS DEPLOYS" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Backend
Write-Host "Backend (Railway):" -ForegroundColor Yellow
$backendUrl = "https://backend-production-61d0.up.railway.app"
try {
    $response = Invoke-WebRequest -Uri "$backendUrl/health" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "  Status ONLINE - $($response.StatusCode)" -ForegroundColor Green
} catch {
    try {
        $response = Invoke-WebRequest -Uri $backendUrl -TimeoutSec 10 -ErrorAction Stop
        Write-Host "  Status ONLINE (root) - $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "  Status OFFLINE ou BUILDING" -ForegroundColor Red
    }
}
Write-Host ""

# Frontend Admin
Write-Host "Frontend Admin (Vercel):" -ForegroundColor Yellow
$adminUrl = "https://memodrops-web.vercel.app"
try {
    $response = Invoke-WebRequest -Uri $adminUrl -TimeoutSec 10 -ErrorAction Stop
    Write-Host "  Status ONLINE - $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  Status OFFLINE ou BUILDING" -ForegroundColor Red
}
Write-Host ""

# Resumo
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ultimo commit enviado ha poucos minutos" -ForegroundColor Gray
Write-Host "Tempo de build estimado: 5-10 minutos" -ForegroundColor Gray
Write-Host ""
Write-Host "Links para monitorar:" -ForegroundColor Yellow
Write-Host "  Railway: https://railway.app/project/e0ca0841-18bc-4c48-942e-d90a6b725a5b" -ForegroundColor Cyan
Write-Host "  Vercel:  https://vercel.com/dashboard" -ForegroundColor Cyan
Write-Host ""
