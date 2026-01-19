# Deploy Completo no Railway - Backend + Frontend
# Tudo no Railway, nada no Vercel

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "   DEPLOY COMPLETO NO RAILWAY - MEMODROPS" -ForegroundColor Cyan
Write-Host "   Backend + Frontend = 100% Railway" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# ============================================================
# VERIFICACOES INICIAIS
# ============================================================

Write-Host "VERIFICANDO DEPENDENCIAS..." -ForegroundColor Magenta
Write-Host "-------------------------------------------------------------" -ForegroundColor Gray

# Verificar Railway CLI
$railwayInstalled = $false
try {
    $railwayVersion = railway --version 2>$null
    if ($railwayVersion) {
        Write-Host "[OK] Railway CLI: $railwayVersion" -ForegroundColor Green
        $railwayInstalled = $true
    }
}
catch {
    Write-Host "[ERRO] Railway CLI nao instalado" -ForegroundColor Red
    Write-Host "       Instale com: npm install -g @railway/cli" -ForegroundColor Yellow
    exit
}

# Verificar autenticacao
try {
    $whoami = railway whoami 2>&1
    Write-Host "[OK] Autenticado no Railway" -ForegroundColor Green
}
catch {
    Write-Host "[ERRO] Nao autenticado no Railway" -ForegroundColor Red
    Write-Host "       Execute: railway login" -ForegroundColor Yellow
    
    $login = Read-Host "`n       Deseja fazer login agora? (s/n)"
    if ($login -eq "s") {
        railway login
    } else {
        exit
    }
}

# ============================================================
# INFORMACOES DO PROJETO
# ============================================================

Write-Host ""
Write-Host "INFORMACOES DO PROJETO" -ForegroundColor Magenta
Write-Host "-------------------------------------------------------------" -ForegroundColor Gray

try {
    Write-Host "Listando projetos Railway..." -ForegroundColor Cyan
    railway list
    Write-Host ""
}
catch {
    Write-Host "[AVISO] Nao foi possivel listar projetos" -ForegroundColor Yellow
}

# ============================================================
# CONFIRMACAO
# ============================================================

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "   O QUE SERA FEITO:" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Deploy do BACKEND no Railway" -ForegroundColor Yellow
Write-Host "   - API de editais"
Write-Host "   - Rotas, repositories, types"
Write-Host "   - Migrations do banco de dados"
Write-Host ""
Write-Host "2. Deploy do FRONTEND no Railway" -ForegroundColor Yellow
Write-Host "   - Paginas de gestao de editais"
Write-Host "   - Componentes UI"
Write-Host "   - Sistema completo"
Write-Host ""
Write-Host "Estimativa: 5-10 minutos" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "Confirma o deploy completo no Railway? (s/n)"
if ($confirm -ne "s") {
    Write-Host "Deploy cancelado." -ForegroundColor Yellow
    exit
}

# ============================================================
# DEPLOY BACKEND
# ============================================================

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "   [1/2] DEPLOY DO BACKEND" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar arquivos do backend
Write-Host "Verificando arquivos do backend..." -ForegroundColor Magenta
$backendFiles = @(
    "apps/backend/src/routes/editais.ts",
    "apps/backend/src/repositories/editalRepository.ts",
    "apps/backend/src/types/edital.ts",
    "apps/backend/src/db/migrations/0014_editais_system.sql",
    "apps/backend/package.json"
)

$allBackendExist = $true
foreach ($file in $backendFiles) {
    if (Test-Path $file) {
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "  [FALTA] $file" -ForegroundColor Red
        $allBackendExist = $false
    }
}

if (-not $allBackendExist) {
    Write-Host ""
    Write-Host "[AVISO] Alguns arquivos nao foram encontrados!" -ForegroundColor Yellow
    $continue = Read-Host "Continuar mesmo assim? (s/n)"
    if ($continue -ne "s") {
        exit
    }
}

Write-Host ""
Write-Host "Fazendo deploy do backend no Railway..." -ForegroundColor Cyan
Write-Host "Aguarde... (isso pode levar alguns minutos)" -ForegroundColor Gray
Write-Host ""

Set-Location "apps/backend"

try {
    railway up
    $backendSuccess = $LASTEXITCODE -eq 0
}
catch {
    Write-Host "[ERRO] Falha no deploy do backend: $_" -ForegroundColor Red
    $backendSuccess = $false
}

Set-Location "../.."

if ($backendSuccess) {
    Write-Host ""
    Write-Host "[SUCESSO] Backend deployado no Railway!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[ERRO] Falha no deploy do backend" -ForegroundColor Red
    Write-Host ""
    $continue = Read-Host "Continuar com o frontend mesmo assim? (s/n)"
    if ($continue -ne "s") {
        exit
    }
}

