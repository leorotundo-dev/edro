# Auto-Fix Deploy Script
# Monitora deploy e aplica correcoes automaticamente ate funcionar

Write-Host "AUTO-FIX DEPLOY - MemoDrops Backend" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$BACKEND_URL = "https://backend-production-61d0.up.railway.app"
$MAX_DEPLOY_ATTEMPTS = 5
$CHECK_INTERVAL = 15
$CHECKS_PER_DEPLOY = 20

# Funcao para verificar se backend esta online
function Test-Backend {
    try {
        $response = Invoke-WebRequest -Uri "$BACKEND_URL/" -Method GET -TimeoutSec 5 -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Funcao para aplicar correcao e fazer commit
function Apply-Fix {
    param (
        [string]$FixName,
        [string]$CommitMessage,
        [scriptblock]$FixScript
    )
    
    Write-Host ""
    Write-Host "Aplicando correcao: $FixName" -ForegroundColor Yellow
    Write-Host "------------------------------------" -ForegroundColor Yellow
    
    & $FixScript
    
    Write-Host "Fazendo commit e push..." -ForegroundColor Yellow
    git add -A
    git commit -m $CommitMessage
    git push origin main
    
    Write-Host "Correcao aplicada! Aguardando novo deploy..." -ForegroundColor Green
    Write-Host ""
}

# Tentativa 1: Verificar deploy atual
Write-Host "[TENTATIVA 1] Verificando deploy atual..." -ForegroundColor Cyan
Write-Host ""

$checks = 0
$success = $false

while ($checks -lt $CHECKS_PER_DEPLOY -and -not $success) {
    $checks++
    Write-Host "  Check $checks/$CHECKS_PER_DEPLOY..." -ForegroundColor Gray
    
    if (Test-Backend) {
        Write-Host ""
        Write-Host "SUCESSO! Backend esta online!" -ForegroundColor Green
        Write-Host ""
        $success = $true
        break
    }
    
    Start-Sleep -Seconds $CHECK_INTERVAL
}

if ($success) {
    Write-Host "Deploy concluido com sucesso!" -ForegroundColor Green
    exit 0
}

# Se falhou, aplicar correcoes automaticas

# CORRECAO 1: Downgrade node-fetch para v2
Write-Host "[CORRECAO 1] Downgrade node-fetch para v2 (CommonJS)" -ForegroundColor Yellow

Apply-Fix -FixName "Downgrade node-fetch" -CommitMessage "fix: downgrade node-fetch to v2 for CommonJS compatibility" -FixScript {
    Set-Location "apps/backend"
    
    # Remove node-fetch atual
    pnpm remove node-fetch
    
    # Instala versao 2.x (CommonJS)
    pnpm add node-fetch@2.7.0
    
    # Reverte fetchHtml.ts para import simples
    $fetchHtmlPath = "src/adapters/harvest/fetchHtml.ts"
    $content = @"
import fetch from 'node-fetch';

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(``[harvest] Erro ao buscar URL `${url}: `${res.status} `${res.statusText}``);
  }
  return await res.text();
}
"@
    Set-Content -Path $fetchHtmlPath -Value $content
    
    Set-Location "../.."
}

# Aguardar novo deploy
Write-Host "Aguardando deploy da CORRECAO 1..." -ForegroundColor Cyan
Start-Sleep -Seconds 60

$checks = 0
$success = $false

while ($checks -lt $CHECKS_PER_DEPLOY -and -not $success) {
    $checks++
    Write-Host "  Check $checks/$CHECKS_PER_DEPLOY..." -ForegroundColor Gray
    
    if (Test-Backend) {
        Write-Host ""
        Write-Host "SUCESSO! CORRECAO 1 funcionou!" -ForegroundColor Green
        Write-Host ""
        $success = $true
        break
    }
    
    Start-Sleep -Seconds $CHECK_INTERVAL
}

if ($success) {
    Write-Host "Deploy concluido com sucesso apos CORRECAO 1!" -ForegroundColor Green
    exit 0
}

# CORRECAO 2: Remover dependencia de harvest temporariamente
Write-Host "[CORRECAO 2] Desabilitar rotas de harvest temporariamente" -ForegroundColor Yellow

Apply-Fix -FixName "Disable harvest routes" -CommitMessage "fix: temporarily disable harvest routes" -FixScript {
    Set-Location "apps/backend"
    
    # Comentar import de harvest nas rotas
    $indexPath = "src/routes/index.ts"
    $content = Get-Content $indexPath -Raw
    $content = $content -replace "import harvestRoutes from './harvest';", "// import harvestRoutes from './harvest';"
    $content = $content -replace "app.register\(harvestRoutes\);", "// app.register(harvestRoutes);"
    Set-Content -Path $indexPath -Value $content
    
    Set-Location "../.."
}

# Aguardar novo deploy
Write-Host "Aguardando deploy da CORRECAO 2..." -ForegroundColor Cyan
Start-Sleep -Seconds 60

$checks = 0
$success = $false

while ($checks -lt $CHECKS_PER_DEPLOY -and -not $success) {
    $checks++
    Write-Host "  Check $checks/$CHECKS_PER_DEPLOY..." -ForegroundColor Gray
    
    if (Test-Backend) {
        Write-Host ""
        Write-Host "SUCESSO! CORRECAO 2 funcionou!" -ForegroundColor Green
        Write-Host ""
        $success = $true
        break
    }
    
    Start-Sleep -Seconds $CHECK_INTERVAL
}

if ($success) {
    Write-Host "Deploy concluido com sucesso apos CORRECAO 2!" -ForegroundColor Green
    exit 0
}

# CORRECAO 3: Usar axios ao inves de node-fetch
Write-Host "[CORRECAO 3] Substituir node-fetch por axios" -ForegroundColor Yellow

Apply-Fix -FixName "Replace with axios" -CommitMessage "fix: replace node-fetch with axios" -FixScript {
    Set-Location "apps/backend"
    
    # Remove node-fetch
    pnpm remove node-fetch
    
    # Instala axios
    pnpm add axios
    
    # Atualiza fetchHtml.ts
    $fetchHtmlPath = "src/adapters/harvest/fetchHtml.ts"
    $content = @"
import axios from 'axios';

export async function fetchHtml(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return response.data;
  } catch (error: any) {
    throw new Error(``[harvest] Erro ao buscar URL `${url}: `${error.message}``);
  }
}
"@
    Set-Content -Path $fetchHtmlPath -Value $content
    
    # Reabilitar rotas de harvest
    $indexPath = "src/routes/index.ts"
    $content = Get-Content $indexPath -Raw
    $content = $content -replace "// import harvestRoutes from './harvest';", "import harvestRoutes from './harvest';"
    $content = $content -replace "// app.register\(harvestRoutes\);", "app.register(harvestRoutes);"
    Set-Content -Path $indexPath -Value $content
    
    Set-Location "../.."
}

# Aguardar novo deploy
Write-Host "Aguardando deploy da CORRECAO 3..." -ForegroundColor Cyan
Start-Sleep -Seconds 60

$checks = 0
$success = $false

while ($checks -lt $CHECKS_PER_DEPLOY -and -not $success) {
    $checks++
    Write-Host "  Check $checks/$CHECKS_PER_DEPLOY..." -ForegroundColor Gray
    
    if (Test-Backend) {
        Write-Host ""
        Write-Host "SUCESSO! CORRECAO 3 funcionou!" -ForegroundColor Green
        Write-Host ""
        $success = $true
        break
    }
    
    Start-Sleep -Seconds $CHECK_INTERVAL
}

if ($success) {
    Write-Host "Deploy concluido com sucesso apos CORRECAO 3!" -ForegroundColor Green
    exit 0
}

# CORRECAO 4: Usar built-in https module
Write-Host "[CORRECAO 4] Usar modulo nativo https do Node.js" -ForegroundColor Yellow

Apply-Fix -FixName "Use native https" -CommitMessage "fix: use native Node.js https module" -FixScript {
    Set-Location "apps/backend"
    
    # Remove axios
    pnpm remove axios
    
    # Atualiza fetchHtml.ts para usar https nativo
    $fetchHtmlPath = "src/adapters/harvest/fetchHtml.ts"
    $content = @"
import https from 'https';

export async function fetchHtml(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(``[harvest] Erro ao buscar URL `${url}: `${res.statusCode} `${res.statusMessage}``));
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', (err) => {
      reject(new Error(``[harvest] Erro ao buscar URL `${url}: `${err.message}``));
    });
  });
}
"@
    Set-Content -Path $fetchHtmlPath -Value $content
    
    Set-Location "../.."
}

