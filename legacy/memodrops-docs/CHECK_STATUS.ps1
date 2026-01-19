# Check Status Script (PowerShell version)
# Verifies if the scheduled_for fix has been applied

Write-Host "🔍 Checking job worker status..." -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 1. Checking if backend is running..." -ForegroundColor Yellow
docker-compose ps backend

Write-Host ""
Write-Host "📋 2. Checking recent backend logs..." -ForegroundColor Yellow
docker-compose logs --tail 50 backend | Select-Object -Last 20

Write-Host ""
Write-Host "📋 3. Checking for scheduled_for errors (last 100 lines)..." -ForegroundColor Yellow
$errors = docker-compose logs --tail 100 backend | Select-String "scheduled_for does not exist"
$errorCount = ($errors | Measure-Object).Count

if ($errorCount -gt 0) {
    Write-Host "❌ Found $errorCount errors mentioning 'scheduled_for'" -ForegroundColor Red
    Write-Host "   The fix has NOT been applied yet." -ForegroundColor Red
    Write-Host ""
    Write-Host "   Run the fix with: .\QUICK_FIX.ps1" -ForegroundColor Yellow
} else {
    Write-Host "✅ No scheduled_for errors found!" -ForegroundColor Green
    Write-Host "   The fix appears to be working." -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 4. Checking if migration was applied..." -ForegroundColor Yellow
docker-compose logs backend | Select-String "0013_fix_jobs_scheduled_for" | Select-Object -Last 5

Write-Host ""
Write-Host "📋 5. Job worker status..." -ForegroundColor Yellow
$jobWorker = docker-compose logs --tail 50 backend | Select-String "Job worker" | Select-Object -Last 1
if ($null -eq $jobWorker) {
    Write-Host "⚠️  No job worker status found in recent logs" -ForegroundColor Yellow
} else {
    Write-Host $jobWorker -ForegroundColor White
}

Write-Host ""
Write-Host "📋 6. Scheduler status..." -ForegroundColor Yellow
$scheduler = docker-compose logs --tail 50 backend | Select-String "scheduler" | Select-Object -Last 1
if ($null -eq $scheduler) {
    Write-Host "⚠️  No scheduler status found in recent logs" -ForegroundColor Yellow
} else {
    Write-Host $scheduler -ForegroundColor White
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if ($errorCount -eq 0) {
    Write-Host "✅ System Status: HEALTHY" -ForegroundColor Green
    Write-Host "   No scheduled_for errors detected" -ForegroundColor Green
} else {
    Write-Host "❌ System Status: NEEDS FIX" -ForegroundColor Red
    Write-Host "   Found $errorCount scheduled_for errors" -ForegroundColor Red
    Write-Host ""
    Write-Host "   To fix, run: .\QUICK_FIX.ps1" -ForegroundColor Yellow
}
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
