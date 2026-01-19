# 🚀 REDEPLOY DASHBOARD NA VERCEL - AGORA

Write-Host "🚀 REDEPLOYANDO DASHBOARD MEMODROPS NA VERCEL" -ForegroundColor Cyan
Write-Host ""

# 1. Commit das mudanças pendentes
Write-Host "📦 PASSO 1: Commit das mudanças..." -ForegroundColor Yellow
cd memodrops-main

$status = git status --short
if ($status) {
    Write-Host "Arquivos modificados encontrados. Fazendo commit..." -ForegroundColor Gray
    git add .
    git commit -m "chore: redeploy dashboard com tema azul atualizado"
    Write-Host "✅ Commit realizado!" -ForegroundColor Green
} else {
    Write-Host "✅ Nenhuma mudança para commitar" -ForegroundColor Green
}

Write-Host ""

# 2. Push para GitHub
Write-Host "📤 PASSO 2: Push para GitHub..." -ForegroundColor Yellow
git push origin main
Write-Host "✅ Push completo!" -ForegroundColor Green
Write-Host ""

# 3. Instruções para Vercel
Write-Host "🌐 PASSO 3: DEPLOY NA VERCEL" -ForegroundColor Yellow
Write-Host ""
Write-Host "Agora você precisa fazer o deploy na Vercel:" -ForegroundColor White
Write-Host ""
Write-Host "OPÇÃO A - Via Dashboard (Mais Fácil):" -ForegroundColor Cyan
Write-Host "  1. Acesse: https://vercel.com/new" -ForegroundColor White
Write-Host "  2. Clique em 'Import Git Repository'" -ForegroundColor White
Write-Host "  3. Selecione: leorotundo-dev/memodrops" -ForegroundColor White
Write-Host "  4. Configure:" -ForegroundColor White
Write-Host "     - Project Name: memodrops-web" -ForegroundColor Gray
Write-Host "     - Framework: Next.js" -ForegroundColor Gray
Write-Host "     - Root Directory: apps/web" -ForegroundColor Yellow -BackgroundColor Black
Write-Host "     - Build Command: npm run build" -ForegroundColor Gray
Write-Host "     - Output Directory: .next" -ForegroundColor Gray
Write-Host "  5. Environment Variables:" -ForegroundColor White
Write-Host "     NEXT_PUBLIC_API_URL=https://memodropsweb-production.up.railway.app" -ForegroundColor Yellow -BackgroundColor Black
Write-Host "  6. Clique em 'Deploy'" -ForegroundColor White
Write-Host ""
Write-Host "OPÇÃO B - Via CLI (Se tiver Vercel CLI instalado):" -ForegroundColor Cyan
Write-Host "  cd apps/web" -ForegroundColor Gray
Write-Host "  vercel --prod" -ForegroundColor Yellow
Write-Host ""
Write-Host "⏰ Tempo estimado: 3-5 minutos" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Após o deploy, você receberá uma URL tipo:" -ForegroundColor Green
Write-Host "   https://memodrops-web-xxx.vercel.app" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 A dashboard estará em:" -ForegroundColor Green
Write-Host "   https://memodrops-web-xxx.vercel.app/admin" -ForegroundColor Cyan
Write-Host ""

# Verificar se tem Vercel CLI
Write-Host "💡 DICA: Verificando se você tem Vercel CLI..." -ForegroundColor Yellow
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if ($vercelInstalled) {
    Write-Host "✅ Vercel CLI encontrado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Quer fazer deploy automaticamente via CLI? (S/N)" -ForegroundColor Cyan
    $response = Read-Host
    
    if ($response -eq "S" -or $response -eq "s") {
        Write-Host ""
        Write-Host "🚀 Iniciando deploy via CLI..." -ForegroundColor Cyan
        cd apps/web
        vercel --prod
    } else {
        Write-Host "Ok! Use o dashboard da Vercel então." -ForegroundColor Gray
    }
} else {
    Write-Host "❌ Vercel CLI não encontrado" -ForegroundColor Red
    Write-Host "Para instalar: npm install -g vercel" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ou use o dashboard da Vercel (OPÇÃO A acima)" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 CHECKLIST DE DEPLOY:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[ ] 1. Push para GitHub ✅" -ForegroundColor Green
Write-Host "[ ] 2. Deploy na Vercel (aguardando você)" -ForegroundColor Yellow
Write-Host "[ ] 3. Anotar URL gerada" -ForegroundColor Gray
Write-Host "[ ] 4. Testar dashboard /admin" -ForegroundColor Gray
Write-Host "[ ] 5. Verificar tema azul está aplicado" -ForegroundColor Gray
Write-Host ""