# Aguardar novo deploy
Write-Host "Aguardando deploy da CORRECAO 4..." -ForegroundColor Cyan
Start-Sleep -Seconds 60

$checks = 0
$success = $false

while ($checks -lt $CHECKS_PER_DEPLOY -and -not $success) {
    $checks++
    Write-Host "  Check $checks/$CHECKS_PER_DEPLOY..." -ForegroundColor Gray
    
    if (Test-Backend) {
        Write-Host ""
        Write-Host "SUCESSO! CORRECAO 4 funcionou!" -ForegroundColor Green
        Write-Host ""
        $success = $true
        break
    }
    
    Start-Sleep -Seconds $CHECK_INTERVAL
}

if ($success) {
    Write-Host "Deploy concluido com sucesso apos CORRECAO 4!" -ForegroundColor Green
    exit 0
}

# Se chegou aqui, nenhuma correcao funcionou
Write-Host ""
Write-Host "TODAS AS CORRECOES FALHARAM" -ForegroundColor Red
Write-Host ""
Write-Host "Proximos passos manuais:" -ForegroundColor Yellow
Write-Host "1. Acesse Railway Dashboard" -ForegroundColor White
Write-Host "2. Veja os logs completos do deploy" -ForegroundColor White
Write-Host "3. Procure por erros especificos" -ForegroundColor White
Write-Host "4. Verifique variaveis de ambiente" -ForegroundColor White
Write-Host ""
exit 1
