# 🔍 Verificar URL da Dashboard na Vercel

Write-Host "🔍 VERIFICANDO DASHBOARDS DEPLOYADAS NA VERCEL" -ForegroundColor Cyan
Write-Host ""

$urls = @(
    "https://memodrops-web.vercel.app",
    "https://memodrops-web-memo-drops.vercel.app",
    "https://memodrops-web-git-main-memo-drops.vercel.app",
    "https://memodrops-dashboard-1bj6g09lt-memo-drops.vercel.app"
)

foreach ($url in $urls) {
    Write-Host "📡 Testando: " -NoNewline -ForegroundColor Yellow
    Write-Host $url -ForegroundColor White
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method Head -TimeoutSec 10 -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ ONLINE! " -NoNewline -ForegroundColor Green
            Write-Host "Acesse: $url" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "   🎯 DASHBOARD ENCONTRADA!" -ForegroundColor Green
            Write-Host "   Abra no navegador: $url/admin" -ForegroundColor Yellow
            Write-Host ""
        }
    } catch {
        Write-Host "   ❌ Offline ou não existe" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "💡 DICA:" -ForegroundColor Cyan
Write-Host "Se nenhuma URL funcionou, você precisa fazer o deploy:" -ForegroundColor White
Write-Host "  1. Acesse: https://vercel.com/dashboard" -ForegroundColor Yellow
Write-Host "  2. Procure por 'memodrops'" -ForegroundColor Yellow
Write-Host "  3. Veja qual URL está ativa" -ForegroundColor Yellow
Write-Host ""
Write-Host "Ou instale Vercel CLI:" -ForegroundColor White
Write-Host "  npm install -g vercel" -ForegroundColor Yellow
Write-Host "  cd apps/web" -ForegroundColor Yellow
Write-Host "  vercel ls" -ForegroundColor Yellow
