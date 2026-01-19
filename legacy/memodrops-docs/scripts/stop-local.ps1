$ErrorActionPreference = "Stop"
Write-Host "Derrubando stack local..." -ForegroundColor Yellow
docker compose down
Write-Host "Pronto." -ForegroundColor Green
