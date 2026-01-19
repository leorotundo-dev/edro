# Monitor de Progresso do Auto-Fix

Write-Host "MONITOR DE PROGRESSO - Auto-Fix Deploy" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

$BACKEND_URL = "https://backend-production-61d0.up.railway.app"

while ($true) {
    Clear-Host
    
    Write-Host "MONITOR DE PROGRESSO - $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Cyan
    Write-Host "=======================================" -ForegroundColor Cyan
    Write-Host ""
    
    # 1. Status do Backend
    Write-Host "1. STATUS DO BACKEND:" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$BACKEND_URL/" -Method GET -TimeoutSec 3 -ErrorAction Stop
        Write-Host "   STATUS: ONLINE" -ForegroundColor Green
        Write-Host "   Code: $($response.StatusCode)" -ForegroundColor Green
        Write-Host ""
        Write-Host "   DEPLOY FUNCIONOU!" -ForegroundColor Green
        Write-Host "   Pressione Ctrl+C para sair" -ForegroundColor Gray
    } catch {
        Write-Host "   STATUS: OFFLINE (aguardando deploy...)" -ForegroundColor Gray
    }
    Write-Host ""
    
    # 2. Ultimos Commits
    Write-Host "2. ULTIMOS COMMITS:" -ForegroundColor Yellow
    $commits = git log --oneline -5
    $commits | ForEach-Object {
        if ($_ -like "*fix:*") {
            Write-Host "   $_" -ForegroundColor Yellow
        } else {
            Write-Host "   $_" -ForegroundColor Gray
        }
    }
    Write-Host ""
    
    # 3. Processos PowerShell Rodando
    Write-Host "3. PROCESSOS ATIVOS:" -ForegroundColor Yellow
    $processes = Get-Process powershell -ErrorAction SilentlyContinue
    Write-Host "   Total de processos PowerShell: $($processes.Count)" -ForegroundColor Gray
    Write-Host ""
    
    # 4. Proxima verificacao
    Write-Host "Proxima atualizacao em 10 segundos..." -ForegroundColor DarkGray
    Write-Host "Pressione Ctrl+C para sair" -ForegroundColor DarkGray
    
    Start-Sleep -Seconds 10
}
