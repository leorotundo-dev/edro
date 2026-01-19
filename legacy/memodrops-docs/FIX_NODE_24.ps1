# Script de Correcao para Node v24 - MemoDrops
# Adaptado para funcionar com Node.js v24+

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MemoDrops - Correcao para Node v24" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar versao do Node
Write-Host "1. Verificando versao do Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "   Versao atual: $nodeVersion" -ForegroundColor Gray
Write-Host "   Vamos configurar para funcionar com Node v24!" -ForegroundColor Green
Write-Host ""

# Criar .npmrc com configuracoes para Node v24
Write-Host "2. Criando .npmrc otimizado para Node v24..." -ForegroundColor Yellow
@"
symlinks=false
legacy-peer-deps=true
engine-strict=false
force=true
"@ | Out-File -FilePath .npmrc -Encoding utf8
Write-Host "   .npmrc criado com configuracoes especiais" -ForegroundColor Green
Write-Host ""

# Limpar node_modules
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

# Instalar dependencias na raiz com --force
Write-Host "4. Instalando dependencias na raiz (forcado)..." -ForegroundColor Yellow
Write-Host "   (Isso pode demorar alguns minutos)" -ForegroundColor Gray
Write-Host "   IMPORTANTE: Vai aparecer varios avisos, mas e normal!" -ForegroundColor Cyan
Write-Host ""

npm install --force --legacy-peer-deps

Write-Host ""
Write-Host "   Instalacao da raiz concluida" -ForegroundColor Green
Write-Host ""

# Instalar dependencias do backend
Write-Host "5. Instalando dependencias do backend..." -ForegroundColor Yellow
Set-Location apps\backend

# Atualizar package.json do backend para aceitar Node v24
Write-Host "   Atualizando package.json para aceitar Node v24..." -ForegroundColor Gray
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
if (-not $packageJson.engines) {
    $packageJson | Add-Member -MemberType NoteProperty -Name "engines" -Value @{} -Force
}
$packageJson.engines.node = ">=18.0.0"
$packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"

npm install --force --legacy-peer-deps

Write-Host ""
Write-Host "   Instalacao do backend concluida" -ForegroundColor Green
Write-Host ""

# Verificar ts-node-dev
Write-Host "6. Verificando ts-node-dev..." -ForegroundColor Yellow
$tsNodeDev = npm list ts-node-dev 2>&1 | Out-String

if ($tsNodeDev -match "ts-node-dev@") {
    Write-Host "   ts-node-dev instalado" -ForegroundColor Green
} else {
    Write-Host "   Instalando ts-node-dev..." -ForegroundColor Yellow
    npm install --save-dev ts-node-dev --force
    Write-Host "   ts-node-dev instalado" -ForegroundColor Green
}
Write-Host ""

# Verificar .env
Write-Host "7. Verificando arquivo .env..." -ForegroundColor Yellow

if (-not (Test-Path .env)) {
    Write-Host "   Criando arquivo .env basico..." -ForegroundColor Yellow
    @"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/memodrops
PORT=3333
JWT_SECRET=change-me-in-production-super-secret-key-here
OPENAI_API_KEY=sk-your-key-here
NODE_ENV=development
"@ | Out-File -FilePath .env -Encoding utf8
    Write-Host "   .env criado" -ForegroundColor Green
    Write-Host ""
    Write-Host "   IMPORTANTE: Configure as variaveis no arquivo .env!" -ForegroundColor Yellow
    Write-Host "   Especialmente DATABASE_URL e OPENAI_API_KEY" -ForegroundColor Yellow
} else {
    Write-Host "   Arquivo .env encontrado" -ForegroundColor Green
}
Write-Host ""

# Resumo
Set-Location ..\..
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CORRECOES CONCLUIDAS!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proximos Passos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Configure o arquivo .env:" -ForegroundColor White
Write-Host "   notepad apps\backend\.env" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Configure especialmente:" -ForegroundColor White
Write-Host "   - DATABASE_URL (credenciais do PostgreSQL)" -ForegroundColor Gray
Write-Host "   - OPENAI_API_KEY (sua chave da OpenAI)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Tente rodar o servidor:" -ForegroundColor White
Write-Host "   cd apps\backend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Acesse no navegador:" -ForegroundColor White
Write-Host "   http://localhost:3333" -ForegroundColor Blue
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Perguntar se quer tentar rodar
$runNow = Read-Host "Deseja tentar rodar o servidor agora? (s/N)"
if ($runNow -eq "s" -or $runNow -eq "S") {
    Write-Host ""
    Write-Host "Iniciando servidor..." -ForegroundColor Cyan
    Write-Host "(Pressione Ctrl+C para parar)" -ForegroundColor Gray
    Write-Host ""
    Set-Location apps\backend
    npm run dev
} else {
    Write-Host ""
    Write-Host "Ate logo! Execute npm run dev quando estiver pronto." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Comandos:" -ForegroundColor Yellow
    Write-Host "  cd apps\backend" -ForegroundColor Gray
    Write-Host "  npm run dev" -ForegroundColor Gray
}
