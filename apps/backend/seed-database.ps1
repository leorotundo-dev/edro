# ===================================
# Database Seed Runner
# Populate database with example data
# ===================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  DATABASE SEED" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check environment
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "   Create .env with DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

# Load .env
Write-Host "Loading environment variables..." -ForegroundColor Yellow
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*?)\s*=\s*(.*?)\s*$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
}

# Check DATABASE_URL
if (-not $env:DATABASE_URL) {
    Write-Host "❌ DATABASE_URL not set in .env" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Database URL configured" -ForegroundColor Green

# Run seed
Write-Host "`nRunning seed script..." -ForegroundColor Yellow
Write-Host ""

try {
    npx ts-node --transpile-only src/db/seed.ts
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n========================================" -ForegroundColor Green
        Write-Host "  ✅ SEED COMPLETED!" -ForegroundColor Green
        Write-Host "========================================`n" -ForegroundColor Green
        
        Write-Host "Test credentials:" -ForegroundColor Cyan
        Write-Host "  Admin:" -ForegroundColor Yellow
        Write-Host "    Email: admin@edro.digital" -ForegroundColor White
        Write-Host "    Password: Admin123!" -ForegroundColor White
        Write-Host ""
        Write-Host "  Student:" -ForegroundColor Yellow
        Write-Host "    Email: aluno@example.com" -ForegroundColor White
        Write-Host "    Password: Aluno123!" -ForegroundColor White
        Write-Host ""
        
        exit 0
    } else {
        Write-Host "`n❌ Seed failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ Error running seed: $_" -ForegroundColor Red
    exit 1
}
