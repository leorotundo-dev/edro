# Verificacao Rapida da Instalacao - MemoDrops

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verificacao da Instalacao - MemoDrops" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Node.js
Write-Host "1. Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "   Versao: $nodeVersion" -ForegroundColor Green
    
    if ($nodeVersion -match "v20") {
        Write-Host "   Status: OK - Versao compativel" -ForegroundColor Green
    } elseif ($nodeVersion -match "v2[1-9]|v[3-9]") {
        Write-Host "   Status: AVISO - Versao muito nova" -ForegroundColor Yellow
    } else {
        Write-Host "   Status: AVISO - Versao pode ser incompativel" -ForegroundColor Yellow
    }
} else {
    Write-Host "   Status: ERRO - Node.js nao encontrado" -ForegroundColor Red
}
Write-Host ""

# 2. npm
Write-Host "2. Verificando npm..." -ForegroundColor Yellow
$npmVersion = npm --version 2>$null
if ($npmVersion) {
    Write-Host "   Versao: $npmVersion" -ForegroundColor Green
    Write-Host "   Status: OK" -ForegroundColor Green
} else {
    Write-Host "   Status: ERRO - npm nao encontrado" -ForegroundColor Red
}
Write-Host ""

# 3. node_modules na raiz
Write-Host "3. Verificando node_modules (raiz)..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    $moduleCount = (Get-ChildItem "node_modules" -Directory).Count
    Write-Host "   Modulos instalados: $moduleCount" -ForegroundColor Green
    Write-Host "   Status: OK" -ForegroundColor Green
} else {
    Write-Host "   Status: NAO INSTALADO" -ForegroundColor Red
    Write-Host "   Execute: npm install" -ForegroundColor Yellow
}
Write-Host ""

# 4. node_modules do backend
Write-Host "4. Verificando node_modules (backend)..." -ForegroundColor Yellow
if (Test-Path "apps\backend\node_modules") {
    $backendModuleCount = (Get-ChildItem "apps\backend\node_modules" -Directory).Count
    Write-Host "   Modulos instalados: $backendModuleCount" -ForegroundColor Green
    Write-Host "   Status: OK" -ForegroundColor Green
} else {
    Write-Host "   Status: NAO INSTALADO" -ForegroundColor Red
    Write-Host "   Execute: cd apps\backend; npm install" -ForegroundColor Yellow
}
Write-Host ""

# 5. ts-node-dev
Write-Host "5. Verificando ts-node-dev..." -ForegroundColor Yellow
if (Test-Path "apps\backend\node_modules\ts-node-dev") {
    Write-Host "   Status: OK - Instalado" -ForegroundColor Green
} else {
    Write-Host "   Status: NAO INSTALADO" -ForegroundColor Red
    Write-Host "   Execute: cd apps\backend; npm install --save-dev ts-node-dev" -ForegroundColor Yellow
}
Write-Host ""

# 6. .npmrc
Write-Host "6. Verificando .npmrc..." -ForegroundColor Yellow
if (Test-Path ".npmrc") {
    Write-Host "   Status: OK - Arquivo existe" -ForegroundColor Green
    $npmrcContent = Get-Content ".npmrc" -Raw
    if ($npmrcContent -match "symlinks=false") {
        Write-Host "   Configuracao: symlinks=false (OK)" -ForegroundColor Green
    }
    if ($npmrcContent -match "legacy-peer-deps=true") {
        Write-Host "   Configuracao: legacy-peer-deps=true (OK)" -ForegroundColor Green
    }
} else {
    Write-Host "   Status: NAO EXISTE" -ForegroundColor Yellow
    Write-Host "   Execute: FIX_TUDO.ps1 para criar" -ForegroundColor Yellow
}
Write-Host ""

# 7. .env do backend
Write-Host "7. Verificando .env (backend)..." -ForegroundColor Yellow
if (Test-Path "apps\backend\.env") {
    Write-Host "   Status: OK - Arquivo existe" -ForegroundColor Green
    
    $envContent = Get-Content "apps\backend\.env" -Raw
    if ($envContent -match "DATABASE_URL=") {
        Write-Host "   Variavel: DATABASE_URL configurada" -ForegroundColor Green
    } else {
        Write-Host "   Variavel: DATABASE_URL FALTANDO" -ForegroundColor Red
    }
    
    if ($envContent -match "PORT=") {
        Write-Host "   Variavel: PORT configurada" -ForegroundColor Green
    }
    
    if ($envContent -match "JWT_SECRET=") {
        Write-Host "   Variavel: JWT_SECRET configurada" -ForegroundColor Green
    }
    
    if ($envContent -match "OPENAI_API_KEY=") {
        Write-Host "   Variavel: OPENAI_API_KEY configurada" -ForegroundColor Green
    }
} else {
    Write-Host "   Status: NAO EXISTE" -ForegroundColor Red
    Write-Host "   Execute: FIX_TUDO.ps1 para criar" -ForegroundColor Yellow
}
Write-Host ""

# 8. PostgreSQL (opcional)
Write-Host "8. Verificando PostgreSQL..." -ForegroundColor Yellow
$pgRunning = Get-Process postgres -ErrorAction SilentlyContinue
if ($pgRunning) {
    Write-Host "   Status: OK - PostgreSQL esta rodando" -ForegroundColor Green
} else {
    Write-Host "   Status: Nao detectado (pode estar usando banco remoto)" -ForegroundColor Yellow
}
Write-Host ""

# Resumo Final
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUMO DA VERIFICACAO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allOk = $true

if (-not $nodeVersion -or $nodeVersion -notmatch "v20") {
    Write-Host "[ ] Node.js v20 instalado" -ForegroundColor Red
    $allOk = $false
} else {
    Write-Host "[OK] Node.js v20 instalado" -ForegroundColor Green
}

if (-not (Test-Path "node_modules")) {
    Write-Host "[ ] Dependencias da raiz instaladas" -ForegroundColor Red
    $allOk = $false
} else {
    Write-Host "[OK] Dependencias da raiz instaladas" -ForegroundColor Green
}

if (-not (Test-Path "apps\backend\node_modules")) {
    Write-Host "[ ] Dependencias do backend instaladas" -ForegroundColor Red
    $allOk = $false
} else {
    Write-Host "[OK] Dependencias do backend instaladas" -ForegroundColor Green
}

if (-not (Test-Path "apps\backend\node_modules\ts-node-dev")) {
    Write-Host "[ ] ts-node-dev instalado" -ForegroundColor Red
    $allOk = $false
} else {
    Write-Host "[OK] ts-node-dev instalado" -ForegroundColor Green
}

if (-not (Test-Path ".npmrc")) {
    Write-Host "[ ] .npmrc configurado" -ForegroundColor Yellow
} else {
    Write-Host "[OK] .npmrc configurado" -ForegroundColor Green
}

if (-not (Test-Path "apps\backend\.env")) {
    Write-Host "[ ] .env configurado" -ForegroundColor Yellow
} else {
    Write-Host "[OK] .env configurado" -ForegroundColor Green
}

Write-Host ""

if ($allOk) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "TUDO OK! Pronto para rodar o servidor!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Execute:" -ForegroundColor White
    Write-Host "  cd apps\backend" -ForegroundColor Gray
    Write-Host "  npm run dev" -ForegroundColor Gray
} else {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "Algumas dependencias precisam ser instaladas" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Execute:" -ForegroundColor White
    Write-Host "  .\FIX_TUDO.ps1" -ForegroundColor Gray
}

Write-Host ""
