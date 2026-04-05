# FILE: bundle-app.ps1
# AANGEMAAKT: 04-04-2026 22:30
# VERSIE: 1
# GEWIJZIGD: 04-04-2026 23:30
#
# WIJZIGINGEN (04-04-2026 22:30):
# - Initieel script: bouwt Next.js standalone en kopieert naar src-tauri/app/
# WIJZIGINGEN (04-04-2026 23:30):
# - Cleanup stap: fbs.db, backup/ verwijderd na kopiëren

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "=== Rebuild better-sqlite3 ===" -ForegroundColor Cyan
Push-Location $ProjectRoot
npm rebuild better-sqlite3

Write-Host "=== Next.js build ===" -ForegroundColor Cyan
npm run build
Pop-Location

$StandalonePath = Join-Path $ProjectRoot ".next\standalone"
$TauriAppPath = Join-Path $ProjectRoot "src-tauri\app"

if (-Not (Test-Path $StandalonePath)) {
    Write-Error "Standalone build niet gevonden op $StandalonePath"
    exit 1
}

Write-Host "=== Verwijder oude src-tauri/app/ ===" -ForegroundColor Cyan
if (Test-Path $TauriAppPath) {
    Remove-Item -Recurse -Force $TauriAppPath
}

Write-Host "=== Kopieer standalone → src-tauri/app/ ===" -ForegroundColor Cyan
Copy-Item -Recurse $StandalonePath $TauriAppPath

Write-Host "=== Verwijder overbodige bestanden ===" -ForegroundColor Cyan
$Cleanup = @(
    (Join-Path $TauriAppPath "fbs.db"),
    (Join-Path $TauriAppPath "fbs.db-shm"),
    (Join-Path $TauriAppPath "fbs.db-wal"),
    (Join-Path $TauriAppPath "backup")
)
foreach ($item in $Cleanup) {
    if (Test-Path $item) {
        Remove-Item -Recurse -Force $item
        Write-Host "  Verwijderd: $item"
    }
}

Write-Host "=== Kopieer public/ → src-tauri/app/public/ ===" -ForegroundColor Cyan
$PublicSrc = Join-Path $ProjectRoot "public"
$PublicDst = Join-Path $TauriAppPath "public"
if (Test-Path $PublicSrc) {
    Copy-Item -Recurse -Force $PublicSrc $PublicDst
}

Write-Host "=== Kopieer .next/static/ → src-tauri/app/.next/static/ ===" -ForegroundColor Cyan
$StaticSrc = Join-Path $ProjectRoot ".next\static"
$StaticDst = Join-Path $TauriAppPath ".next\static"
if (Test-Path $StaticSrc) {
    New-Item -ItemType Directory -Force -Path (Join-Path $TauriAppPath ".next") | Out-Null
    Copy-Item -Recurse -Force $StaticSrc $StaticDst
}

Write-Host "=== Bundle compleet ===" -ForegroundColor Green
