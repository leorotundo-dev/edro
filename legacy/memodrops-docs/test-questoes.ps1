# Script de Teste - Sistema de Questões
# PowerShell Script para testar todos os endpoints

param(
    [Parameter(Mandatory=$false)]
    [string]$BaseUrl = "http://localhost:3333"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE DO SISTEMA DE QUESTÕES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL Base: $BaseUrl" -ForegroundColor Yellow
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

# 1. Health Check
Write-Host "`n1. HEALTH CHECK" -ForegroundColor Cyan
Write-Host "----------------------------------------"
$health = Test-Endpoint -Name "Health" -Method "GET" -Url "$BaseUrl/health"

if ($health) {
    Write-Host "  Status: $($health.status)" -ForegroundColor Green
}

Start-Sleep -Seconds 1

# 2. Gerar 1 Questão
Write-Host "`n2. GERAR QUESTÃO" -ForegroundColor Cyan
Write-Host "----------------------------------------"
$body = @{
    topic = "Regência Verbal"
    discipline = "Português"
    examBoard = "CESPE"
    difficulty = 3
    context = "Teste automatizado"
    saveToDatabase = $true
} | ConvertTo-Json

Write-Host "Gerando questão CESPE..." -ForegroundColor Yellow
$question = Test-Endpoint -Name "Gerar Questão" -Method "POST" -Url "$BaseUrl/ai/questions/generate" -Body $body

if ($question -and $question.success) {
    $questionId = $question.data.questionId
    Write-Host "  ✓ Questão gerada: $questionId" -ForegroundColor Green
    Write-Host "  Tipo: $($question.data.question.question_type)" -ForegroundColor Gray
    Write-Host "  Alternativas: $($question.data.question.alternatives.Count)" -ForegroundColor Gray
    
    # Salvar ID para testes posteriores
    $global:QuestionId = $questionId
} else {
    Write-Host "  ✗ Falha ao gerar questão" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# 3. Listar Questões
Write-Host "`n3. LISTAR QUESTÕES" -ForegroundColor Cyan
Write-Host "----------------------------------------"
$questions = Test-Endpoint -Name "Listar" -Method "GET" -Url "$BaseUrl/questions?limit=5"

if ($questions -and $questions.success) {
    Write-Host "  Total: $($questions.data.total)" -ForegroundColor Green
    Write-Host "  Retornadas: $($questions.data.questions.Count)" -ForegroundColor Gray
}

Start-Sleep -Seconds 1

# 4. Estatísticas Admin
Write-Host "`n4. ESTATÍSTICAS ADMIN" -ForegroundColor Cyan
Write-Host "----------------------------------------"
$stats = Test-Endpoint -Name "Stats" -Method "GET" -Url "$BaseUrl/admin/questions/stats"

if ($stats -and $stats.success) {
    Write-Host "  Total: $($stats.data.total)" -ForegroundColor Green
    Write-Host "  Ativas: $($stats.data.active)" -ForegroundColor Gray
    Write-Host "  Rascunho: $($stats.data.draft)" -ForegroundColor Gray
    Write-Host "  IA: $($stats.data.aiGenerated)" -ForegroundColor Gray
}

Start-Sleep -Seconds 1

# 5. Buscar por ID (se temos um ID)
if ($global:QuestionId) {
    Write-Host "`n5. BUSCAR POR ID" -ForegroundColor Cyan
    Write-Host "----------------------------------------"
    $questionDetail = Test-Endpoint -Name "Buscar ID" -Method "GET" -Url "$BaseUrl/questions/$($global:QuestionId)"
    
    if ($questionDetail -and $questionDetail.success) {
        Write-Host "  ✓ Questão encontrada" -ForegroundColor Green
        Write-Host "  Status: $($questionDetail.data.question.status)" -ForegroundColor Gray
    }
    
    Start-Sleep -Seconds 1
}

# 6. Buscar por Conceito
Write-Host "`n6. BUSCAR POR CONCEITO" -ForegroundColor Cyan
Write-Host "----------------------------------------"
$search = Test-Endpoint -Name "Buscar Conceito" -Method "GET" -Url "$BaseUrl/questions/search?concept=regência&limit=3"

if ($search -and $search.success) {
    Write-Host "  Encontradas: $($search.data.count)" -ForegroundColor Green
}

Start-Sleep -Seconds 1

# 7. Gerar Batch (opcional - demora ~30s)
Write-Host "`n7. GERAR BATCH (Opcional)" -ForegroundColor Cyan
Write-Host "----------------------------------------"
Write-Host "Deseja gerar um batch de 3 questões? (demora ~30s)" -ForegroundColor Yellow
Write-Host "Digite 's' para sim ou qualquer tecla para pular: " -NoNewline
$confirm = Read-Host

if ($confirm -eq 's') {
    $batchBody = @{
        topic = "Concordância Verbal"
        discipline = "Português"
        examBoard = "FCC"
        difficulty = 3
        count = 3
        saveToDatabase = $true
    } | ConvertTo-Json
    
    Write-Host "Gerando 3 questões..." -ForegroundColor Yellow
    $batch = Test-Endpoint -Name "Batch" -Method "POST" -Url "$BaseUrl/ai/questions/generate-batch" -Body $batchBody
    
    if ($batch -and $batch.success) {
        Write-Host "  ✓ Batch gerado: $($batch.data.count) questões" -ForegroundColor Green
        Write-Host "  IDs: $($batch.data.questionIds -join ', ')" -ForegroundColor Gray
    }
} else {
    Write-Host "  Pulado" -ForegroundColor Gray
}

# Resumo Final
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
} else {
    Write-Host "⚠️  Alguns testes falharam. Verifique os logs acima." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
