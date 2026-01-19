# 🧪 Script de Teste Local - MemoDrops
# Testa se todas as partes do sistema funcionam localmente

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   TESTE LOCAL - MEMODROPS" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# FUNÇÕES
# ============================================

function Test-Port {
    param($Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet
    return $connection
}

function Wait-ForPort {
    param(
        [int]$Port,
        [int]$TimeoutSeconds = 30
    )
    
    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        if (Test-Port $Port) {
            return $true
        }
        Start-Sleep -Seconds 1
        $elapsed++
    }
    return $false
}

# ============================================
# 1. VERIFICAR ESTRUTURA
# ============================================

Write-Host "1. Verificando estrutura do projeto..." -ForegroundColor Yellow

$requiredDirs = @(
    "apps\backend",
    "apps\web",
    "apps\web-aluno"
)

$allDirsExist = $true
foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Host "  ✅ $dir" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $dir não encontrado!" -ForegroundColor Red
        $allDirsExist = $false
    }
}

if (-not $allDirsExist) {
    Write-Host ""
    Write-Host "❌ Estrutura incompleta! Execute do diretório correto." -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================
# 2. VERIFICAR .ENV FILES
# ============================================

Write-Host "2. Verificando arquivos .env..." -ForegroundColor Yellow

if (Test-Path "apps\backend\.env") {
    Write-Host "  ✅ Backend .env existe" -ForegroundColor Green
    
    # Verificar variáveis essenciais
    $envContent = Get-Content "apps\backend\.env" -Raw
    
    if ($envContent -match "DATABASE_URL") {
        Write-Host "    ✅ DATABASE_URL configurado" -ForegroundColor Green
    } else {
        Write-Host "    ⚠️  DATABASE_URL não encontrado!" -ForegroundColor Yellow
    }
    
    if ($envContent -match "JWT_SECRET") {
        Write-Host "    ✅ JWT_SECRET configurado" -ForegroundColor Green
    } else {
        Write-Host "    ⚠️  JWT_SECRET não encontrado!" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  Backend .env não existe" -ForegroundColor Yellow
    Write-Host "    Crie apps\backend\.env com:" -ForegroundColor Gray
    Write-Host "    DATABASE_URL=postgresql://..." -ForegroundColor Gray
    Write-Host "    JWT_SECRET=seu_secret_aqui" -ForegroundColor Gray
}

Write-Host ""

# ============================================
# 3. TESTAR BACKEND
# ============================================

Write-Host "3. Testando Backend..." -ForegroundColor Yellow

# Verificar se backend já está rodando
if (Test-Port 3333) {
    Write-Host "  ✅ Backend já está rodando na porta 3333" -ForegroundColor Green
    
    # Testar health check
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3333/api/health" -Method GET -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ Health check OK" -ForegroundColor Green
            $content = $response.Content | ConvertFrom-Json
            Write-Host "    Status: $($content.status)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  ⚠️  Health check falhou" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  Backend não está rodando" -ForegroundColor Yellow
    Write-Host "    Execute em outro terminal:" -ForegroundColor Gray
    Write-Host "    cd apps\backend" -ForegroundColor Gray
    Write-Host "    npm run dev" -ForegroundColor Gray
}

Write-Host ""

# ============================================
# 4. TESTAR FRONTEND ADMIN
# ============================================

Write-Host "4. Testando Frontend Admin..." -ForegroundColor Yellow

if (Test-Port 3000) {
    Write-Host "  ✅ Frontend Admin rodando na porta 3000" -ForegroundColor Green
    Write-Host "    Acesse: http://localhost:3000/admin" -ForegroundColor Gray
} else {
    Write-Host "  ⚠️  Frontend Admin não está rodando" -ForegroundColor Yellow
    Write-Host "    Execute em outro terminal:" -ForegroundColor Gray
    Write-Host "    cd apps\web" -ForegroundColor Gray
    Write-Host "    npm run dev" -ForegroundColor Gray
}

Write-Host ""

# ============================================
# 5. TESTAR FRONTEND ALUNO
# ============================================

Write-Host "5. Testando Frontend Aluno..." -ForegroundColor Yellow

if (Test-Port 3001) {
    Write-Host "  ✅ Frontend Aluno rodando na porta 3001" -ForegroundColor Green
    Write-Host "    Acesse: http://localhost:3001" -ForegroundColor Gray
} else {
    Write-Host "  ⚠️  Frontend Aluno não está rodando" -ForegroundColor Yellow
    Write-Host "    Execute em outro terminal:" -ForegroundColor Gray
    Write-Host "    cd apps\web-aluno" -ForegroundColor Gray
    Write-Host "    npm run dev" -ForegroundColor Gray
}

Write-Host ""

# ============================================
# 6. RESUMO
# ============================================

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   RESUMO DO TESTE" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

$backendRunning = Test-Port 3333
$adminRunning = Test-Port 3000
$alunoRunning = Test-Port 3001

if ($backendRunning -and $adminRunning -and $alunoRunning) {
    Write-Host "🎉 TUDO FUNCIONANDO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Acesse:" -ForegroundColor White
    Write-Host "  Backend:       http://localhost:3333/api/health" -ForegroundColor Cyan
    Write-Host "  Admin:         http://localhost:3000/admin" -ForegroundColor Cyan
    Write-Host "  Aluno:         http://localhost:3001" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  ALGUNS SERVIÇOS NÃO ESTÃO RODANDO" -ForegroundColor Yellow
    Write-Host ""
    
    if (-not $backendRunning) {
        Write-Host "❌ Backend (3333)" -ForegroundColor Red
        Write-Host "   cd apps\backend && npm run dev" -ForegroundColor Gray
    }
    
    if (-not $adminRunning) {
        Write-Host "❌ Admin (3000)" -ForegroundColor Red
        Write-Host "   cd apps\web && npm run dev" -ForegroundColor Gray
    }
    
    if (-not $alunoRunning) {
        Write-Host "❌ Aluno (3001)" -ForegroundColor Red
        Write-Host "   cd apps\web-aluno && npm run dev" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# 7. TESTAR ENDPOINTS (SE BACKEND ESTIVER UP)
# ============================================

if ($backendRunning) {
    Write-Host "7. Testando Endpoints Principais..." -ForegroundColor Yellow
    Write-Host ""
    
    $endpoints = @(
        "/api/health",
        "/api/disciplines",
        "/api/drops",
        "/api/plans"
    )
    
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3333$endpoint" -Method GET -UseBasicParsing -ErrorAction Stop
            Write-Host "  ✅ $endpoint (200 OK)" -ForegroundColor Green
        } catch {
            $statusCode = $_.Exception.Response.StatusCode.value__
            if ($statusCode -eq 401) {
                Write-Host "  ⚠️  $endpoint (401 - Auth Required)" -ForegroundColor Yellow
            } else {
                Write-Host "  ❌ $endpoint ($statusCode)" -ForegroundColor Red
            }
        }
    }
    
    Write-Host ""
}

Write-Host "Script finalizado!" -ForegroundColor Cyan
Write-Host ""
