# SESSION.md — FBS-App Sessiestatus

## Staat: 07-04-2026 (sessie 2)

### Versies
- FBS-App-Dev: v0.1.7
- FBS-App-Main: v0.1.7
- GitHub Release: v0.1.7 (werkend)

### Afgerond in deze sessie (06-04 / 07-04-2026)
- blsTrxUitgeklapt: verwijderd en opnieuw opgebouwd als correcte dashboard-instelling
- Dashboard weergave-opties herstructureerd: hoofdlaag alleen Zichtbaar, sublagen alleen Standaard uitgeklapt
- catTrxUitgeklapt toggle in CAT settings panel, bidirectioneel met instellingen
- Rekeninggroepen: nieuwe tabel, API routes, CRUD, drag & drop volgorde, bidirectionele chips
- Dashboard tabbladen per rekeninggroep met BLS + CAT filtering per groep
- Transactiepagina tabs gebaseerd op rekeninggroepen + individuele rekeningen
- beheerd kolom volledig verwijderd uit rekeningen (database DROP COLUMN + alle code referenties)
- Categorie hernoemen propageert naar categorieen en transactie_aanpassingen tabellen
- Vaste Lasten → Vaste Posten: volledige hernoem (database, lib, API routes, UI, sidebar)
- Vaste Posten als beschermde categorie met rekening-koppeling
- Progressieve sidebar: menu-items verschijnen op basis van app-status (imports, categorisatie)
- Dashboard redirect naar import of transacties als data ontbreekt
- Subcategorieen tabel: eigen database tabel, API routes, CRUD met propagatie
- Subcategorieën uitklapbaar in categorieën-tabel (instellingen) met 3-kolom grid layout
- Subcategorie verwijder-flow: popup bij in-gebruik, redirect naar categorisatie met filter, melding bij ongebruikt
- CategoriePopup: check op ongebruikte subcategorie bij wijziging, melding met verwijder/behoud keuze
- Categorie en subcategorie dropdowns met "+ Nieuw…" optie in categorisatiepagina
- Subcategorieën-tab verwijderd uit categorisatiepagina (verhuisd naar instellingen)
- Alle velden bewerkbaar in categorisatieregels (IBAN, type, subcategorie als input+datalist)
- Gekleurde badges met border voor rekeningen en categorieën in alle instellingen-tabellen
- Selecteerbare chips in bewerkformulieren gebruiken eigen rekening/categorie-kleuren
- Verwijderknoppen → rood prullenbak-icoontje in alle instellingen-componenten
- Backup/restore uitgebreid: alle 13 tabellen, gzip compressie (2.5MB→186KB)
- Backup bewaartermijn en minimum bewaard als instelbare opties
- Externe backup locatie met sync, pending-extern map, fork-detectie
- Apparaat-ID per installatie voor cross-device sync
- AES-256 encryptie voor externe backups met wachtwoord, hint en herstelsleutel
- Herstelsleutel modal met kopieer/afdruk opties
- DB_PATH gecentraliseerd in lib/db.ts
- triggerBackup op alle mutatie-routes, git push verwijderd
- Import flow vereenvoudigd: bron-keuze (lokaal/extern/vrij), bestanden-lijst met datum en grootte
- Auto-backup vóór import als veiligheidsnet
- Restore synchroniseert versienummer met lokale meta (voorkomt import-melding loop)
- Laatste backup datum en grootte getoond in Backup & Restore sectie
- InfoTooltips bijgewerkt voor alle secties (volledigeBreedte, flexWrap, JSX-ondersteuning)
- Aangepast uitgesloten van categorie-dropdown in CategoriePopup
- Legacy ongecomprimeerde backups automatisch opgeruimd

### Afgerond in deze sessie (07-04-2026 sessie 2)
- Stray package-lock.json in C:\FBS-App verwijderd (veroorzaakte Turbopack root-conflict)
- turbopack.root expliciet op __dirname gezet in next.config.ts
- Corrupte fbs.db-wal en fbs.db-shm verwijderd na niet-nette afsluiting
- Reset route: alle tabellen dynamisch via sqlite_master, foreign_keys OFF buiten transaction, instellingen herseeded met backup_versie=0, backup-meta.json verwijderd na reset
- Restore route: regex fix voor fbs-backup-* bestandsnamen met underscore in tijdstip, directe tabeldata (van component) nu ook ondersteund naast bestandsnaam
- BackupRestore: automatisch window.location.reload() na succesvolle restore
- Vastgesteld dat restore component altijd directe tabeldata stuurde maar route alleen bestandsnaam accepteerde — deze mismatch was root cause van "app blijft leeg" probleem

### Afgerond in deze sessie (07-04-2026 sessie 3)
- Database migraties versioned: SCHEMA_VERSION + PRAGMA user_version tracking
- runMigrations() aangeroepen na restore (oude backups automatisch bijwerken)
- schema_version opgenomen in backup JSON
- Multi-device externe backup koppeling: backup-config.json op externe locatie
- Nieuwe routes: extern-config, encryptie/koppel, encryptie/publiceer, encryptie/reset
- BackupCheck: mismatch modal bij gewijzigde externe encryptieconfiguratie
- BackupRestore: encryptie-sectie inklapbaar, publiceer-knop, koppel-flow, instellingen wissen
- Herstelsleutel bruikbaar als alternatief bij koppelen en uitschakelen
- backup-config.json bevat nu ook herstelsleutelHash
- InfoTooltips backup-sectie volledig herschreven en uitgebreid
- gitignore fix: /backup/ ipv backup/ (app/api/backup/ werd ten onrechte genegeerd)
- Documentatie bijgewerkt (ROADMAP.md, SESSION.md)

### Volgende sessie
- v0.1.8 bouwen: versie ophogen in Dev → sync → versie ophogen in Main → build
- Testen multi-device koppelflow op notebook (PC publiceert config → notebook koppelt)
- Vaste Posten pagina verfijnen (staat als "In uitvoering" in ROADMAP)
- transactie_aanpassingen opschonen (roadmap onderhoud)
