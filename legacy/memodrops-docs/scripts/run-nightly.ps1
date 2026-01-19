param(
  [switch]$KeepServices,
  [string]$ExtraTasksPath = ""
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$logDir = Join-Path $root "tmp/nightly"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportPath = Join-Path $logDir "report_$stamp.md"
$report = New-Object System.Collections.Generic.List[string]

function Add-ReportLine {
  param([string]$Status, [string]$Message)
  $report.Add("- [$Status] $Message")
}

function Wait-Port {
  param(
    [int]$Port,
    [string]$Name,
    [int]$TimeoutSeconds = 60
  )
  $start = Get-Date
  while ((Get-Date) - $start -lt (New-TimeSpan -Seconds $TimeoutSeconds)) {
    $ok = (Test-NetConnection -ComputerName "localhost" -Port $Port -WarningAction SilentlyContinue).TcpTestSucceeded
    if ($ok) {
      return $true
    }
    Start-Sleep -Seconds 2
  }
  throw "$Name port $Port not ready after $TimeoutSeconds seconds"
}

$report.Add("# MemoDrops nightly run")
$report.Add("Started: $(Get-Date -Format "s")")
$report.Add("")

$backendProcess = $null
$postgresWasRunning = $false
$redisWasRunning = $false
$adminEmail = "admin@edro.local"
$adminPassword = "TempPass123"
$adminName = "Admin Local"
$baseUrl = "http://localhost:3333"
$dropId = ""
$userId = ""
$notifStatus = ""

if ([string]::IsNullOrWhiteSpace($ExtraTasksPath)) {
  $ExtraTasksPath = Join-Path $PSScriptRoot "nightly-extra.ps1"
}

try {
  try {
    Push-Location $root
    $postgresWasRunning = -not [string]::IsNullOrWhiteSpace((docker compose ps -q postgres))
    $redisWasRunning = -not [string]::IsNullOrWhiteSpace((docker compose ps -q redis))
    docker compose up -d postgres redis | Out-Null
    Add-ReportLine "ok" "docker compose up -d postgres redis"
  } finally {
    Pop-Location
  }

  Wait-Port -Port 5432 -Name "postgres"
  Add-ReportLine "ok" "postgres port ready"
  Wait-Port -Port 6379 -Name "redis"
  Add-ReportLine "ok" "redis port ready"

  npm -C $root\apps\backend run db:migrate | Out-Null
  Add-ReportLine "ok" "db:migrate"

  $backendCmd = "cd /d $root\apps\backend && set DOTENV_CONFIG_PATH=$root\apps\backend\.env && set ADMIN_EMAILS=$adminEmail && set ENABLE_QUEUE_WORKERS=true && set REDIS_URL=redis://:redis123@localhost:6379 && npm run dev"
  $backendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $backendCmd -NoNewWindow -PassThru
  Add-ReportLine "ok" "backend started pid=$($backendProcess.Id)"

  $healthy = $false
  for ($i = 0; $i -lt 30; $i++) {
    try {
      Invoke-RestMethod "$baseUrl/health" | Out-Null
      $healthy = $true
      break
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  if (-not $healthy) {
    throw "backend health check failed"
  }
  Add-ReportLine "ok" "backend health check"

  $token = $null
  try {
    $regBody = @{ name = $adminName; email = $adminEmail; password = $adminPassword; plan = "pro" } | ConvertTo-Json
    $reg = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/register" -ContentType "application/json" -Body $regBody
    $token = $reg.token
    $userId = $reg.user.id
    Add-ReportLine "ok" "auth register userId=$userId"
  } catch {
    $loginBody = @{ email = $adminEmail; password = $adminPassword } | ConvertTo-Json
    $login = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/login" -ContentType "application/json" -Body $loginBody
    $token = $login.token
    $userId = $login.user.id
    Add-ReportLine "ok" "auth login userId=$userId"
  }

  $me = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/auth/me" -Headers @{ Authorization = "Bearer $token" }
  if ($me.role -ne "admin") {
    $env:MEMO_ADMIN_EMAIL = $adminEmail
    @'
process.env.DOTENV_CONFIG_QUIET = 'true';
require('dotenv').config({ path: 'apps/backend/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  const email = process.env.MEMO_ADMIN_EMAIL;
  await pool.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', email]);
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });
'@ | node - | Out-Null

    $loginBody = @{ email = $adminEmail; password = $adminPassword } | ConvertTo-Json
    $login = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/login" -ContentType "application/json" -Body $loginBody
    $token = $login.token
    $me = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/auth/me" -Headers @{ Authorization = "Bearer $token" }
  }
  if ($me.role -ne "admin") {
    throw "admin role not resolved for $adminEmail"
  }
  Add-ReportLine "ok" "admin role confirmed"

  $disciplines = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/disciplines"
  if (-not $disciplines.disciplines -or $disciplines.disciplines.Count -eq 0) {
    $discBody = @{ name = "Direito Administrativo" } | ConvertTo-Json
    $created = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/disciplines" -ContentType "application/json" -Body $discBody
    $disciplineId = $created.discipline.id
    Add-ReportLine "ok" "discipline created id=$disciplineId"
  } else {
    $disciplineId = $disciplines.disciplines[0].id
    Add-ReportLine "ok" "discipline reused id=$disciplineId"
  }

  $dropBody = @{
    discipline_id = $disciplineId
    title = "Atos Administrativos"
    content = "Resumo rapido sobre atos administrativos e seus elementos essenciais."
    difficulty = 2
    source_message = "Explicacao do tutor"
    metadata = @{ origem = "nightly" }
  } | ConvertTo-Json -Depth 4
  $dropRes = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/tutor/to-drop" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $dropBody
  $dropId = $dropRes.data.id
  Add-ReportLine "ok" "drop created id=$dropId"

  $adminDrops = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/admin/drops?status=draft" -Headers @{ Authorization = "Bearer $token" }
  $found = $adminDrops.items | Where-Object { $_.id -eq $dropId }
  if (-not $found) {
    throw "drop not found in admin list"
  }
  Add-ReportLine "ok" "drop found in admin list"

  $approveBody = @{ status = "published" } | ConvertTo-Json
  $approved = Invoke-RestMethod -Method Patch -Uri "$baseUrl/api/admin/drops/$dropId/status" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $approveBody
  Add-ReportLine "ok" "drop approved status=$($approved.data.status)"

  $notifBody = @{ userId = $userId; type = "push"; title = "Teste de notificacao"; body = "Notificacao enviada via API." } | ConvertTo-Json
  $notif = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/notifications/send" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $notifBody
  Add-ReportLine "ok" "notification queued=$($notif.data.queued)"

  Start-Sleep -Seconds 2
  $env:MEMO_USER_ID = $userId
  $logJson = @'
process.env.DOTENV_CONFIG_QUIET = 'true';
require('dotenv').config({ path: 'apps/backend/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  const userId = process.env.MEMO_USER_ID;
  const res = await pool.query(
    'SELECT id, status, reason, sent_at FROM notifications_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  console.log(JSON.stringify(res.rows[0] || {}));
  await pool.end();
})().catch(err => { console.error(err); process.exit(1); });
'@ | node -
  $logLine = $logJson | Select-Object -Last 1
  $log = $logLine | ConvertFrom-Json
  $notifStatus = $log.status
  Add-ReportLine "ok" "notification log status=$notifStatus"

  if (-not [string]::IsNullOrWhiteSpace($ExtraTasksPath) -and (Test-Path $ExtraTasksPath)) {
    Add-ReportLine "ok" "extra tasks file found: $ExtraTasksPath"
    & $ExtraTasksPath | Out-Null
  } elseif (-not [string]::IsNullOrWhiteSpace($ExtraTasksPath)) {
    Add-ReportLine "info" "extra tasks file not found: $ExtraTasksPath"
  }
} catch {
  Add-ReportLine "fail" $_.Exception.Message
} finally {
  if ($backendProcess -and -not $KeepServices) {
    try {
      Stop-Process -Id $backendProcess.Id -Force
      Add-ReportLine "ok" "backend stopped"
    } catch {
      Add-ReportLine "info" "backend stop failed: $($_.Exception.Message)"
    }
  }

  if (-not $KeepServices) {
    try {
      try {
        Push-Location $root
        if (-not $postgresWasRunning -or -not $redisWasRunning) {
          docker compose stop postgres redis | Out-Null
          docker compose rm -f postgres redis | Out-Null
          Add-ReportLine "ok" "docker compose stop/rm postgres redis"
        } else {
          Add-ReportLine "info" "postgres/redis already running before script, left running"
        }
      } finally {
        Pop-Location
      }
    } catch {
      Add-ReportLine "info" "docker compose cleanup failed: $($_.Exception.Message)"
    }
  }

  $report.Add("")
  $report.Add("DropId: $dropId")
  $report.Add("UserId: $userId")
  $report.Add("NotificationStatus: $notifStatus")
  $report.Add("Finished: $(Get-Date -Format "s")")

  $report | Out-File -FilePath $reportPath -Encoding ASCII
  Write-Host "Report: $reportPath"
}
