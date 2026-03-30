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
8. Rekening verwijderen — data integriteit: als een rekening verwijderd wordt uit de instellingen, moeten transacties van die rekening met type omboeking-af of omboeking-bij worden herberekend (omboeking-detectie werkt op basis van bekende IBAN's). Na verwijdering: herdetectie van type + hermatching van categorisatie voor alle transacties van dat IBAN.

### Fase 2 — Uitstraling
9. Section Labs branding / huisstijl (huidige staat onvoldoende)

### Fase 3 — Uitrol
10. Installatie op andere systemen
11. Patching en uitrol bij andere gebruikers
12. Login / authenticatie + MFA
13. Encryptie / licentie
14. Gedeelde database via netwerkpad: optie in instellingen om de locatie van de SQLite database te wijzigen naar een lokaal of UNC netwerkpad (bijv. \\NAS\FBS\fbs.db). Bij wijziging wordt de huidige database naar de nieuwe locatie gekopieerd. De app gebruikt daarna altijd die locatie. Bedoeld voor gebruik op één actieve instantie tegelijk.
15. Synology NAS package: de app verpakken als installeerbaar SPK package voor Synology NAS. De app draait dan als server op de NAS en is benaderbaar via de browser vanaf meerdere apparaten. Vereist Node.js ondersteuning op de NAS.