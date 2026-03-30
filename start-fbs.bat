:: FILE: start-fbs.bat
:: AANGEMAAKT: 27-03-2026 11:00
:: VERSIE: 1
:: GEWIJZIGD: 27-03-2026 14:30
::
:: WIJZIGINGEN (27-03-2026 14:30):
:: - Initieel aangemaakt: start npm dev server geminimaliseerd, open Chrome op localhost:3000, start claude --chrome
:: - Pad hardcoded per instructie, cmd /c ipv /k
:: - Vervang losse vensters door Windows Terminal met twee tabbladen: FBS Dev Server en Claude Chrome

@echo off
start wt.exe new-tab --title "FBS Dev Server" -d "C:\Users\Section\Documents\_Mijn Documenten\_Finance\FBS-App" cmd /k "npm run dev" ; new-tab --title "Claude Chrome" -d "C:\Users\Section\Documents\_Mijn Documenten\_Finance\FBS-App" cmd /k "claude --chrome --dangerously-skip-permissions"
timeout /t 3 /nobreak >nul
start chrome http://localhost:3000
