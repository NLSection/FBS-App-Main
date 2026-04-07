!macro NSIS_HOOK_PREINSTALL
!macroend

!macro NSIS_HOOK_POSTINSTALL
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; Sluit Node.js en FBS processen af
  nsExec::ExecToLog 'taskkill /f /im node.exe'
  nsExec::ExecToLog 'taskkill /f /im FBS.exe'
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; Vraag of gebruiker app-data wil verwijderen
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Wil je ook alle FBS app-gegevens verwijderen?$\n$\n\
Dit verwijdert:$\n\
  - Database (alle transacties en instellingen)$\n\
  - Lokale backups$\n\
  - Configuratie$\n$\n\
Externe backups worden NIET verwijderd." \
    IDYES removedata IDNO skipdata
  removedata:
    SetShellVarContext current
    RmDir /r "$APPDATA\nl.fbs.app"
    RmDir /r "$LOCALAPPDATA\nl.fbs.app"
  skipdata:
!macroend
