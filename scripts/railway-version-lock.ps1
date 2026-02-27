param(
  [ValidateSet('set', 'check', 'show')]
  [string]$Mode = 'check',
  [string]$WebService = 'edro-web',
  [string]$BackendService = 'edro-backend',
  [string]$LockFile = '.railway-version-lock.json'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $PSCommandPath
$repoRoot = (Resolve-Path (Join-Path $scriptDir '..')).Path
if (-not [System.IO.Path]::IsPathRooted($LockFile)) {
  $LockFile = Join-Path $repoRoot $LockFile
}

function Get-DeploymentInfo {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Service
  )

  $raw = railway deployment list --service $Service --limit 1 2>$null
  $line = ($raw -split "`r?`n" | Where-Object { $_ -match '[0-9a-fA-F-]{36}\s+\|\s+[A-Z]+' } | Select-Object -First 1)
  if (-not $line) {
    throw "Nao foi possivel ler deployment do servico '$Service'. Rode 'railway status' e valide o link do projeto."
  }

  $match = [regex]::Match($line, '(?<id>[0-9a-fA-F-]{36})\s+\|\s+(?<status>[A-Z]+)\s+\|')
  if (-not $match.Success) {
    throw "Formato inesperado do railway deployment list para '$Service'."
  }

  return [pscustomobject]@{
    service = $Service
    deployment_id = $match.Groups['id'].Value
    status = $match.Groups['status'].Value
  }
}

function Write-LockFile {
  $web = Get-DeploymentInfo -Service $WebService
  $backend = Get-DeploymentInfo -Service $BackendService

  $data = [ordered]@{
    generated_at = (Get-Date).ToString('s')
    web = $web
    backend = $backend
  }

  $json = $data | ConvertTo-Json -Depth 4
  Set-Content -LiteralPath $LockFile -Value $json -Encoding UTF8

  Write-Host "LOCK SALVO"
  Write-Host "web:     $($web.deployment_id) ($($web.status))"
  Write-Host "backend: $($backend.deployment_id) ($($backend.status))"
}

function Check-LockFile {
  if (-not (Test-Path -LiteralPath $LockFile)) {
    throw "Arquivo de lock nao encontrado: $LockFile. Rode com -Mode set."
  }

  $saved = Get-Content -LiteralPath $LockFile -Raw | ConvertFrom-Json
  $currentWeb = Get-DeploymentInfo -Service $WebService
  $currentBackend = Get-DeploymentInfo -Service $BackendService

  $ok = $true

  if ($saved.web.deployment_id -ne $currentWeb.deployment_id) {
    $ok = $false
    Write-Host "ALERTA: WEB foi sobrescrito."
    Write-Host "esperado: $($saved.web.deployment_id)"
    Write-Host "atual:    $($currentWeb.deployment_id)"
  } else {
    Write-Host "OK: WEB preservado ($($currentWeb.deployment_id))."
  }

  if ($saved.backend.deployment_id -ne $currentBackend.deployment_id) {
    $ok = $false
    Write-Host "ALERTA: BACKEND foi sobrescrito."
    Write-Host "esperado: $($saved.backend.deployment_id)"
    Write-Host "atual:    $($currentBackend.deployment_id)"
  } else {
    Write-Host "OK: BACKEND preservado ($($currentBackend.deployment_id))."
  }

  if (-not $ok) {
    exit 2
  }
}

function Show-LockFile {
  if (-not (Test-Path -LiteralPath $LockFile)) {
    throw "Arquivo de lock nao encontrado: $LockFile"
  }
  Get-Content -LiteralPath $LockFile -Raw
}

switch ($Mode) {
  'set' { Write-LockFile }
  'check' { Check-LockFile }
  'show' { Show-LockFile }
  default { throw "Modo invalido: $Mode" }
}
