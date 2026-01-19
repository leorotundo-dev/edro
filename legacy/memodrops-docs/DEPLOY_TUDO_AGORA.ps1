# ============================================
# 🚀 DEPLOY TUDO AGORA - MemoDrops
# ============================================
# Este script vai:
# 1. Commitar todas as mudanças locais
# 2. Fazer push para GitHub
# 3. Triggerar rebuilds automáticos no Railway
# ============================================

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 INICIANDO DEPLOY COMPLETO DO MEMODROPS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ ERRO: Execute este script na raiz do projeto!" -ForegroundColor Red
    exit 1
}

Write-Host "📍 Diretório atual: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# ============================================
# PASSO 1: Verificar status
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "📊 PASSO 1: Verificando Status do Git" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

git status
Write-Host ""

$continue = Read-Host "Deseja continuar com o commit? (S/N)"
if ($continue -ne "S" -and $continue -ne "s") {
    Write-Host "❌ Operação cancelada pelo usuário" -ForegroundColor Yellow
    exit 0
}

# ============================================
# PASSO 2: Add + Commit
# ============================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "📦 PASSO 2: Adicionando e Commitando Mudanças" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

Write-Host "➜ Adicionando todos os arquivos..." -ForegroundColor Cyan
git add .

Write-Host "➜ Criando commit..." -ForegroundColor Cyan
$commitMsg = "fix: correções de build e configuração de Node 24 - deploy completo"
git commit -m "$commitMsg"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERRO ao criar commit!" -ForegroundColor Red
    Write-Host "Verifique se há algo a commitar ou se há conflitos." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Commit criado com sucesso!" -ForegroundColor Green
Write-Host ""

# ============================================
# PASSO 3: Push para GitHub
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "🚀 PASSO 3: Fazendo Push para GitHub" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

Write-Host "➜ Enviando para origin/main..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERRO ao fazer push!" -ForegroundColor Red
    Write-Host "Possíveis causas:" -ForegroundColor Yellow
    Write-Host "  - Sem permissão (configure credenciais)" -ForegroundColor Yellow
    Write-Host "  - Sem conexão com internet" -ForegroundColor Yellow
    Write-Host "  - Branch protegida" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Push realizado com sucesso!" -ForegroundColor Green
Write-Host ""

# ============================================
# PASSO 4: Informações de Monitoramento
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "📊 PASSO 4: Monitorando Deploys" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

Write-Host "O push foi enviado! Agora os deploys vão começar automaticamente." -ForegroundColor Cyan
Write-Host ""

Write-Host "🚂 RAILWAY (Backend):" -ForegroundColor Yellow
Write-Host "   URL: https://railway.app/project/e0ca0841-18bc-4c48-942e-d90a6b725a5b" -ForegroundColor White
Write-Host "   Tempo estimado: 3-5 minutos" -ForegroundColor Gray
Write-Host ""

Write-Host "🌐 VERCEL (Frontends):" -ForegroundColor Yellow
Write-Host "   Admin: https://vercel.com/memo-drops/memodrops-web" -ForegroundColor White
Write-Host "   Tempo estimado: 2-3 minutos" -ForegroundColor Gray
Write-Host ""

Write-Host "📝 NOTA IMPORTANTE:" -ForegroundColor Magenta
Write-Host "   Se os projetos @edro/ai, scrapers ou web-aluno não existem" -ForegroundColor White
Write-Host "   no Railway, você precisa criá-los manualmente no dashboard." -ForegroundColor White
Write-Host ""

# ============================================
# PASSO 5: URLs para Verificação
# ============================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "✅ PRÓXIMOS PASSOS" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

Write-Host "1️⃣  Aguarde 5 minutos para os builds completarem" -ForegroundColor Cyan
Write-Host ""

Write-Host "2️⃣  Verifique o Backend:" -ForegroundColor Cyan
Write-Host "    curl https://backend-production-61d0.up.railway.app/health" -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣  Abra o dashboard do Railway:" -ForegroundColor Cyan
Write-Host "    https://railway.app/dashboard" -ForegroundColor Gray
Write-Host ""

Write-Host "4️⃣  Abra o dashboard do Vercel:" -ForegroundColor Cyan
Write-Host "    https://vercel.com/dashboard" -ForegroundColor Gray
Write-Host ""

Write-Host "5️⃣  Se algo falhar, veja os logs:" -ForegroundColor Cyan
Write-Host "    Railway: Clique no projeto → View Logs" -ForegroundColor Gray
Write-Host "    Vercel: Clique no deployment → View Function Logs" -ForegroundColor Gray
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "🎉 DEPLOY INICIADO COM SUCESSO!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

Write-Host "📊 Commit: $commitMsg" -ForegroundColor Gray
Write-Host "🕐 Hora: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