# ============================================================
# DEPLOY FRONTEND
# ============================================================

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "   [2/2] DEPLOY DO FRONTEND" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar arquivos do frontend
Write-Host "Verificando arquivos do frontend..." -ForegroundColor Magenta
$frontendFiles = @(
    "apps/web/app/admin/editais/page.tsx",
    "apps/web/app/admin/editais/novo/page.tsx",
    "apps/web/components/ui/Toast.tsx",
    "apps/web/lib/toast.ts",
    "apps/web/lib/validation.ts",
    "apps/web/lib/export.ts",
    "apps/web/package.json"
)

$allFrontendExist = $true
foreach ($file in $frontendFiles) {
    if (Test-Path $file) {
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "  [FALTA] $file" -ForegroundColor Red
        $allFrontendExist = $false
    }
}

if (-not $allFrontendExist) {
    Write-Host ""
    Write-Host "[AVISO] Alguns arquivos nao foram encontrados!" -ForegroundColor Yellow
    $continue = Read-Host "Continuar mesmo assim? (s/n)"
    if ($continue -ne "s") {
        exit
    }
}

Write-Host ""
Write-Host "Fazendo deploy do frontend no Railway..." -ForegroundColor Cyan
Write-Host "Aguarde... (isso pode levar alguns minutos)" -ForegroundColor Gray
Write-Host ""

Set-Location "apps/web"

try {
    railway up
    $frontendSuccess = $LASTEXITCODE -eq 0
}
catch {
    Write-Host "[ERRO] Falha no deploy do frontend: $_" -ForegroundColor Red
    $frontendSuccess = $false
}

Set-Location "../.."

if ($frontendSuccess) {
    Write-Host ""
    Write-Host "[SUCESSO] Frontend deployado no Railway!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[ERRO] Falha no deploy do frontend" -ForegroundColor Red
}

# ============================================================
# RESUMO FINAL
# ============================================================

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "   RESUMO DO DEPLOY" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

if ($backendSuccess) {
    Write-Host "[OK] Backend deployado" -ForegroundColor Green
} else {
    Write-Host "[FALHOU] Backend" -ForegroundColor Red
}

if ($frontendSuccess) {
    Write-Host "[OK] Frontend deployado" -ForegroundColor Green
} else {
    Write-Host "[FALHOU] Frontend" -ForegroundColor Red
}

Write-Host ""
Write-Host "-------------------------------------------------------------" -ForegroundColor Gray

if ($backendSuccess -and $frontendSuccess) {
    Write-Host ""
    Write-Host "PARABENS! Deploy completo realizado com sucesso!" -ForegroundColor Green
    Write-Host ""
} elseif ($backendSuccess -or $frontendSuccess) {
    Write-Host ""
    Write-Host "Deploy parcialmente concluido" -ForegroundColor Yellow
    Write-Host "Verifique os erros acima e tente novamente" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Deploy falhou" -ForegroundColor Red
    Write-Host "Verifique os erros acima e tente novamente" -ForegroundColor Red
    Write-Host ""
}

# ============================================================
# PROXIMOS PASSOS
# ============================================================

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "   PROXIMOS PASSOS" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. VERIFICAR LOGS" -ForegroundColor Yellow
Write-Host "   Backend:  cd apps/backend; railway logs" -ForegroundColor Cyan
Write-Host "   Frontend: cd apps/web; railway logs" -ForegroundColor Cyan
Write-Host ""

Write-Host "2. PEGAR URLs DO RAILWAY" -ForegroundColor Yellow
Write-Host "   Backend:  cd apps/backend; railway domain" -ForegroundColor Cyan
Write-Host "   Frontend: cd apps/web; railway domain" -ForegroundColor Cyan
Write-Host ""

Write-Host "3. CONFIGURAR VARIAVEIS DE AMBIENTE" -ForegroundColor Yellow
Write-Host "   No frontend, configure NEXT_PUBLIC_API_URL com a URL do backend" -ForegroundColor Cyan
Write-Host "   Execute: cd apps/web; railway variables" -ForegroundColor Cyan
Write-Host ""

Write-Host "4. TESTAR O SISTEMA" -ForegroundColor Yellow
Write-Host "   Acesse a URL do frontend e teste:" -ForegroundColor Cyan
Write-Host "   - /admin/editais (listagem)" -ForegroundColor Cyan
Write-Host "   - Criar novo edital" -ForegroundColor Cyan
Write-Host "   - Filtros e buscas" -ForegroundColor Cyan
Write-Host ""

Write-Host "5. MONITORAR" -ForegroundColor Yellow
Write-Host "   Dashboard: https://railway.app/dashboard" -ForegroundColor Cyan
Write-Host ""

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "Deploy concluido!" -ForegroundColor White
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""
