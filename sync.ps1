$ErrorActionPreference = "Stop"
$Dev  = $PSScriptRoot
$Main = 'C:\Users\Section\Documents\_Mijn Documenten\_Finance\FBS-App-Main'

Write-Host '=== Sync FBS-App-Dev -> FBS-App-Main ===' -ForegroundColor Cyan

robocopy $Dev $Main /MIR `
    /XF fbs.db fbs.db-shm fbs.db-wal .env.local fbs-app.key fbs-app.key.pub node-x86_64-pc-windows-msvc.exe build.ps1 `
    /XD node_modules .git .next "src-tauri\target" "src-tauri\app" backup VMDebugLog `
    /NFL /NDL /NJH /NJS /NS /NC /NP

# Herstel Main-only bestanden
Write-Host '=== Herstel Main-only bestanden ===' -ForegroundColor Cyan

# tauri.conf.json (pubkey, installerArgs, withGlobalTauri)
Write-Host '  tauri.conf.json: controleer pubkey en installMode in Main' -ForegroundColor Yellow

Write-Host '=== Sync compleet ===' -ForegroundColor Green
