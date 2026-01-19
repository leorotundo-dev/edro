# Script de Monitoramento - Deploy Railway
# Verifica status do backend automaticamente

Write-Host "Monitorando Deploy do MemoDrops Backend..." -ForegroundColor Cyan
Write-Host "" 

# Configuracao
$BACKEND_URL = "https://backend-production-61d0.up.railway.app"
$CHECK_INTERVAL = 10
$MAX_ATTEMPTS = 30

Write-Host "Backend URL: $BACKEND_URL" -ForegroundColor Yellow
Write-Host "Verificando a cada $CHECK_INTERVAL segundos..." -ForegroundColor Yellow
Write-Host ""

$attempt = 0
$success = $false

while (($attempt -lt $MAX_ATTEMPTS) -and (-not $success)) {
    $attempt++
    
    Write-Host "[$attempt/$MAX_ATTEMPTS] Verificando status..." -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri "$BACKEND_URL/" -Method GET -TimeoutSec 5 -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            Write-Host ""
            Write-Host "DEPLOY CONCLUIDO COM SUCESSO!" -ForegroundColor Green
            Write-Host "Backend esta online e respondendo!" -ForegroundColor Green
            Write-Host "Status Code: 200 OK" -ForegroundColor Green
            Write-Host ""
            Write-Host "Resposta:" -ForegroundColor Cyan
            Write-Host $response.Content
            Write-Host ""
            
            $success = $true
            
            Write-Host "Testando endpoints adicionais..." -ForegroundColor Cyan
            
            try {
                $usersResponse = Invoke-WebRequest -Uri "$BACKEND_URL/admin/users" -Method GET -TimeoutSec 5 -ErrorAction Stop
                Write-Host "  /admin/users: OK" -ForegroundColor Green
            } catch {
                Write-Host "  /admin/users: Erro" -ForegroundColor Yellow
            }
            
            try {
                $harvestResponse = Invoke-WebRequest -Uri "$BACKEND_URL/admin/harvest/items" -Method GET -TimeoutSec 5 -ErrorAction Stop
                Write-Host "  /admin/harvest/items: OK (Sem erro ESM!)" -ForegroundColor Green
            } catch {
                Write-Host "  /admin/harvest/items: Erro" -ForegroundColor Yellow
            }
            
            Write-Host ""
            Write-Host "BACKEND OPERACIONAL!" -ForegroundColor Green
            
            break
        }
    } catch {
        $errorMsg = $_.Exception.Message
        Write-Host "  Aguardando deploy..." -ForegroundColor Gray
        
        if ($attempt -lt $MAX_ATTEMPTS) {
            Start-Sleep -Seconds $CHECK_INTERVAL
        }
    }
}

if (-not $success) {
    Write-Host ""
    Write-Host "TIMEOUT: Deploy ainda nao completou" -ForegroundColor Yellow
    Write-Host "Acesse Railway Dashboard para ver logs" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Script finalizado: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
