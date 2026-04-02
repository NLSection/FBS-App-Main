# FBS Web App — Roadmap

## Afgerond
- CSV import (Rabobank)
- Transactiepagina met filters, categorisatie, periodenavigatie
- Categorisatie database en matching
- Scriptstatus pagina
- Categorisatie flow verbeterd (popup met chips, scope keuze, omboekingen)
- Rekening-tabs op transactiepagina (Beheerde Rekeningen + losse rekeningen)
- Backup/restore functie in instellingen
- Scrollbalk en sidebar verbeteringen
- Hamburgermenu sticky rechts
- Zoekbalk verplaatst naar tandswielbalk
- Toelichting veld op transacties (popup, weergave boven omschrijving,
  zoekbalk, categorieregel keten voor scope='alle')
- Aangepast filterknop in categoriefilterbalk (🔒 met teller)
- CategoriePopup geëxtraheerd als gedeeld component
- Categorisatie pagina herbouwd: twee tabs (Categorieregels + Aangepast),
  filterknoppen, zoekbalk, gesynchroniseerde scrollbar, CategoriePopup
- Woordfrequentie analyseknop in categorisatie popup (tellers inline in chips)
- Genegeerde rekeningen beheer in instellingen
- Import prompt voor onbekende rekeningen
- Zoekwoord matching verbeterd: omschrijving_zoekwoord en naam_zoekwoord worden per woord opgeslagen en gematcht via volgorde-regex (woorden moeten in volgorde voorkomen met willekeurige tekens ertussen)
- P2 fallthrough fix: regels met omschrijving_zoekwoord worden niet meer via P2 gematcht als de omschrijving niet overeenkomt
- Scrollpositie behoud na categoriewijziging in de transactiespagina
- Inline bewerking per cel in de Categorieregels tab (naam_zoekwoord, omschrijving_zoekwoord, toelichting, categorie, subcategorie)
- Chip-lengte filter verwijderd: alle woorden beschikbaar als chip ongeacht lengte
- Categorieregel update behoudt bestaande omschrijving_zoekwoord en naam_zoekwoord als deze niet expliciet worden meegestuurd
- Automatische backup na elke schrijfoperatie naar Backup/backup_YYYY-MM-DD_HH-MM-SS.json (max 10 bestanden)
- Backup check bij opstarten: melding als er een nieuwere backup beschikbaar is met optie om te importeren
- Backup synchronisatie via git mogelijk doordat backups als JSON worden opgeslagen

## Te doen

### Fase 1 — Functionaliteit
1. Ondersteuning voor andere bank CSV formaten (configureerbare kolomkoppelingen)
2. Configureerbare kolomvolgorde in transactiepagina
3. Meerdere omschrijving zoekwoorden selecteerbaar in categorisatie popup
4. Woordfrequentie analyse uitbreiden: knop rechts naast label, tellers
   inline in chips, tweede klik verbergt tellers
5. Rekening toevoegen via transactiepagina: IBAN tegenrekening klikbaar,
   opent zelfde prompt als bij onbekende rekening in CSV import
6. Rekening verwijderen — data integriteit: herdetectie van omboeking-type
   en hermatching na verwijdering van rekening uit instellingen
7. Trendgrafieken (equivalent van Script T)
8. Quick-question feature

### Fase 2 — Uitstraling
9. Section Labs branding / huisstijl

### Vóór productie verwijderen
- DEV-ONLY: /api/restore endpoint verwijderen
- DEV-ONLY: BackupCheck component en /api/backup/check verwijderen
- DEV-ONLY: Backup/ map uit Git verwijderen en toevoegen aan .gitignore

### Fase 3 — Uitrol
10. Gedeelde database via netwerkpad: optie in instellingen om SQLite
    database locatie te wijzigen naar lokaal of UNC pad (bijv. \\NAS\FBS\fbs.db).
    Bij wijziging wordt database gekopieerd naar nieuwe locatie.
11. Synology NAS package: app verpakken als SPK package, draait als server
    op NAS, benaderbaar via browser vanaf meerdere apparaten
12. Installatie op andere systemen
13. Patching en uitrol bij andere gebruikers
14. Login / authenticatie + MFA
15. Encryptie / licentie
