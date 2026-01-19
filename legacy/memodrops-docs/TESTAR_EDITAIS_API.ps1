# Testar API de Editais no Railway

$BACKEND_URL = "https://memodropsbackend-production.up.railway.app"

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "   TESTANDO API DE EDITAIS" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend URL: $BACKEND_URL" -ForegroundColor Yellow
Write-Host ""

# Teste 1: Listar editais
Write-Host "[1/5] Testando GET /api/editais (listar todos)" -ForegroundColor Magenta
Write-Host "-------------------------------------------------------------" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "$BACKEND_URL/api/editais" -Method GET -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    Write-Host "[OK] Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "     Total de editais: $($data.count)" -ForegroundColor Cyan
    if ($data.data) {
        Write-Host "     Primeiros editais:" -ForegroundColor Cyan
        $data.data | Select-Object -First 3 | ForEach-Object {
            Write-Host "       - $($_.codigo): $($_.titulo)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "[ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Teste 2: Estatisticas
Write-Host "[2/5] Testando GET /api/editais-stats (estatisticas)" -ForegroundColor Magenta
Write-Host "-------------------------------------------------------------" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "$BACKEND_URL/api/editais-stats" -Method GET -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    Write-Host "[OK] Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "     Dados:" -ForegroundColor Cyan
    Write-Host "     $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "[ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Teste 3: Por status
Write-Host "[3/5] Testando GET /api/editais/reports/by-status" -ForegroundColor Magenta
Write-Host "-------------------------------------------------------------" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "$BACKEND_URL/api/editais/reports/by-status" -Method GET -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    Write-Host "[OK] Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "     Dados:" -ForegroundColor Cyan
    Write-Host "     $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "[ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Teste 4: Por banca
Write-Host "[4/5] Testando GET /api/editais/reports/by-banca" -ForegroundColor Magenta
Write-Host "-------------------------------------------------------------" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "$BACKEND_URL/api/editais/reports/by-banca" -Method GET -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    Write-Host "[OK] Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "     Dados:" -ForegroundColor Cyan
    Write-Host "     $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "[ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Teste 5: Proximas provas
Write-Host "[5/5] Testando GET /api/editais/reports/proximas-provas" -ForegroundColor Magenta
Write-Host "-------------------------------------------------------------" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "$BACKEND_URL/api/editais/reports/proximas-provas?limit=5" -Method GET -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    Write-Host "[OK] Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "     Total: $($data.count)" -ForegroundColor Cyan
    if ($data.data) {
        Write-Host "     Proximas provas:" -ForegroundColor Cyan
        $data.data | ForEach-Object {
            Write-Host "       - $($_.titulo) em $($_.data_prova_prevista)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "[ERRO] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "Testes concluidos!" -ForegroundColor White
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para criar um edital de teste:" -ForegroundColor Yellow
Write-Host '  $body = @{' -ForegroundColor Cyan
Write-Host '    codigo = "TEST-2024"' -ForegroundColor Cyan
Write-Host '    titulo = "Edital de Teste"' -ForegroundColor Cyan
Write-Host '    orgao = "Orgao Teste"' -ForegroundColor Cyan
Write-Host '    status = "rascunho"' -ForegroundColor Cyan
Write-Host '    numero_vagas = 10' -ForegroundColor Cyan
Write-Host '  } | ConvertTo-Json' -ForegroundColor Cyan
Write-Host '  Invoke-WebRequest -Uri "$BACKEND_URL/api/editais" -Method POST -Body $body -ContentType "application/json"' -ForegroundColor Cyan
Write-Host ""
