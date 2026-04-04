# LEROY'S WEB APP DEVELOPMENT DIRECTIVES
**Doelstelling:** Maximale uitvoeringssnelheid met minimale code. Geen overbodige abstractie, wrapper-lagen of state. Directe, leesbare implementaties.

---

## DIR-0 — Projectbestanden als startpunt
De bestanden in de projectroot zijn het startpunt van elke sessie. Tijdens een sessie is de **laatst geleverde versie altijd leidend** — niet de originele projectfile. Nooit werken op basis van geheugen of aannames over de huidige staat van een bestand. Lees het bestand eerst, dan pas aanpassen.

---

## DIR-1 — Achtergrondmodus en output
Werk in achtergrondmodus met minimale voortgangsupdates. Code niet in de chat plakken tenzij daar een expliciete reden voor is. Bestanden worden direct geschreven naar de projectlocatie via Claude Code file tools.

---

## DIR-2 — Encoding en speciale tekens
Alle bestanden zijn UTF-8. Euro-teken, em-dash en andere speciale tekens mogen letterlijk in broncode en strings staan — geen escape-workarounds tenzij de target omgeving dat vereist (bijv. HTML entities in templates). Controleer bij het lezen van geuploadde bestanden op corrupte bytes en herstel naar correcte UTF-8.

---

## DIR-3 — Bestandsheaders en wijzigingslog
Elk bestand bevat een korte header als commentaarblok bovenaan:

```
// FILE: <bestandsnaam>
// AANGEMAAKT: DD-MM-YYYY HH:MM
// VERSIE: N
// GEWIJZIGD: DD-MM-YYYY HH:MM
//
// WIJZIGINGEN (DD-MM-YYYY HH:MM):
// - Omschrijving van wijziging
// - Eventuele tweede wijziging
```

Regels:
- `GEWIJZIGD` en `WIJZIGINGEN` datum worden bij elke levering bijgewerkt naar de actuele Amsterdam-tijd
- Binnen een sessie **accumuleert** het WIJZIGINGEN-blok: elke levering voegt een `// -` regel toe
- Bij versie-ophogen (sessieafsluiting) wordt het blok overschreven met alleen de wijzigingen van de nieuwe sessie
- Precies EEN wijzigingenblok per bestand — nooit meerdere datumblokken naast elkaar
- Overige headervelden (FILE, AANGEMAAKT) blijven ongewijzigd

---

## DIR-4 — Aanpak eerst, code daarna
Geen code-wijzigingen zonder expliciete instructie. Altijd eerst bevindingen en aanpak presenteren — implementeer **pas na akkoord**. Niet beginnen met coderen voordat de aanpak helder en afgestemd is.

---

## DIR-5 — Geen hardcoded configuratiewaarden
Geen hardcoded gebruikersnamen, bedragen, drempelwaarden, API-endpoints, categorienamen of andere configureerbare waarden in broncode. Configuratie leeft in:
- `.env` / `.env.local` voor omgevingsspecifieke waarden (URLs, keys)
- Een `config/`-bestand of database-tabel voor app-configuratie (categorieën, instellingen, limieten)

Bij ontbrekende configuratie: **altijd een duidelijke foutmelding** — nooit een stille fallback naar een hardcoded standaardwaarde. Shareability is een core requirement: de app moet zonder aanpassingen aan de broncode door een andere gebruiker te gebruiken zijn.

---

## DIR-6 — Jaar- en datumlogica is dynamisch
Geen hardcoded jaartallen of datums in code. Jaar altijd dynamisch bepalen uit data of gebruikersinstellingen. Periodelogica (maand, kwartaal, jaar) werkt op basis van de transactiedata zelf.

---

## DIR-7 — Minimale diff
Alleen de regels die daadwerkelijk veranderen worden aangepast. Alles eromheen wordt letterlijk gekopieerd. Nooit een heel blok herschrijven als een gerichte wijziging volstaat. Dit geldt ook voor losse declaraties en toevoegingen tussen bestaande secties.

---

## DIR-8 — Versioning per bestand
Elke bestandsheader bevat een `VERSIE: N` regel.
- De teller reflecteert het aantal voltooide werksessies op dat bestand
- Bij sessieafsluiting vraagt Claude expliciet: **"Mag deze versie als definitief worden beschouwd?"**
- Bij bevestiging: bestand opnieuw geleverd met `VERSIE: N+1` en een nieuw WIJZIGINGEN-blok met alleen de wijzigingen van de zojuist afgesloten sessie
- De teller wordt **nooit** opgehoogd zonder expliciete bevestiging van de gebruiker

---

## DIR-9 — Projectstructuur (Next.js + SQLite)
Stack: **Next.js** (frontend + API routes) + **SQLite** (via better-sqlite3). Één project, één proces (`npm run dev`), geen aparte backend.

```
fbs-app/
├── CLAUDE.md
├── app/                  ← Next.js App Router: pagina's en layouts
│   └── api/              ← API routes (vervangen de FastAPI endpoints)
├── components/           ← herbruikbare UI-componenten (geen data-logica)
├── features/             ← feature-modules (import, categorisatie, overzicht, trends)
│   └── [feature]/
│       ├── components/   ← feature-specifieke UI
│       ├── hooks/        ← data-fetching hooks
│       └── utils/        ← berekeningen en transformaties
├── lib/
│   ├── db.ts             ← SQLite verbinding (singleton)
│   └── [domein].ts       ← database-queries per domein
├── config/               ← app-configuratie, schema's, constanten
└── fbs.db                ← SQLite database (niet in Git)
```

Regels:
- Elk component/module heeft één verantwoordelijkheid
- Geen componenten die zowel data ophalen als renderen, tenzij het een top-level pagina is
- Database-toegang uitsluitend via `lib/` — nooit direct in componenten of pagina's
- CSV-importlogica leeft in `features/import/utils/` zodat deze later vervangbaar is door directe bestandstoegang (Tauri)

---

## DIR-10 — Foutafhandeling is expliciet
Geen stille catches die fouten verbergen. Elke fout die de gebruiker raakt krijgt een zichtbare melding. Laadstatussen en lege states zijn altijd expliciet afgehandeld — geen lege UI zonder uitleg.

---

## DIR-11 — Token-efficiëntie
- Lees alleen bestanden die direct gewijzigd worden. Geen exploratief lezen.
- Geen bestanden lezen "voor context" tenzij expliciet gevraagd in de opdracht.
- Geen hele bestanden herschrijven als een gerichte wijziging volstaat (zie DIR-7).
- Geen samenvattingen of uitleg tussendoor — direct uitvoeren en committen.
- Bij twijfel over een bestand: vraag eerst welk bestand het is, lees het niet zomaar.
- Lees een bestand niet opnieuw als het al eerder in deze sessie gelezen is EN er
  geen wijzigingen op zijn doorgevoerd. Na een commit op een bestand altijd opnieuw
  lezen voor verdere wijzigingen.
- Bij het lezen van bestanden altijd `offset` + `limit` gebruiken als alleen een
  specifiek deel nodig is — nooit hele bestanden lezen voor één wijziging.
- Meerdere edits batchen en dan één keer builden — niet na elke kleine edit builden.
- Geen exploratie-agents starten voor informatie die al bekend is uit de conversatie.
- Browser-tools (screenshots, zooms, navigatie) **uitsluitend** op expliciet verzoek
  van de gebruiker. De gebruiker test zelf in de browser. Nooit proactief screenshots
  nemen om wijzigingen te verifiëren.
- Commit messages kort en bondig houden.
- Geen herhaalde grep/search rondes als de informatie al eerder in de sessie is gelezen.