$ErrorActionPreference = "Stop"
Write-Host "Subindo stack local (postgres, redis, backend, web)..." -ForegroundColor Cyan
docker compose up -d
Write-Host "Pronto. Verifique:" -ForegroundColor Green
Write-Host "Backend: http://localhost:3333/health"
Write-Host "Web:     http://localhost:3000"***
