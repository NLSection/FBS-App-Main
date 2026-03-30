// FILE: migrations.ts
// AANGEMAAKT: 25-03-2026 10:00
// VERSIE: 1
// GEWIJZIGD: 30-03-2026 00:00
//
// WIJZIGINGEN (25-03-2026 18:30):
// - Initiële aanmaak: CREATE TABLE IF NOT EXISTS voor imports en transacties
// - Tabellen rekeningen en vaste_lasten_config toegevoegd
// - verwachte_dag en verwacht_bedrag kolommen toegevoegd aan vaste_lasten_config
// - UNIQUE INDEX op volgnummer toegevoegd voor duplicaatdetectie
// - Tabel categorieen toegevoegd
// - Idempotente migratie type systeem: overig/vast/spaar/omboeking → normaal-af/bij + omboeking-af/bij
// WIJZIGINGEN (25-03-2026 19:30):
// - Tabel budgetten_potjes toegevoegd met standaard seed-records
// WIJZIGINGEN (25-03-2026 21:00):
// - Tabel instellingen toegevoegd met seed maand_start_dag = 27
// WIJZIGINGEN (26-03-2026 17:00):
// - Kolommen handmatig_gecategoriseerd en originele_datum toegevoegd aan transacties
// - Kolom kleur toegevoegd aan budgetten_potjes
// - Stap 6: seed kleuren voor bestaande budgetten_potjes records
// WIJZIGINGEN (26-03-2026 18:00):
// - Stap 7: cleanup transacties/imports zonder volgnummer (geïmporteerd vóór kolomnaam-fix)
// - Stap 8: herseeden badge-kleuren verwijderd (overschreef user-kleuren); Omboekingen als beschermde categorie; Vaste Lasten/Overige Uitgaven ontgrendeld
// WIJZIGINGEN (30-03-2026 00:00):
// - Stap 9: eenmalige migratie naar zacht kleurenpalet; auto-kleur kiest maximale hue-afstand
// WIJZIGINGEN (26-03-2026 19:00):
// - Stap 3: kolom fout_geboekt INTEGER DEFAULT 0 toegevoegd aan transacties
// - Stap 8: Overige Uitgaven kleur gewijzigd van #a0a8c0 naar #63e6be

import getDb from '@/lib/db';

// Nieuwe transacties tabel DDL — gedeeld door fresh install en migratie
const TRANSACTIES_DDL = `
  CREATE TABLE transacties (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    import_id                   INTEGER NOT NULL REFERENCES imports(id),

    -- Rabobank CSV kolommen
    iban_bban                   TEXT,
    munt                        TEXT,
    bic                         TEXT,
    volgnummer                  TEXT,
    datum                       TEXT,
    rentedatum                  TEXT,
    bedrag                      REAL,
    saldo_na_trn                REAL,
    tegenrekening_iban_bban     TEXT,
    naam_tegenpartij            TEXT,
    naam_uiteindelijke_partij   TEXT,
    naam_initierende_partij     TEXT,
    bic_tegenpartij             TEXT,
    code                        TEXT,
    batch_id                    TEXT,
    transactiereferentie        TEXT,
    machtigingskenmerk          TEXT,
    incassant_id                TEXT,
    betalingskenmerk            TEXT,
    omschrijving_1              TEXT,
    omschrijving_2              TEXT,
    omschrijving_3              TEXT,
    reden_retour                TEXT,
    oorspr_bedrag               REAL,
    oorspr_munt                 TEXT,
    koers                       REAL,

    -- App-velden
    type          TEXT NOT NULL DEFAULT 'normaal-af'
                      CHECK(type IN ('normaal-af','normaal-bij','omboeking-af','omboeking-bij')),
    status        TEXT NOT NULL DEFAULT 'nieuw'
                      CHECK(status IN ('nieuw','verwerkt')),
    categorie_id  INTEGER
  )
`;

