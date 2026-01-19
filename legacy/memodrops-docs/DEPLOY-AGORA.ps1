# 🚀 DEPLOY AUTOMÁTICO - MemoDrops
# Execute com: Duplo-clique ou .\DEPLOY-AGORA.ps1

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   🚀 DEPLOY AUTOMÁTICO DO MEMODROPS" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Ir para o diretório correto
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "📁 Diretório atual: $scriptPath" -ForegroundColor Yellow
Write-Host ""

# 1. Git Status
Write-Host "📊 Verificando mudanças..." -ForegroundColor Cyan
git status --short

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   ⚠️  CONFIRMAÇÃO" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Você está prestes a fazer deploy com as seguintes mudanças:" -ForegroundColor White
Write-Host "  ✅ Dockerfile corrigido (usa pnpm)" -ForegroundColor Green
Write-Host "  ✅ railway.toml atualizado" -ForegroundColor Green
Write-Host "  ✅ .dockerignore criado" -ForegroundColor Green
Write-Host ""

$confirm = Read-Host "Deseja continuar? (S/n)"

if ($confirm -eq "n" -or $confirm -eq "N") {
    Write-Host ""
    Write-Host "❌ Deploy cancelado pelo usuário." -ForegroundColor Red
    Write-Host ""
    Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   📦 INICIANDO DEPLOY" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# 2. Git Add
Write-Host "➕ Adicionando arquivos..." -ForegroundColor Cyan
git add .

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Erro ao adicionar arquivos!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "   ✅ Arquivos adicionados" -ForegroundColor Green
Write-Host ""

# 3. Git Commit
Write-Host "💾 Criando commit..." -ForegroundColor Cyan
git commit -m "fix: corrigir Dockerfile para usar pnpm ao invés de npm

- Reescrever Dockerfile para usar pnpm
- Mudar railway.toml para usar dockerfile builder
- Adicionar .dockerignore para otimizar build
- Resolver erro: npm ci requires package-lock.json

Correção aplicada automaticamente via script"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Erro ao criar commit!" -ForegroundColor Red
    Write-Host "   Pode ser que não haja mudanças para commitar." -ForegroundColor Yellow
    Write-Host ""
    
    $forcePush = Read-Host "Tentar push mesmo assim? (S/n)"
    if ($forcePush -eq "n" -or $forcePush -eq "N") {
        Write-Host ""
        Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit
    }
} else {
    Write-Host "   ✅ Commit criado" -ForegroundColor Green
}

Write-Host ""

# 4. Git Push
Write-Host "🚀 Enviando para GitHub..." -ForegroundColor Cyan
Write-Host "   (Isso vai triggerar o deploy no Railway)" -ForegroundColor Gray
Write-Host ""

# Tentar push para main
git push origin main 2>&1 | Out-Null
$mainSuccess = $LASTEXITCODE -eq 0

if (-not $mainSuccess) {
    Write-Host "   ⚠️  Branch 'main' não funcionou, tentando 'master'..." -ForegroundColor Yellow
    git push origin master 2>&1 | Out-Null
    $masterSuccess = $LASTEXITCODE -eq 0
    
    if (-not $masterSuccess) {
        Write-Host ""
        Write-Host "❌ Erro ao fazer push!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Possíveis causas:" -ForegroundColor Yellow
        Write-Host "  1. Você não está autenticado no Git" -ForegroundColor White
        Write-Host "  2. Não tem permissão no repositório" -ForegroundColor White
        Write-Host "  3. Branch não existe" -ForegroundColor White
        Write-Host ""
        Write-Host "Tente executar manualmente:" -ForegroundColor Cyan
        Write-Host "  git push origin main" -ForegroundColor White
        Write-Host "  ou" -ForegroundColor Gray
        Write-Host "  git push origin master" -ForegroundColor White
        Write-Host ""
        Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "   ✅ PUSH REALIZADO COM SUCESSO!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 Deploy iniciado no Railway!" -ForegroundColor Green
Write-Host ""
Write-Host "O que vai acontecer agora:" -ForegroundColor Cyan
Write-Host "  1. ⏳ Railway detecta o novo commit (10-30s)" -ForegroundColor White
Write-Host "  2. ⏳ Inicia novo build com Dockerfile corrigido (30s)" -ForegroundColor White
Write-Host "  3. ⏳ Instala pnpm e dependências (60-90s)" -ForegroundColor White
Write-Host "  4. ⏳ Compila TypeScript (60-90s)" -ForegroundColor White
Write-Host "  5. ✅ Deploy completo! (~3-5 minutos total)" -ForegroundColor White
Write-Host ""

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   📊 ACOMPANHAR DEPLOY" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Acesse: https://railway.app" -ForegroundColor White
Write-Host "  → Selecione o projeto MemoDrops" -ForegroundColor Gray
Write-Host "  → Vá para 'Deployments'" -ForegroundColor Gray
Write-Host "  → Veja os logs em tempo real" -ForegroundColor Gray
Write-Host ""

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   ✅ TESTAR DEPOIS DO DEPLOY" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Aguarde 3-5 minutos e teste:" -ForegroundColor White
Write-Host ""
Write-Host "  curl https://SEU-PROJETO.up.railway.app/health" -ForegroundColor Cyan
Write-Host ""

Write-Host "================================================================" -ForegroundColor Green
Write-Host "   🎉 SCRIPT CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
