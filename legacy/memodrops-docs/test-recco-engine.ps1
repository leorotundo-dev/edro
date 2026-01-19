# Script de Teste - ReccoEngine V3
# Testa todos os endpoints e funcionalidades

param(
    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = "http://localhost:3333",
    
    [Parameter(Mandatory=$false)]
    [string]$UserId = "test-user-123"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE DO RECCOENGINE V3" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL Base: $BaseUrl" -ForegroundColor Yellow
Write-Host "User ID: $UserId" -ForegroundColor Yellow
Write-Host ""

$ErrorCount = 0
$SuccessCount = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [string]$Body = $null
    )
    
    Write-Host "[$Name]" -ForegroundColor White -NoNewline
    Write-Host " Testando..." -NoNewline
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($Body) {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $headers -Body $Body -ErrorAction Stop
        } else {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $headers -ErrorAction Stop
        }
        
        Write-Host " ✓" -ForegroundColor Green
        $script:SuccessCount++
        return $response
    } catch {
        Write-Host " ✗" -ForegroundColor Red
        Write-Host "  Erro: $($_.Exception.Message)" -ForegroundColor Red
        $script:ErrorCount++
        return $null
    }
}

Write-Host "INICIANDO TESTES..." -ForegroundColor Cyan
Write-Host ""

# ============================================
# 1. DIAGNÓSTICO
# ============================================
Write-Host "`n1. DIAGNÓSTICO COMPLETO" -ForegroundColor Cyan
Write-Host "----------------------------------------"
$diagnosis = Test-Endpoint -Name "Diagnosis" -Method "GET" -Url "$BaseUrl/recco/diagnosis/$UserId"

if ($diagnosis -and $diagnosis.success) {
    Write-Host "  Estado Cognitivo: $($diagnosis.data.estado_cognitivo)" -ForegroundColor Gray
    Write-Host "  Estado Emocional: $($diagnosis.data.estado_emocional)" -ForegroundColor Gray
    Write-Host "  Estado Pedagógico: $($diagnosis.data.estado_pedagogico)" -ForegroundColor Gray
    Write-Host "  Prob. Acerto: $([math]::Round($diagnosis.data.prob_acerto * 100, 1))%" -ForegroundColor Gray
    Write-Host "  Prob. Retenção: $([math]::Round($diagnosis.data.prob_retencao * 100, 1))%" -ForegroundColor Gray
    Write-Host "  Prob. Saturação: $([math]::Round($diagnosis.data.prob_saturacao * 100, 1))%" -ForegroundColor Gray
    Write-Host "  Tempo Ótimo: $($diagnosis.data.tempo_otimo_estudo) min" -ForegroundColor Gray
}

Start-Sleep -Seconds 2

# ============================================
# 2. PRIORIDADES
# ============================================
Write-Host "`n2. CÁLCULO DE PRIORIDADES" -ForegroundColor Cyan
Write-Host "----------------------------------------"
$priorities = Test-Endpoint -Name "Priorities" -Method "GET" -Url "$BaseUrl/recco/priorities/$UserId"

if ($priorities -and $priorities.success) {
    Write-Host "  Urgência Edital: $($priorities.data.urgencia_edital)/10" -ForegroundColor Gray
    Write-Host "  Peso Banca: $($priorities.data.peso_banca)/10" -ForegroundColor Gray
    Write-Host "  Proximidade Prova: $($priorities.data.proximidade_prova)/10" -ForegroundColor Gray
    Write-Host "  Fraquezas Críticas: $($priorities.data.fraquezas_criticas)/10" -ForegroundColor Gray
    Write-Host "  Total Prioridades: $($priorities.data.lista_priorizada.Count)" -ForegroundColor Gray
    
    if ($priorities.data.lista_priorizada.Count -gt 0) {
        Write-Host "`n  Top 3 Prioridades:" -ForegroundColor Yellow
        for ($i = 0; $i -lt [Math]::Min(3, $priorities.data.lista_priorizada.Count); $i++) {
            $p = $priorities.data.lista_priorizada[$i]
            Write-Host "    $($i+1). $($p.action) (score: $($p.score))" -ForegroundColor Gray
        }
    }
}

