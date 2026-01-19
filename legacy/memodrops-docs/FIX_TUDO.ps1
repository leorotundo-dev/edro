# Script Automatico de Correcao - MemoDrops
# Execute como Administrador

Write-Host "MemoDrops - Script de Correcao Automatica" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Passo 1: Verificar versao do Node
Write-Host "1. Verificando versao do Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "   Versao atual: $nodeVersion" -ForegroundColor Gray

if ($nodeVersion -match "v2[4-9]") {
    Write-Host "   AVISO: Node.js v24+ detectado - INCOMPATIVEL!" -ForegroundColor Red
    Write-Host "   Instale Node.js v20 LTS:" -ForegroundColor Yellow
    Write-Host "      https://nodejs.org/en/download/" -ForegroundColor Blue
    Write-Host ""
    Write-Host "   Ou use NVM:" -ForegroundColor Yellow
    Write-Host "      nvm install 20" -ForegroundColor Blue
    Write-Host "      nvm use 20" -ForegroundColor Blue
    Write-Host ""
    $continue = Read-Host "Deseja continuar mesmo assim? (s/N)"
    if ($continue -ne "s" -and $continue -ne "S") {
        Write-Host "Abortado. Instale Node v20 primeiro." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   Versao do Node OK" -ForegroundColor Green
}

Write-Host ""

# Passo 2: Criar .npmrc
Write-Host "2. Criando arquivo .npmrc..." -ForegroundColor Yellow
@"
symlinks=false
legacy-peer-deps=true
"@ | Out-File -FilePath .npmrc -Encoding utf8
Write-Host "   .npmrc criado" -ForegroundColor Green
Write-Host ""

# Passo 3: Limpar node_modules
Write-Host "3. Limpando node_modules antigos..." -ForegroundColor Yellow
Write-Host "   (Isso pode demorar alguns segundos)" -ForegroundColor Gray

$foldersToRemove = @(
    "node_modules",
    "apps\backend\node_modules",
    "apps\web\node_modules",
    "apps\ai\node_modules",
    "packages\shared\node_modules"
)

foreach ($folder in $foldersToRemove) {
    if (Test-Path $folder) {
        Write-Host "   Removendo $folder..." -ForegroundColor Gray
        Remove-Item -Recurse -Force $folder -ErrorAction SilentlyContinue
    }
}

$filesToRemove = @(
    "package-lock.json",
    "apps\backend\package-lock.json",
    "apps\web\package-lock.json"
)

foreach ($file in $filesToRemove) {
    if (Test-Path $file) {
        Remove-Item -Force $file -ErrorAction SilentlyContinue
    }
}

Write-Host "   Limpeza concluida" -ForegroundColor Green
Write-Host ""

# Passo 4: Instalar dependencias na raiz
Write-Host "4. Instalando dependencias na raiz..." -ForegroundColor Yellow
Write-Host "   (Isso pode demorar alguns minutos)" -ForegroundColor Gray
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "   Dependencias da raiz instaladas" -ForegroundColor Green
} else {
    Write-Host "   Houve avisos, mas continuando..." -ForegroundColor Yellow
}
Write-Host ""

# Passo 5: Instalar dependencias do backend
Write-Host "5. Instalando dependencias do backend..." -ForegroundColor Yellow
Set-Location apps\backend
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "   Dependencias do backend instaladas" -ForegroundColor Green
} else {
    Write-Host "   Houve avisos, mas continuando..." -ForegroundColor Yellow
}
Write-Host ""

# Passo 6: Verificar ts-node-dev
Write-Host "6. Verificando ts-node-dev..." -ForegroundColor Yellow
$tsNodeDev = npm list ts-node-dev 2>&1 | Out-String

if ($tsNodeDev -match "ts-node-dev@") {
    Write-Host "   ts-node-dev instalado" -ForegroundColor Green
} else {
    Write-Host "   ts-node-dev nao encontrado, instalando..." -ForegroundColor Yellow
    npm install --save-dev ts-node-dev
    Write-Host "   ts-node-dev instalado" -ForegroundColor Green
}
Write-Host ""

# Passo 7: Verificar .env
Write-Host "7. Verificando arquivo .env..." -ForegroundColor Yellow

if (-not (Test-Path .env)) {
    Write-Host "   Arquivo .env nao encontrado!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Crie um arquivo .env com:" -ForegroundColor Yellow
    Write-Host "   ---------------------------" -ForegroundColor Gray
    Write-Host "   DATABASE_URL=postgresql://user:pass@host:5432/db" -ForegroundColor Blue
    Write-Host "   PORT=3333" -ForegroundColor Blue
    Write-Host "   JWT_SECRET=seu-secret-aqui" -ForegroundColor Blue
    Write-Host "   OPENAI_API_KEY=sk-..." -ForegroundColor Blue
    Write-Host "   ---------------------------" -ForegroundColor Gray
    Write-Host ""
    
    $createEnv = Read-Host "Deseja criar um .env basico agora? (s/N)"
    if ($createEnv -eq "s" -or $createEnv -eq "S") {
        @"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/memodrops
PORT=3333
JWT_SECRET=change-me-in-production
OPENAI_API_KEY=sk-your-key-here
NODE_ENV=development
"@ | Out-File -FilePath .env -Encoding utf8
        Write-Host "   .env criado (CONFIGURE AS VARIAVEIS!)" -ForegroundColor Green
    }
} else {
    Write-Host "   Arquivo .env encontrado" -ForegroundColor Green
}
Write-Host ""

# Passo 8: Resumo
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CORRECOES CONCLUIDAS!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proximos Passos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Configure seu arquivo .env:" -ForegroundColor White
Write-Host "   .\apps\backend\.env" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Tente rodar o servidor:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Se der erro de DATABASE_URL:" -ForegroundColor White
Write-Host "   - Verifique se o PostgreSQL esta rodando" -ForegroundColor Gray
Write-Host "   - Confira as credenciais no .env" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Acesse no navegador:" -ForegroundColor White
Write-Host "   http://localhost:3333" -ForegroundColor Blue
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Perguntar se quer tentar rodar
$runNow = Read-Host "Deseja tentar rodar o servidor agora? (s/N)"
if ($runNow -eq "s" -or $runNow -eq "S") {
    Write-Host ""
    Write-Host "Iniciando servidor..." -ForegroundColor Cyan
    Write-Host "(Pressione Ctrl+C para parar)" -ForegroundColor Gray
    Write-Host ""
    npm run dev
} else {
    Write-Host ""
    Write-Host "Ate logo! Execute npm run dev quando estiver pronto." -ForegroundColor Cyan
}
