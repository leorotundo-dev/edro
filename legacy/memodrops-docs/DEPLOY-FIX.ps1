# MemoDrops - Deploy TypeScript Fix to Railway
# This script commits and pushes the TypeScript configuration fix

Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 MEMODROPS - DEPLOY TYPESCRIPT FIX" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "apps/backend/tsconfig.json")) {
    Write-Host "❌ Error: Must be run from memodrops-main directory" -ForegroundColor Red
    Write-Host "   Current directory: $PWD" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Please run:" -ForegroundColor Yellow
    Write-Host "   cd memodrops-main" -ForegroundColor White
    Write-Host "   .\DEPLOY-FIX.ps1" -ForegroundColor White
    exit 1
}

Write-Host "✅ Correct directory confirmed" -ForegroundColor Green
Write-Host ""

# Check Git status
Write-Host "📊 Checking Git status..." -ForegroundColor Yellow
git status --short

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  CHANGES TO BE DEPLOYED:" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ✅ apps/backend/tsconfig.json (FIXED)" -ForegroundColor Green
Write-Host "     - Removed invalid ignoreDeprecations" -ForegroundColor White
Write-Host "     - TypeScript compilation now works" -ForegroundColor White
Write-Host ""
Write-Host "  📚 Documentation:" -ForegroundColor Yellow
Write-Host "     - RAILWAY_TYPESCRIPT_FIX.md" -ForegroundColor White
Write-Host "     - DEPLOY_NOW.md" -ForegroundColor White
Write-Host "     - FIX_SUMMARY.txt" -ForegroundColor White
Write-Host ""

# Ask for confirmation
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
$confirm = Read-Host "Deploy these changes to Railway? (y/n)"

if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host ""
    Write-Host "❌ Deployment cancelled" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To deploy later, run:" -ForegroundColor White
    Write-Host "  git add ." -ForegroundColor Cyan
    Write-Host "  git commit -m 'fix: TypeScript configuration'" -ForegroundColor Cyan
    Write-Host "  git push origin main" -ForegroundColor Cyan
    exit 0
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔄 DEPLOYING..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Stage changes
Write-Host "1️⃣ Staging changes..." -ForegroundColor Yellow
git add apps/backend/tsconfig.json
git add RAILWAY_TYPESCRIPT_FIX.md
git add DEPLOY_NOW.md
git add FIX_SUMMARY.txt
git add DEPLOY-FIX.ps1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to stage changes" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Changes staged" -ForegroundColor Green
Write-Host ""

# Commit changes
Write-Host "2️⃣ Committing changes..." -ForegroundColor Yellow
$commitMessage = @"
fix: resolve TypeScript compilation errors for Railway deployment

- Remove invalid ignoreDeprecations from tsconfig.json
- Verify CommonJS module configuration compatibility with ts-node
- Add comprehensive deployment documentation
- Create quick reference guides

Fixes Railway deployment error:
- TS5095: Option 'bundler' can only be used when...
- TS5103: Invalid value for '--ignoreDeprecations'

✅ Local testing: PASSED
✅ TypeScript compilation: FIXED
🚀 Ready for Railway deployment
"@

git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to commit changes" -ForegroundColor Red
    Write-Host "   (This might be ok if there are no new changes)" -ForegroundColor Yellow
    Write-Host ""
}
else {
    Write-Host "   ✅ Changes committed" -ForegroundColor Green
    Write-Host ""
}

# Push to main
Write-Host "3️⃣ Pushing to main branch..." -ForegroundColor Yellow
Write-Host "   This will trigger Railway deployment..." -ForegroundColor White
Write-Host ""

git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Failed to push changes" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  • Not authenticated with Git" -ForegroundColor White
    Write-Host "  • Remote branch doesn't exist" -ForegroundColor White
    Write-Host "  • No permission to push" -ForegroundColor White
    Write-Host ""
    Write-Host "Try:" -ForegroundColor Yellow
    Write-Host "  git remote -v" -ForegroundColor Cyan
    Write-Host "  git branch -a" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ DEPLOYMENT TRIGGERED!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

Write-Host "📊 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Monitor Railway Dashboard" -ForegroundColor White
Write-Host "   → Go to https://railway.app" -ForegroundColor Gray
Write-Host "   → Open your backend service" -ForegroundColor Gray
Write-Host "   → Watch 'Deployments' tab" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Check Build Logs" -ForegroundColor White
Write-Host "   → Click on latest deployment" -ForegroundColor Gray
Write-Host "   → View build progress" -ForegroundColor Gray
Write-Host "   → Look for: '✅ Build successful'" -ForegroundColor Gray
Write-Host ""

Write-Host "3. Verify Deployment" -ForegroundColor White
Write-Host "   → Wait 3-5 minutes for deployment" -ForegroundColor Gray
Write-Host "   → Test health endpoint:" -ForegroundColor Gray
Write-Host "     curl https://your-backend.railway.app/" -ForegroundColor Cyan
Write-Host ""

Write-Host "4. Check Logs (Optional)" -ForegroundColor White
Write-Host "   → Using Railway CLI:" -ForegroundColor Gray
Write-Host "     railway logs --follow" -ForegroundColor Cyan
Write-Host ""

Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  📚 DOCUMENTATION" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  📄 RAILWAY_TYPESCRIPT_FIX.md  - Technical details" -ForegroundColor White
Write-Host "  📄 DEPLOY_NOW.md              - Deployment guide" -ForegroundColor White
Write-Host "  📄 FIX_SUMMARY.txt            - Quick reference" -ForegroundColor White
Write-Host ""

Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ⏳ EXPECTED TIMELINE" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Build:      1-2 minutes  ⏱️" -ForegroundColor White
Write-Host "  Deploy:     1-2 minutes  🚀" -ForegroundColor White
Write-Host "  Health:     30 seconds   ❤️" -ForegroundColor White
Write-Host "  ─────────────────────────────" -ForegroundColor Gray
Write-Host "  Total:      3-5 minutes  ⏰" -ForegroundColor Green
Write-Host ""

Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  🎉 Good luck with the deployment!" -ForegroundColor Green
Write-Host ""
Write-Host "  ⭐ If successful, you'll see:" -ForegroundColor Yellow
Write-Host '     {"status":"ok","service":"memodrops-backend"}' -ForegroundColor Cyan
Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

# Open Railway dashboard (optional)
Write-Host "💡 Tip: Press Enter to open Railway dashboard in browser" -ForegroundColor Yellow
Write-Host "        (or Ctrl+C to skip)" -ForegroundColor Gray
Read-Host

try {
    Start-Process "https://railway.app"
    Write-Host "✅ Opening Railway dashboard..." -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Could not open browser automatically" -ForegroundColor Yellow
    Write-Host "   Please visit: https://railway.app" -ForegroundColor White
}

Write-Host ""
Write-Host "Done! 🎉" -ForegroundColor Green