Start-Sleep -Seconds 2

# ============================================
# 3. TRILHA DIÁRIA
# ============================================
Write-Host "`n3. TRILHA DIÁRIA" -ForegroundColor Cyan
Write-Host "----------------------------------------"
$dailyTrail = Test-Endpoint -Name "Daily Trail" -Method "GET" -Url "$BaseUrl/recco/trail/daily/$UserId"

if ($dailyTrail -and $dailyTrail.success) {
    Write-Host "  Itens: $($dailyTrail.data.items.Count)" -ForegroundColor Gray
    Write-Host "  Duração Total: $($dailyTrail.data.total_duration_minutes) min" -ForegroundColor Gray
    Write-Host "  Curva: $($dailyTrail.data.difficulty_curve)" -ForegroundColor Gray
    
    if ($dailyTrail.data.items.Count -gt 0) {
        Write-Host "`n  Primeiros 3 itens:" -ForegroundColor Yellow
        for ($i = 0; $i -lt [Math]::Min(3, $dailyTrail.data.items.Count); $i++) {
            $item = $dailyTrail.data.items[$i]
            Write-Host "    $($i+1). $($item.type) - $($item.duration_minutes)min (dif: $($item.difficulty))" -ForegroundColor Gray
        }
    }
}

Start-Sleep -Seconds 2

# ============================================
# 4. TRILHA PERSONALIZADA
# ============================================
Write-Host "`n4. TRILHA PERSONALIZADA" -ForegroundColor Cyan
Write-Host "----------------------------------------"
$body = @{
    user_id = $UserId
    tempo_disponivel = 60
    dias_ate_prova = 30
    banca_preferencial = "CESPE"
} | ConvertTo-Json

$customTrail = Test-Endpoint -Name "Custom Trail" -Method "POST" -Url "$BaseUrl/recco/trail/generate" -Body $body

if ($customTrail -and $customTrail.success) {
    Write-Host "  ✓ Trilha gerada com sucesso!" -ForegroundColor Green
    Write-Host "  Itens: $($customTrail.data.trail.items.Count)" -ForegroundColor Gray
    Write-Host "  Duração: $($customTrail.data.trail.total_duration_minutes) min" -ForegroundColor Gray
    Write-Host "  Tempo Processamento: $($customTrail.data.metadata.processing_time_ms)ms" -ForegroundColor Gray
}

Start-Sleep -Seconds 2

# ============================================
# 5. ÚLTIMA TRILHA
# ============================================
Write-Host "`n5. BUSCAR ÚLTIMA TRILHA" -ForegroundColor Cyan
Write-Host "----------------------------------------"
$latestTrail = Test-Endpoint -Name "Latest Trail" -Method "GET" -Url "$BaseUrl/recco/trail/latest/$UserId"

if ($latestTrail -and $latestTrail.success) {
    Write-Host "  ✓ Última trilha encontrada" -ForegroundColor Green
    Write-Host "  Data: $($latestTrail.data.generated_at)" -ForegroundColor Gray
}

Start-Sleep -Seconds 1

# ============================================
# 6. FEEDBACK
# ============================================
Write-Host "`n6. REGISTRAR FEEDBACK" -ForegroundColor Cyan
Write-Host "----------------------------------------"
$feedbackBody = @{
    user_id = $UserId
    aluno_completou = $true
    aluno_satisfeito = $true
    tempo_real = 45
    tempo_previsto = 60
    ajuste_sugerido = "Reduzir tempo estimado em 25%"
} | ConvertTo-Json

$feedback = Test-Endpoint -Name "Feedback" -Method "POST" -Url "$BaseUrl/recco/feedback" -Body $feedbackBody

