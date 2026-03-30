:: FILE: start-fbs.bat
:: AANGEMAAKT: 27-03-2026 11:00
:: VERSIE: 1
:: GEWIJZIGD: 30-03-2026 22:30
::
:: WIJZIGINGEN (30-03-2026 22:30):
:: - Initieel aangemaakt: start npm dev server geminimaliseerd, open Chrome op localhost:3000, start claude --chrome
:: - Pad hardcoded per instructie, cmd /c ipv /k
:: - Vervang losse vensters door Windows Terminal met twee tabbladen: FBS Dev Server en Claude Chrome
:: - NAS naar notebook eénrichtingssync toegevoegd via robocopy (node_modules, .git, .next en .db uitgesloten)
:: - npm install automatisch uitgevoerd als node_modules ontbreekt
@echo off
echo Synchroniseren van NAS naar notebook...
robocopy "\\192.168.1.4\My Documents\Section-PC\My Documents\_Mijn Documenten\_Finance\FBS-App" "C:\FBS-App" /MIR /XD node_modules .git .next /XF *.db
echo Sync voltooid.

if not exist "C:\FBS-App\node_modules" (
    echo Node modules niet gevonden, npm install uitvoeren...
    cd /d "C:\FBS-App"
    npm install
    echo npm install voltooid.
)

timeout /t 2 /nobreak >nul
start wt.exe new-tab --title "FBS Dev Server" -d "C:\FBS-App" cmd /k "npm run dev" ; new-tab --title "Claude Chrome" -d "C:\FBS-App" cmd /k "claude --chrome --dangerously-skip-permissions"
timeout /t 3 /nobreak >nul
start chrome http://localhost:3000