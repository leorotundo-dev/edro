# ============================================
# Script de Teste - Web-Aluno no Docker
# ============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   TESTE WEB-ALUNO NO DOCKER" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Verificar se o container está rodando
Write-Host "✓ Verificando status do container..." -ForegroundColor Yellow
$container = docker ps --filter "name=web-aluno-container" --format "{{.Status}}"

if ($container) {
    Write-Host "  ✓ Container rodando: $container" -ForegroundColor Green
} else {
    Write-Host "  ✗ Container não está rodando!" -ForegroundColor Red
    exit 1
}

# 2. Testar a aplicação
Write-Host "`n✓ Testando aplicação na porta 3001..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ Aplicação respondendo corretamente!" -ForegroundColor Green
        Write-Host "  ✓ Status Code: $($response.StatusCode)" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Erro ao acessar aplicação: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Verificar logs recentes
Write-Host "`n✓ Logs recentes do container:" -ForegroundColor Yellow
docker logs web-aluno-container --tail 10

# 4. Informações do container
Write-Host "`n✓ Informações do container:" -ForegroundColor Yellow
docker inspect web-aluno-container --format "{{.Config.Image}}" | ForEach-Object {
    Write-Host "  Imagem: $_" -ForegroundColor Cyan
}
docker inspect web-aluno-container --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" | ForEach-Object {
    Write-Host "  IP Interno: $_" -ForegroundColor Cyan
}

# 5. Resumo
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   RESUMO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Container: web-aluno-container" -ForegroundColor Green
Write-Host "✓ Imagem: memodrops-web-aluno:latest" -ForegroundColor Green
Write-Host "✓ Porta: 3001 → 3000" -ForegroundColor Green
Write-Host "✓ URL Local: http://localhost:3001" -ForegroundColor Green
Write-Host "`n✓ Acesse no navegador: " -ForegroundColor Yellow -NoNewline
Write-Host "http://localhost:3001" -ForegroundColor Cyan

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   COMANDOS ÚTEIS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Parar:      docker stop web-aluno-container" -ForegroundColor White
Write-Host "Iniciar:    docker start web-aluno-container" -ForegroundColor White
Write-Host "Logs:       docker logs web-aluno-container -f" -ForegroundColor White
Write-Host "Remover:    docker rm -f web-aluno-container" -ForegroundColor White
Write-Host "Rebuild:    docker build -f apps/web-aluno/Dockerfile -t memodrops-web-aluno:latest ." -ForegroundColor White
Write-Host "`n"
