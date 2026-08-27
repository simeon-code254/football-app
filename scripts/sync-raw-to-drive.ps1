<#
.SYNOPSIS
  Copy contributor footage from Azure Blob (raw/) into Google Drive.

.DESCRIPTION
  Wraps rclone rather than reimplementing it. Moving hundreds of gigabytes of
  video needs resume-on-partial-file, checksum verification, retry with
  backoff and tuned parallelism -- rclone has all of that and a hand-rolled
  script would be a worse version of it.

  Credentials never live in this repo. Both remotes are configured once with
  `rclone config`, which stores them in %APPDATA%\rclone\rclone.conf.

  Direction is one-way and non-destructive by default: the SAS this uses only
  needs Read + List, so the script physically cannot delete source footage
  unless you deliberately hand it a delete-capable one and pass -MoveNotCopy.

.EXAMPLE
  .\scripts\sync-raw-to-drive.ps1 -DryRun
  .\scripts\sync-raw-to-drive.ps1
#>
[CmdletBinding()]
param(
  # rclone remote for the Azure container (see docs/FOOTAGE-SYNC.md)
  [string]$Source = "matobev-raw:",
  # rclone remote + path inside Drive
  [string]$Dest = "matobev-drive:Matobev/raw",
  # list what would transfer, move nothing
  [switch]$DryRun,
  # delete each blob from Azure once its copy is verified. Requires a SAS with
  # delete permission; the Read+List one cannot do this.
  [switch]$MoveNotCopy,
  # cap upstream so an upload does not saturate the connection
  [string]$BandwidthLimit = ""
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command rclone -ErrorAction SilentlyContinue)) {
  Write-Error "rclone is not installed. See docs/FOOTAGE-SYNC.md (winget install Rclone.Rclone)."
}

$remotes = (rclone listremotes) -replace ':$', ''
foreach ($r in @($Source, $Dest)) {
  $name = $r.Split(':')[0]
  if ($remotes -notcontains $name) {
    Write-Error "rclone remote '$name' is not configured. See docs/FOOTAGE-SYNC.md."
  }
}

$verb = if ($MoveNotCopy) { "move" } else { "copy" }

if ($MoveNotCopy) {
  Write-Host "`n  MOVE mode: footage is deleted from Azure once its copy verifies." -ForegroundColor Yellow
  Write-Host "  Drive becomes the only copy. Ctrl+C now if that is not what you want.`n" -ForegroundColor Yellow
  Start-Sleep -Seconds 4
}

$logDir = Join-Path $PSScriptRoot "..\.sync-logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$log = Join-Path $logDir ("sync-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log")

$rcArgs = @(
  $verb, $Source, $Dest,
  # verify by hash, not size+timestamp: a truncated upload has the right name
  # and a plausible size, and only the checksum catches it
  "--checksum",
  "--transfers", "4",
  "--checkers", "8",
  "--retries", "5",
  "--low-level-retries", "20",
  "--progress",
  "--stats", "10s",
  "--stats-one-line",
  "--log-file", $log,
  "--log-level", "INFO"
)
if ($DryRun)         { $rcArgs += "--dry-run" }
if ($BandwidthLimit) { $rcArgs += @("--bwlimit", $BandwidthLimit) }

Write-Host "  $verb  $Source  ->  $Dest"
if ($DryRun) { Write-Host "  (dry run - nothing will transfer)" -ForegroundColor Cyan }
Write-Host "  log: $log`n"

& rclone @rcArgs
$code = $LASTEXITCODE

if ($code -eq 0) {
  Write-Host "`n  Done. Verifying both sides agree..." -ForegroundColor Green
  & rclone check $Source $Dest --checksum --one-way --log-file $log --log-level INFO
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  Every source file has a checksum-identical copy in Drive." -ForegroundColor Green
  } else {
    Write-Warning "  rclone check reported differences. Inspect $log before deleting anything from Azure."
  }
} else {
  Write-Error "rclone exited $code. See $log"
}
