:: FILE: start-fbs.bat
:: AANGEMAAKT: 27-03-2026 11:00
:: VERSIE: 2
:: GEWIJZIGD: 02-04-2026 22:00
::
:: WIJZIGINGEN (02-04-2026 22:00):
:: - NAS sync vervangen door git pull voor de app opstart
@echo off
cd /d "C:\FBS-App"
echo Git pull uitvoeren...
git pull
echo Git pull voltooid.
if not exist "C:\FBS-App\node_modules" (
    echo Node modules niet gevonden, npm install uitvoeren...
    npm install
    echo npm install voltooid.
)
timeout /t 2 /nobreak >nul
start wt.exe new-tab --title "FBS Dev Server" -d "C:\FBS-App" cmd /k "npm run dev" ; new-tab --title "Claude Chrome" -d "C:\FBS-App" cmd /k "claude --chrome --dangerously-skip-permissions"
timeout /t 3 /nobreak >nul
start chrome http://localhost:3000