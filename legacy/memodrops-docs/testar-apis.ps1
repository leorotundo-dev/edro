# Script de Teste de APIs - MemoDrops Dashboard
# Testa todas as integrações de API

Write-Host "🧪 TESTANDO APIS DO MEMODROPS DASHBOARD" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$backendUrl = "http://localhost:3001"
$frontendUrl = "http://localhost:3000"

# Função para testar endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$ExpectedStatus = "200"
    )
    
    Write-Host "📡 Testando: $Name" -ForegroundColor Yellow
    Write-Host "   URL: $Url" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 5 -UseBasicParsing
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host "   ✅ SUCESSO - Status $($response.StatusCode)" -ForegroundColor Green
            
            # Parse JSON if possible
            try {
                $json = $response.Content | ConvertFrom-Json
                Write-Host "   📦 Response: $($json | ConvertTo-Json -Compress -Depth 1)" -ForegroundColor Gray
            } catch {
                Write-Host "   📦 Response: Non-JSON content" -ForegroundColor Gray
            }
            
            return $true
        } else {
            Write-Host "   ❌ FALHOU - Status $($response.StatusCode)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "   ❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    
    Write-Host ""
}

# Contadores
$total = 0
$passed = 0
$failed = 0

Write-Host "🔍 FASE 1: TESTANDO BACKEND" -ForegroundColor Magenta
Write-Host "=============================" -ForegroundColor Magenta
Write-Host ""

# Health Check
$total++
if (Test-Endpoint -Name "Health Check" -Url "$backendUrl/health") {
    $passed++
} else {
    $failed++
}

# Analytics API
$total++
if (Test-Endpoint -Name "Analytics - Metrics Overview" -Url "$backendUrl/admin/metrics/overview") {
    $passed++
} else {
    $failed++
}

# ReccoEngine API
$total++
if (Test-Endpoint -Name "ReccoEngine - Admin Stats" -Url "$backendUrl/recco/admin/stats") {
    $passed++
} else {
    $failed++
}

# Drops API
$total++
if (Test-Endpoint -Name "Drops - List" -Url "$backendUrl/drops") {
    $passed++
} else {
    $failed++
}

# Users API
$total++
if (Test-Endpoint -Name "Users - List" -Url "$backendUrl/admin/users") {
    $passed++
} else {
    $failed++
}

# Questions API
$total++
if (Test-Endpoint -Name "Questions - List" -Url "$backendUrl/questions") {
    $passed++
} else {
    $failed++
}

# Simulados API
$total++
if (Test-Endpoint -Name "Simulados - List" -Url "$backendUrl/simulados") {
    $passed++
} else {
    $failed++
}

# Editais API
$total++
if (Test-Endpoint -Name "Editais - List" -Url "$backendUrl/editais") {
    $passed++
} else {
    $failed++
}

Write-Host ""
Write-Host "🔍 FASE 2: TESTANDO FRONTEND (se estiver rodando)" -ForegroundColor Magenta
Write-Host "=====================================================" -ForegroundColor Magenta
Write-Host ""

# Frontend Health
$total++
if (Test-Endpoint -Name "Frontend - Home" -Url $frontendUrl) {
    $passed++
} else {
    $failed++
    Write-Host "   ℹ️  Frontend pode não estar rodando" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📊 RESULTADO DOS TESTES" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total de testes: $total" -ForegroundColor White
Write-Host "✅ Passou: $passed" -ForegroundColor Green
Write-Host "❌ Falhou: $failed" -ForegroundColor Red
Write-Host ""

# Calcular porcentagem
$percentage = [math]::Round(($passed / $total) * 100, 1)

if ($percentage -eq 100) {
    Write-Host "🎉 PERFEITO! 100% dos testes passaram!" -ForegroundColor Green
    Write-Host "✨ Sistema 100% operacional!" -ForegroundColor Green
} elseif ($percentage -ge 80) {
    Write-Host "👍 BOM! $percentage% dos testes passaram!" -ForegroundColor Yellow
    Write-Host "⚠️  Alguns endpoints podem precisar de atenção" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  ATENÇÃO! Apenas $percentage% dos testes passaram!" -ForegroundColor Red
    Write-Host "🔧 Verifique se o backend está rodando" -ForegroundColor Red
}

Write-Host ""
Write-Host "💡 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host ""

if ($failed -gt 0) {
    Write-Host "1. Certifique-se que o backend está rodando:" -ForegroundColor White
    Write-Host "   cd memodrops-main\apps\backend" -ForegroundColor Gray
    Write-Host "   npm run dev" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Certifique-se que o frontend está rodando:" -ForegroundColor White
    Write-Host "   cd memodrops-main\apps\web" -ForegroundColor Gray
    Write-Host "   npm run dev" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Verifique se o PostgreSQL está rodando" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "✅ Tudo funcionando!" -ForegroundColor Green
    Write-Host "🌐 Acesse o dashboard:" -ForegroundColor White
    Write-Host "   http://localhost:3000/admin" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 Teste as novas páginas:" -ForegroundColor White
    Write-Host "   http://localhost:3000/admin/analytics" -ForegroundColor Cyan
    Write-Host "   http://localhost:3000/admin/recco-engine" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✨ Teste concluído!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
