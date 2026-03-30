Vervang de inhoud van ROADMAP.md met het volgende:

# FBS Web App — Roadmap

## Afgerond
- CSV import (Rabobank)
- Transactiepagina met filters, categorisatie, periodenavigatie
- Kwartaaloverzichten (via "Alle" filter in transactiepagina)
- Categorisatie database en matching
- Scriptstatus pagina
- Categorisatie flow verbeterd (popup met chips, scope keuze, omboekingen)
- Rekening-tabs op transactiepagina (Beheerde Rekeningen + losse rekeningen)
- Backup/restore functie in instellingen
- Scrollbalk en sidebar verbeteringen
- Hamburgermenu sticky rechts
- Zoekbalk verplaatst naar tandswielbalk

## Te doen

### Fase 1 — Functionaliteit
1. Ondersteuning voor andere bank CSV formaten (configureerbare kolomkoppelingen)
2. Configureerbare kolomvolgorde in transactiepagina
3. Meerdere omschrijving zoekwoorden selecteerbaar in categorisatie popup
4. Omschrijving woordfrequentie analyse in categorisatie popup: knop rechts naast het label 'Match op omschrijving (optioneel)'. Na klik worden tellers opgehaald van hoe vaak elk omschrijving-chip woord voorkomt in omschrijvingen van andere transacties van dezelfde tegenpartij. Tellers worden inline in de chips getoond tussen haakjes (bijv. 'termijn (18)'). Volgorde van chips blijft ongewijzigd. Tweede klik verbergt de tellers weer.
5. Categorie database: naam_origineel vullen met chip-label, naam_zoekwoord verbergen
6. Trendgrafieken (equivalent van Script T)
7. Quick-question feature

### Fase 2 — Uitstraling
8. Section Labs branding / huisstijl (huidige staat onvoldoende)

### Fase 3 — Uitrol
9. Installatie op andere systemen
10. Patching en uitrol bij andere gebruikers
11. Login / authenticatie + MFA
12. Encryptie / licentie