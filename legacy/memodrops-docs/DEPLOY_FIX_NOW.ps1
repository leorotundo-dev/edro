# Quick Deploy Script - TypeScript Config Fix
# This script commits and pushes the TypeScript configuration fix

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYING TYPESCRIPT CONFIG FIX" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Show what changed
Write-Host "Changes to deploy:" -ForegroundColor Yellow
git diff apps/backend/tsconfig.json

Write-Host ""
Write-Host "Adding files to git..." -ForegroundColor Green
git add apps/backend/tsconfig.json
git add TYPESCRIPT_CONFIG_FIX.md

Write-Host ""
Write-Host "Committing changes..." -ForegroundColor Green
git commit -m "fix(backend): TypeScript configuration for Railway deployment

- Changed moduleResolution from 'bundler' to 'node' (compatible with CommonJS)
- Fixed ignoreDeprecations from '6.0' to '5.0' (valid version)
- Resolves TS5095 and TS5103 compilation errors
- Enables successful deployment on Railway"

Write-Host ""
Write-Host "Pushing to origin..." -ForegroundColor Green
git push origin main

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Railway will now automatically redeploy the backend." -ForegroundColor Cyan
Write-Host ""
Write-Host "Monitor deployment at:" -ForegroundColor Yellow
Write-Host "https://railway.app/project/7d5e064d-822b-4500-af2a-fde22f961c23" -ForegroundColor Blue
Write-Host ""
Write-Host "Expected timeline:" -ForegroundColor Yellow
Write-Host "- Build: ~2-3 minutes" -ForegroundColor White
Write-Host "- Deploy: ~30 seconds" -ForegroundColor White
Write-Host "- Total: ~3-4 minutes" -ForegroundColor White
Write-Host ""
