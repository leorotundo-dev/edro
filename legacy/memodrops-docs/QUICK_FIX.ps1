# Quick Fix for scheduled_for column issue (PowerShell version)
# This script will restart the backend to apply the new migration

Write-Host "🔧 Fixing scheduled_for column issue..." -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Step 1: Stopping backend container..." -ForegroundColor Yellow
docker-compose stop backend

Write-Host ""
Write-Host "📋 Step 2: Starting backend container..." -ForegroundColor Yellow
docker-compose up -d backend

Write-Host ""
Write-Host "📋 Step 3: Waiting for backend to start (10 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "📋 Step 4: Checking logs for migration..." -ForegroundColor Yellow
docker-compose logs backend | Select-String "0013_fix_jobs_scheduled_for" -Context 0,2

Write-Host ""
Write-Host "📋 Step 5: Checking for job worker errors..." -ForegroundColor Yellow
Write-Host "If you see errors below, the fix didn't work:" -ForegroundColor Red
docker-compose logs --tail 20 backend | Select-String "scheduled_for"

Write-Host ""
Write-Host "✅ Fix applied! Check the output above." -ForegroundColor Green
Write-Host ""
Write-Host "To monitor logs in real-time:" -ForegroundColor Cyan
Write-Host "  docker-compose logs -f backend" -ForegroundColor White
