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
- Toelichting veld op transacties
- Aangepast filterknop in categoriefilterbalk (🔒 met teller)
- CategoriePopup geëxtraheerd als gedeeld component
- Categorisatie pagina herbouwd: twee tabs (Categorieregels + Aangepast)
- Woordfrequentie analyse in categorisatie popup
- Genegeerde rekeningen beheer in instellingen
- Import prompt voor onbekende rekeningen
- Zoekwoord matching verbeterd: AND-logica, volgorde-regex
- P2 fallthrough fix
- Scrollpositie behoud na categoriewijziging
- Inline bewerking per cel in Categorieregels tab
- Meerdere zoekwoorden selecteerbaar in categorisatie popup
- Dashboard herbouwd met periodenavigatie
- BLS tabel op dashboard
- Vaste Posten overzichtspagina (kaarten per subcategorie, heatmap, afwijkingspijlen)
- Rekeninggroepen: dashboard tabbladen, drag & drop volgorde, bidirectionele chips
- Transactiepagina tabs op basis van rekeninggroepen + individuele rekeningen
- Vaste Lasten → Vaste Posten hernoem (database, API, UI, sidebar)
- Vaste Posten als beschermde categorie met rekening-koppeling
- Progressieve sidebar op basis van app-status
- Subcategorieen tabel met uitklapbare subtabel in categorieën-instellingen
- Subcategorie verwijder-flow met redirect naar categorisatiepagina
- Categorie hernoemen propageert automatisch naar regels en transacties
- Gzip backup compressie (2.5MB → 186KB)
- Backup bewaartermijn en minimum bewaard als instellingen
- Externe backup locatie met cross-device sync en fork-detectie
- AES-256 encryptie voor externe backups met herstelsleutel
- Apparaat-ID per installatie
- triggerBackup op alle mutatie-routes
- Import flow: bron-keuze (lokaal/extern/vrij), bestanden-lijst, auto-backup vóór import
- DB_PATH gecentraliseerd voor Tauri-compatibiliteit
- Versioned database migraties (SCHEMA_VERSION + PRAGMA user_version)
- Automatische schema-migratie na backup restore
- Multi-device encryptie koppeling: backup-config.json op externe locatie, koppel/publiceer/reset flows
- Herstelsleutel bruikbaar als alternatief bij koppelen en uitschakelen versleuteling
- Mismatch-detectie bij gewijzigde encryptieconfiguratie op externe locatie

## In uitvoering
- Vaste Posten overzichtspagina verfijnen

## Te doen

### Onderhoud
- transactie_aanpassingen opschonen: automatische categoriseringen (categorie IS NULL, handmatig=0) verwijderen — redundant met categorieen-regels

### Fase 1 — Functionaliteit
1. Ondersteuning voor andere bank CSV formaten (configureerbare kolomkoppelingen)
2. Configureerbare kolomvolgorde in transactiepagina
3. Trendgrafieken (equivalent van Script T)
4. Quick-question feature
5. Rekening toevoegen via transactiepagina (IBAN tegenrekening klikbaar)
6. Rekening verwijderen — data integriteit

### Fase 2 — Uitstraling
7. Section Labs branding / huisstijl
8. Code review en refactoring sessie: dode code verwijderen, complexe logica vereenvoudigen (uit te voeren wanneer core features stabiel zijn)

### Fase 3 — Uitrol

Het doel is één codebase die in drie vormen gedistribueerd kan worden.
Elke gebruiker heeft zijn eigen instantie met eigen database.

```
FBS-App (Next.js + SQLite)
├── Synology SPK  →  draait als Node.js server op NAS, benaderbaar via browser
├── Windows       →  Tauri wrapper (.exe installer)
└── macOS         →  Tauri wrapper (.dmg)
```

#### 3a — Synology SPK (eerste prioriteit)
8.  Node.js bundelen voor x86_64 (DS923+ en vergelijkbare modellen)
9.  better-sqlite3 pre-compileren voor target architectuur
10. SPK package structuur (INFO, installer script, start-stop-status script)
11. Database locatie instellen tijdens installatie (bijv. `/volume1/FBS/`)
12. QuickConnect / Tailscale toegang voor gebruik buiten thuisnetwerk

#### 3b — Windows installer
13. Tauri integratie — database-laag vervangen door Rust/SQLite
14. Windows installer (.exe) via Tauri bundler

#### 3c — macOS installer
15. macOS installer (.dmg) via Tauri bundler

#### 3d — Uitrol en beheer (alle platformen)
16. Patching en update mechanisme
17. Login / authenticatie + MFA
18. Encryptie / licentie
