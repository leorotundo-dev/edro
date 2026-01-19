tabe#!/usr/bin/env pwsh
# ========================================
# Script para executar migrações no Railway
# ========================================

Write-Host "🚀 Executando migrações no Railway..." -ForegroundColor Cyan
Write-Host ""

# Navegar para o diretório do backend
Set-Location -Path "apps/backend"

Write-Host "📂 Diretório atual: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Verificar se o arquivo .env existe
if (-not (Test-Path "../../.env")) {
    Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
    Write-Host "   Crie o arquivo .env na raiz do projeto com DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Arquivo .env encontrado" -ForegroundColor Green
Write-Host ""

# Executar migrações
Write-Host "🔄 Executando migrações..." -ForegroundColor Cyan
npm run db:migrate

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migrações executadas com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Reiniciar o backend no Railway" -ForegroundColor White
    Write-Host "   2. Verificar logs do backend" -ForegroundColor White
    Write-Host "   3. Testar endpoints da aplicação" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Erro ao executar migrações!" -ForegroundColor Red
    Write-Host "   Verifique os erros acima" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Voltar para o diretório raiz
Set-Location -Path "../.."