if ($feedback -and $feedback.success) {
    Write-Host "  ✓ Feedback registrado!" -ForegroundColor Green
}

Start-Sleep -Seconds 1

# ============================================
# 7. BUSCAR FEEDBACKS
# ============================================
Write-Host "`n7. BUSCAR FEEDBACKS DO USUÁRIO" -ForegroundColor Cyan
Write-Host "----------------------------------------"
$userFeedbacks = Test-Endpoint -Name "Get Feedbacks" -Method "GET" -Url "$BaseUrl/recco/feedback/$UserId"

if ($userFeedbacks -and $userFeedbacks.success) {
    Write-Host "  Total: $($userFeedbacks.data.Count) feedbacks" -ForegroundColor Gray
}

Start-Sleep -Seconds 1

# ============================================
# 8. ESTADO DO USUÁRIO
# ============================================
Write-Host "`n8. BUSCAR ESTADO SALVO" -ForegroundColor Cyan
Write-Host "----------------------------------------"
$state = Test-Endpoint -Name "State" -Method "GET" -Url "$BaseUrl/recco/state/$UserId"

if ($state -and $state.success) {
    Write-Host "  ✓ Estado encontrado" -ForegroundColor Green
    Write-Host "  Cognitivo: $($state.data.estado_cognitivo)" -ForegroundColor Gray
    Write-Host "  Emocional: $($state.data.estado_emocional)" -ForegroundColor Gray
    Write-Host "  Pedagógico: $($state.data.estado_pedagogico)" -ForegroundColor Gray
}

Start-Sleep -Seconds 1

# ============================================
# 9. STATS ADMIN
# ============================================
Write-Host "`n9. ESTATÍSTICAS ADMIN" -ForegroundColor Cyan
Write-Host "----------------------------------------"
$stats = Test-Endpoint -Name "Admin Stats" -Method "GET" -Url "$BaseUrl/recco/admin/stats"

if ($stats -and $stats.success) {
    Write-Host "  Versão: $($stats.data.version)" -ForegroundColor Gray
    Write-Host "  Status: $($stats.data.status)" -ForegroundColor Gray
}

Start-Sleep -Seconds 1

# ============================================
# 10. TESTE COMPLETO
# ============================================
Write-Host "`n10. TESTE COMPLETO DO MOTOR" -ForegroundColor Cyan
Write-Host "----------------------------------------"
$testComplete = Test-Endpoint -Name "Test Complete" -Method "POST" -Url "$BaseUrl/recco/admin/test/$UserId"

if ($testComplete -and $testComplete.success) {
    Write-Host "  ✓ Teste completo passou!" -ForegroundColor Green
    Write-Host "  Itens na trilha: $($testComplete.data.trail_items)" -ForegroundColor Gray
    Write-Host "  Duração: $($testComplete.data.total_duration) min" -ForegroundColor Gray
    Write-Host "  Processamento: $($testComplete.data.processing_time)ms" -ForegroundColor Gray
}

# ============================================
# RESUMO FINAL
# ============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESUMO DOS TESTES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Sucessos: " -NoNewline
Write-Host "$SuccessCount" -ForegroundColor Green
Write-Host "Falhas: " -NoNewline
Write-Host "$ErrorCount" -ForegroundColor Red
Write-Host ""

if ($ErrorCount -eq 0) {
    Write-Host "🎉 TODOS OS TESTES PASSARAM!" -ForegroundColor Green
    Write-Host ""
    Write-Host "ReccoEngine V3 está 100% funcional!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Alguns testes falharam." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Verifique:" -ForegroundColor Yellow
    Write-Host "  1. Servidor está rodando?" -ForegroundColor Gray
    Write-Host "  2. Usuário tem dados de tracking?" -ForegroundColor Gray
    Write-Host "  3. Banco tem drops/questões?" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
