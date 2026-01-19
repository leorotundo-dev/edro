# Script para testar o Dockerfile localmente
# Execute: .\test-docker.ps1

Write-Host "🐳 Testando Dockerfile do MemoDrops..." -ForegroundColor Cyan
Write-Host ""

# Verificar se Docker está rodando
try {
    docker version | Out-Null
} catch {
    Write-Host "❌ Docker não está rodando!" -ForegroundColor Red
    Write-Host "   Inicie o Docker Desktop e tente novamente." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Docker está rodando" -ForegroundColor Green
Write-Host ""

# Verificar se arquivo .env existe
if (!(Test-Path ".env")) {
    Write-Host "⚠️  Arquivo .env não encontrado" -ForegroundColor Yellow
    Write-Host "   Criando .env de exemplo..." -ForegroundColor Yellow
    
    @"
DATABASE_URL=postgresql://user:pass@localhost:5432/memodrops
OPENAI_API_KEY=sk-test
OPENAI_BASE_URL=https://api.openai.com/v1
JWT_SECRET=test-secret-key-change-in-production
NODE_ENV=development
"@ | Out-File -FilePath ".env" -Encoding UTF8
    
    Write-Host "✅ Arquivo .env criado" -ForegroundColor Green
    Write-Host "   ATENÇÃO: Configure as variáveis antes de usar!" -ForegroundColor Yellow
    Write-Host ""
}

# Build da imagem
Write-Host "📦 Construindo imagem Docker..." -ForegroundColor Cyan
docker build -t memodrops-backend:test .

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Build completado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Dockerfile está correto!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para rodar localmente:" -ForegroundColor Cyan
    Write-Host "  docker run -p 3000:3000 --env-file .env memodrops-backend:test" -ForegroundColor White
    Write-Host ""
    Write-Host "Para testar:" -ForegroundColor Cyan
    Write-Host "  curl http://localhost:3000/health" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Build falhou!" -ForegroundColor Red
    Write-Host "   Verifique os erros acima." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
