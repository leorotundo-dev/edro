da# 🧪 Script para Testar Endpoints da Dashboard Admin

$baseUrl = "https://memodropsweb-production.up.railway.app"

Write-Host "🚀 TESTANDO ENDPOINTS DA DASHBOARD ADMIN" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor Gray
Write-Host ""

# Array de endpoints para testar
$endpoints = @(
    @{ Name = "Health Check"; Url = "/" },
    @{ Name = "Overview Métricas"; Url = "/admin/metrics/overview" },
    @{ Name = "Usuários"; Url = "/admin/users" },
    @{ Name = "Disciplinas"; Url = "/api/disciplines" },
    @{ Name = "Drops"; Url = "/admin/drops" },
    @{ Name = "Blueprints"; Url = "/admin/blueprints" },
    @{ Name = "Harvest Items"; Url = "/admin/harvest/items" },
    @{ Name = "RAG Blocks"; Url = "/admin/rag/blocks" },
    @{ Name = "Custos Overview"; Url = "/admin/costs/real/overview" },
    @{ Name = "Editais"; Url = "/api/editais" },
    @{ Name = "Questões"; Url = "/api/questions" },
    @{ Name = "Simulados"; Url = "/api/simulados" }
)

foreach ($endpoint in $endpoints) {
    Write-Host "📡 Testando: " -NoNewline -ForegroundColor Yellow
    Write-Host $endpoint.Name -ForegroundColor White
    Write-Host "   URL: $($endpoint.Url)" -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl$($endpoint.Url)" -Method Get -ErrorAction Stop
        
        # Verificar se tem dados
        if ($response.items) {
            $count = $response.items.Count
            Write-Host "   ✅ " -NoNewline -ForegroundColor Green
            Write-Host "Sucesso! $count item(s) encontrado(s)" -ForegroundColor Green
            
            # Mostrar primeiro item se existir
            if ($count -gt 0) {
                Write-Host "   📄 Primeiro item:" -ForegroundColor Cyan
                $response.items[0] | ConvertTo-Json -Depth 2 -Compress | Write-Host -ForegroundColor Gray
            }
        } elseif ($response.success -ne $null) {
            Write-Host "   ✅ " -NoNewline -ForegroundColor Green
            Write-Host "Sucesso! " -NoNewline -ForegroundColor Green
            $response | ConvertTo-Json -Depth 2 -Compress | Write-Host -ForegroundColor Gray
        } else {
            Write-Host "   ✅ " -NoNewline -ForegroundColor Green
            Write-Host "Sucesso! " -NoNewline -ForegroundColor Green
            $response | ConvertTo-Json -Depth 2 -Compress | Write-Host -ForegroundColor Gray
        }
    } catch {
        Write-Host "   ❌ " -NoNewline -ForegroundColor Red
        Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Start-Sleep -Milliseconds 500
}

Write-Host "✅ Teste completo!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 RESUMO:" -ForegroundColor Cyan
Write-Host "Para ver todos os endpoints disponíveis, abra:" -ForegroundColor White
Write-Host "  ENDPOINTS_DASHBOARD_ADMIN.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para dashboard visual, execute:" -ForegroundColor White
Write-Host "  DEPLOY_AGORA.md (passo a passo)" -ForegroundColor Yellow