export function runMigrations(): void {
  const db = getDb();

  // ── Stap 1: Type-systeem migratie (idempotent) ────────────────────────────
  // Check of de transacties tabel nog het oude type systeem heeft
  const schemaRij = db
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='transacties'")
    .get() as { sql: string } | undefined;

  if (schemaRij?.sql?.includes("'overig'")) {
    db.exec('PRAGMA foreign_keys=OFF');
    db.transaction(() => {
      db.exec('ALTER TABLE transacties RENAME TO transacties_oud');
      db.exec(TRANSACTIES_DDL);
      db.exec(`
        INSERT INTO transacties
        SELECT
          id, import_id,
          iban_bban, munt, bic, volgnummer, datum, rentedatum,
          bedrag, saldo_na_trn,
          tegenrekening_iban_bban, naam_tegenpartij,
          naam_uiteindelijke_partij, naam_initierende_partij,
          bic_tegenpartij, code, batch_id, transactiereferentie,
          machtigingskenmerk, incassant_id, betalingskenmerk,
          omschrijving_1, omschrijving_2, omschrijving_3,
          reden_retour, oorspr_bedrag, oorspr_munt, koers,
          CASE type
            WHEN 'vast'      THEN 'normaal-af'
            WHEN 'overig'    THEN CASE WHEN bedrag < 0 THEN 'normaal-af' ELSE 'normaal-bij' END
            WHEN 'spaar'     THEN CASE WHEN bedrag < 0 THEN 'omboeking-af' ELSE 'omboeking-bij' END
            WHEN 'omboeking' THEN CASE WHEN bedrag < 0 THEN 'omboeking-af' ELSE 'omboeking-bij' END
            ELSE 'normaal-af'
          END,
          status, categorie_id
        FROM transacties_oud
      `);
      db.exec('DROP TABLE transacties_oud');
    })();
    db.exec('PRAGMA foreign_keys=ON');
  }

  // ── Stap 2: Initiële tabellen aanmaken (fresh install) ───────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS imports (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      bestandsnaam        TEXT    NOT NULL,
      geimporteerd_op     TEXT    NOT NULL,
      aantal_transacties  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rekeningen (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      iban  TEXT    NOT NULL UNIQUE,
      naam  TEXT    NOT NULL,
      type  TEXT    NOT NULL CHECK(type IN ('betaal','spaar'))
    );

    CREATE TABLE IF NOT EXISTS vaste_lasten_config (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      iban         TEXT NOT NULL,
      naam         TEXT NOT NULL,
      omschrijving TEXT,
      label        TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categorieen (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      iban                   TEXT,
      naam_zoekwoord         TEXT,
      naam_origineel         TEXT,
      omschrijving_zoekwoord TEXT,
      categorie              TEXT NOT NULL,
      subcategorie           TEXT,
      type                   TEXT NOT NULL DEFAULT 'alle'
                                 CHECK(type IN ('normaal-af','normaal-bij','omboeking-af','omboeking-bij','alle')),
      laatste_gebruik        TEXT
    );

    CREATE TABLE IF NOT EXISTS budgetten_potjes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      naam        TEXT    NOT NULL UNIQUE,
      type        TEXT    NOT NULL CHECK(type IN ('budget','potje')),
      rekening_id INTEGER REFERENCES rekeningen(id),
      beschermd   INTEGER NOT NULL DEFAULT 0
    );
  `);

  // transacties apart: gebruikt de gedeelde DDL-constante (zonder IF NOT EXISTS)
  const transactiesBestaatAl = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='transacties'")
    .get();
  if (!transactiesBestaatAl) {
    db.exec(TRANSACTIES_DDL);
  }

  // ── Stap 3: Idempotente kolom- en indexmigraties ─────────────────────────
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_transacties_volgnummer ON transacties(volgnummer)');
  try { db.exec('ALTER TABLE vaste_lasten_config ADD COLUMN verwachte_dag INTEGER'); } catch { /* bestaat al */ }
  try { db.exec('ALTER TABLE vaste_lasten_config ADD COLUMN verwacht_bedrag REAL'); } catch { /* bestaat al */ }
  try { db.exec('ALTER TABLE transacties ADD COLUMN handmatig_gecategoriseerd INTEGER DEFAULT 0'); } catch { /* bestaat al */ }
  try { db.exec('ALTER TABLE transacties ADD COLUMN originele_datum TEXT'); } catch { /* bestaat al */ }
  try { db.exec('ALTER TABLE budgetten_potjes ADD COLUMN kleur TEXT'); } catch { /* bestaat al */ }
  try { db.exec('ALTER TABLE transacties ADD COLUMN fout_geboekt INTEGER DEFAULT 0'); } catch { /* bestaat al */ }

  // ── Stap 4: Seed budgetten_potjes als tabel leeg is ──────────────────────
  // ── Stap 5: Instellingen tabel + seed ────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS instellingen (
      id               INTEGER PRIMARY KEY CHECK(id = 1),
      maand_start_dag  INTEGER NOT NULL DEFAULT 27
    )
  `);
  const instLeeg = db.prepare('SELECT COUNT(*) AS n FROM instellingen').get() as { n: number };
  if (instLeeg.n === 0) {
    db.prepare('INSERT INTO instellingen (id, maand_start_dag) VALUES (1, 27)').run();
  }

  // ── (origineel stap 4 — hernummerd naar na stap 5 voor leesbaarheid) ─────
  const bpAantal = db.prepare('SELECT COUNT(*) AS n FROM budgetten_potjes').get() as { n: number };
  if (bpAantal.n === 0) {
    const ins = db.prepare('INSERT INTO budgetten_potjes (naam, type, beschermd) VALUES (?, ?, ?)');
    db.transaction(() => {
      ins.run('Vaste Lasten',     'budget', 1);
      ins.run('Overige Uitgaven', 'budget', 1);
      for (const naam of ['Boodschappen','Brandstof','Uit Eten','Uitjes','Zorg','Kleding','Sparen']) {
        ins.run(naam, 'potje', 0);
      }
    })();
  }

  // ── Stap 6: Seed kleuren voor budgetten_potjes ────────────────────────────
  const KLEUR_PALETTE = ['#f06595','#ff8787','#ffa94d','#ffd43b','#a9e34b','#69db7c',
                         '#38d9a9','#4dabf7','#748ffc','#da77f2','#f783ac','#63e6be'];
  db.prepare("UPDATE budgetten_potjes SET kleur = '#5c7cfa' WHERE naam = 'Vaste Lasten' AND kleur IS NULL").run();
  db.prepare("UPDATE budgetten_potjes SET kleur = '#a0a8c0' WHERE naam = 'Overige Uitgaven' AND kleur IS NULL").run();
  const zonderKleur = db.prepare('SELECT id FROM budgetten_potjes WHERE kleur IS NULL ORDER BY id ASC').all() as { id: number }[];
  const kleurStmt = db.prepare('UPDATE budgetten_potjes SET kleur = ? WHERE id = ?');
  zonderKleur.forEach((rij, index) => {
    kleurStmt.run(KLEUR_PALETTE[index % KLEUR_PALETTE.length], rij.id);
  });

  // ── Stap 8: Omboekingen als beschermde categorie + Vaste Lasten/Overige Uitgaven ontgrendeld
  const ombRij = db.prepare("SELECT id FROM budgetten_potjes WHERE naam = 'Omboekingen'").get() as { id: number } | undefined;
  if (!ombRij) {
    db.prepare("INSERT INTO budgetten_potjes (naam, rekening_id, beschermd, kleur) VALUES ('Omboekingen', NULL, 1, '#00BCD4')").run();
  } else {
    db.prepare("UPDATE budgetten_potjes SET beschermd = 1 WHERE naam = 'Omboekingen'").run();
  }
  db.prepare("UPDATE budgetten_potjes SET beschermd = 0 WHERE naam IN ('Vaste Lasten', 'Overige Uitgaven')").run();

  // ── Stap 9: Eenmalige migratie naar zacht kleurenpalet ─────────────────
  // Vaste toewijzing per naam — draait idempotent, alleen als kleur nog niet handmatig gewijzigd is
  const ZACHTE_KLEUREN: Record<string, string> = {
    'Vaste Lasten':     '#748ffc', // blauw
    'Overige Uitgaven': '#f4a7b9', // roze
    'Boodschappen':     '#7cdba8', // mint
    'Brandstof':        '#f4b77c', // warm oranje
    'Uit Eten':         '#e4a0f4', // lila
    'Uitjes':           '#8bd4f4', // hemelsblauw
    'Zorg':             '#a78bfa', // lavendel
    'Kleedgeld Max':    '#f4d87c', // zachtgeel
    'Sparen':           '#b8a7f4', // violet
  };
  const ALLE_OUDE_KLEUREN = new Set([
    '#69db7c','#ffa94d','#f783ac','#da77f2','#38d9a9','#4dabf7','#ffd43b','#ff8787','#63e6be',
    '#5c7cfa','#a0a8c0','#748ffc',
    '#7cdba8','#f4b77c','#f4a7b9','#e4a0f4','#7cf4e4','#8bd4f4','#f4d87c','#f49dad','#a7f4cb',
  ]);
  for (const [naam, kleur] of Object.entries(ZACHTE_KLEUREN)) {
    db.prepare('UPDATE budgetten_potjes SET kleur = ? WHERE naam = ? AND kleur IN (' +
      [...ALLE_OUDE_KLEUREN].map(() => '?').join(',') + ')')
      .run(kleur, naam, ...ALLE_OUDE_KLEUREN);
  }

  // ── Stap 7: Cleanup pre-fix imports zonder volgnummer ────────────────────
  // Transacties geïmporteerd vóór de 'Volgnr'-fix hebben volgnummer = NULL.
  // Als er transacties zijn maar geen enkel volgnummer gevuld is, zijn ze
  // onbruikbaar voor deduplicatie en worden ze verwijderd zodat herImport correct werkt.
  const totaalTrn    = db.prepare('SELECT COUNT(*) AS n FROM transacties').get() as { n: number };
  const metVolgNr    = db.prepare('SELECT COUNT(*) AS n FROM transacties WHERE volgnummer IS NOT NULL').get() as { n: number };
  if (totaalTrn.n > 0 && metVolgNr.n === 0) {
    db.transaction(() => {
      db.exec('DELETE FROM transacties');
      db.exec('DELETE FROM imports');
    })();
  }
}
