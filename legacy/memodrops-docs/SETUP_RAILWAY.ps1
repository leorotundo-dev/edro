# ============================================
# 🚂 SETUP RAILWAY CLI
# ============================================
# Este script guia você no setup do Railway CLI
# ============================================

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚂 SETUP RAILWAY CLI - MemoDrops" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ============================================
# PASSO 1: Verificar instalação
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "📊 PASSO 1: Verificando Instalação" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

$railwayCmd = Get-Command railway -ErrorAction SilentlyContinue

if ($railwayCmd) {
    $version = railway --version
    Write-Host "✅ Railway CLI instalado: $version" -ForegroundColor Green
} else {
    Write-Host "❌ Railway CLI não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instalando..." -ForegroundColor Yellow
    npm install -g @railway/cli
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Railway CLI instalado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro na instalação!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# ============================================
# PASSO 2: Login
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "🔑 PASSO 2: Login no Railway" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

$whoami = railway whoami 2>&1

if ($whoami -match "Unauthorized") {
    Write-Host "⚠️  Você não está logado ainda." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🌐 Um browser vai abrir agora..." -ForegroundColor Cyan
    Write-Host "   1. Faça login na sua conta Railway" -ForegroundColor Gray
    Write-Host "   2. Autorize o CLI" -ForegroundColor Gray
    Write-Host "   3. Volte aqui" -ForegroundColor Gray
    Write-Host ""
    
    $continue = Read-Host "Pressione Enter para abrir o browser e fazer login"
    
    Write-Host ""
    Write-Host "Abrindo browser..." -ForegroundColor Cyan
    
    # Tentar fazer login
    Start-Process "railway" -ArgumentList "login" -Wait -NoNewWindow
    
    Write-Host ""
    Write-Host "Verificando login..." -ForegroundColor Yellow
    
    $whoamiCheck = railway whoami 2>&1
    
    if ($whoamiCheck -match "Unauthorized") {
        Write-Host "❌ Login não completado!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Por favor, execute manualmente:" -ForegroundColor Yellow
        Write-Host "  railway login" -ForegroundColor Cyan
        Write-Host ""
        exit 1
    } else {
        Write-Host "✅ Login bem-sucedido!" -ForegroundColor Green
        Write-Host "   Usuário: $whoamiCheck" -ForegroundColor Gray
    }
} else {
    Write-Host "✅ Já está logado!" -ForegroundColor Green
    Write-Host "   Usuário: $whoami" -ForegroundColor Gray
}

Write-Host ""

# ============================================
# PASSO 3: Link do projeto
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "🔗 PASSO 3: Link do Projeto" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

# Verificar se está na pasta correta
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Não está na pasta correta!" -ForegroundColor Red
    Write-Host "   Execute este script da pasta memodrops-main" -ForegroundColor Yellow
    exit 1
}

Write-Host "📂 Pasta correta: $(Get-Location)" -ForegroundColor Green
Write-Host ""

# Verificar se já está linkado
$statusCheck = railway status 2>&1

if ($statusCheck -match "not linked") {
    Write-Host "⚠️  Projeto não linkado ainda." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔍 Procurando projeto 'memodrops'..." -ForegroundColor Cyan
    Write-Host ""
    
    $continue = Read-Host "Pressione Enter para linkar o projeto (vai mostrar lista)"
    
    Write-Host ""
    Write-Host "Executando railway link..." -ForegroundColor Cyan
    Write-Host ""
    
    # Linkar projeto
    railway link
    
    Write-Host ""
    Write-Host "Verificando link..." -ForegroundColor Yellow
    
    $statusCheck2 = railway status 2>&1
    
    if ($statusCheck2 -match "not linked") {
        Write-Host "❌ Link não completado!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Por favor, execute manualmente:" -ForegroundColor Yellow
        Write-Host "  railway link" -ForegroundColor Cyan
        Write-Host ""
        exit 1
    } else {
        Write-Host "✅ Projeto linkado com sucesso!" -ForegroundColor Green
    }
} else {
    Write-Host "✅ Projeto já está linkado!" -ForegroundColor Green
}

Write-Host ""

# ============================================
# PASSO 4: Testar
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "✅ PASSO 4: Teste Final" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

Write-Host "Verificando status do projeto..." -ForegroundColor Cyan
Write-Host ""

railway status

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

# ============================================
# RESUMO E PRÓXIMOS PASSOS
# ============================================
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "🎉 SETUP COMPLETO!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

Write-Host "Agora você pode:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. Ver logs em tempo real:" -ForegroundColor Cyan
Write-Host "   railway logs --follow" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Ver status dos deploys:" -ForegroundColor Cyan
Write-Host "   railway status" -ForegroundColor Gray
Write-Host ""

Write-Host "3. Abrir dashboard:" -ForegroundColor Cyan
Write-Host "   railway open" -ForegroundColor Gray
Write-Host ""

Write-Host "4. Monitorar tudo automaticamente:" -ForegroundColor Cyan
Write-Host "   .\MONITORAR_DEPLOY.ps1" -ForegroundColor Gray
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

$action = Read-Host "O que deseja fazer agora? (logs/status/monitor/sair)"

switch ($action.ToLower()) {
    "logs" {
        Write-Host ""
        Write-Host "Abrindo logs em tempo real..." -ForegroundColor Cyan
        Write-Host "(Pressione Ctrl+C para sair)" -ForegroundColor Gray
        Write-Host ""
        railway logs --follow
    }
    "status" {
        Write-Host ""
        railway status
        Write-Host ""
    }
    "monitor" {
        Write-Host ""
        Write-Host "Iniciando monitor..." -ForegroundColor Cyan
        Write-Host ""
        .\MONITORAR_DEPLOY.ps1
    }
    default {
        Write-Host ""
        Write-Host "✅ Setup finalizado!" -ForegroundColor Green
        Write-Host ""
    }
}

Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
