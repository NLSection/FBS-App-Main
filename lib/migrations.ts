// FILE: migrations.ts
// AANGEMAAKT: 25-03-2026 10:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 16:45
//
// WIJZIGINGEN (03-04-2026 16:45):
// - Stap 14: kolom laatst_herstelde_backup voor cross-device backup sync
// WIJZIGINGEN (31-03-2026 20:00):
// - Stap 12: tabel transactie_aanpassingen aangemaakt; bestaande aanpassingen gemigreerd uit transacties
// WIJZIGINGEN (30-03-2026 21:00):
// - Stap 3: kolom toelichting TEXT toegevoegd aan categorieen
// WIJZIGINGEN (30-03-2026 19:00):
// - Stap 3: kolom toelichting TEXT toegevoegd aan transacties
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
// WIJZIGINGEN (30-03-2026 12:00):
// - 'type' kolom verwijderd uit seed INSERT voor budgetten_potjes (kolom bestaat niet meer)
// - Seed voor budgetten_potjes verwijderd: voorkomt dat categorieën na reset opnieuw verschijnen
// WIJZIGINGEN (30-03-2026 16:00):
// - Stap 10: koppeltabel budgetten_potjes_rekeningen aangemaakt; bestaande rekening_id gemigreerd

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
  try { db.exec('ALTER TABLE transacties ADD COLUMN toelichting TEXT'); } catch { /* bestaat al */ }
  try { db.exec('ALTER TABLE categorieen ADD COLUMN toelichting TEXT'); } catch { /* bestaat al */ }

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
    db.prepare("INSERT INTO budgetten_potjes (naam, type, rekening_id, beschermd, kleur) VALUES ('Omboekingen', 'potje', NULL, 1, '#00BCD4')").run();
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

  // ── Stap 10: Koppeltabel budgetten_potjes_rekeningen (many-to-many) ───────
  db.exec(`
    CREATE TABLE IF NOT EXISTS budgetten_potjes_rekeningen (
      potje_id    INTEGER NOT NULL REFERENCES budgetten_potjes(id) ON DELETE CASCADE,
      rekening_id INTEGER NOT NULL REFERENCES rekeningen(id) ON DELETE CASCADE,
      PRIMARY KEY (potje_id, rekening_id)
    )
  `);
  // Migreer bestaande rekening_id waarden naar de koppeltabel
  const bprLeeg = db.prepare('SELECT COUNT(*) AS n FROM budgetten_potjes_rekeningen').get() as { n: number };
  if (bprLeeg.n === 0) {
    db.prepare(`
      INSERT OR IGNORE INTO budgetten_potjes_rekeningen (potje_id, rekening_id)
      SELECT id, rekening_id FROM budgetten_potjes WHERE rekening_id IS NOT NULL
    `).run();
  }

  // ── Stap 11: "Aangepast" als beschermd systeemitem ─────────────────────
  const aangepastRij = db.prepare("SELECT id FROM budgetten_potjes WHERE naam = 'Aangepast'").get() as { id: number } | undefined;
  if (!aangepastRij) {
    db.prepare("INSERT INTO budgetten_potjes (naam, type, rekening_id, beschermd, kleur) VALUES ('Aangepast', 'potje', NULL, 1, '#e8590c')").run();
  } else {
    db.prepare("UPDATE budgetten_potjes SET beschermd = 1 WHERE naam = 'Aangepast'").run();
  }

  // ── Stap 12: transactie_aanpassingen tabel + migratie ───────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactie_aanpassingen (
      transactie_id             INTEGER PRIMARY KEY REFERENCES transacties(id) ON DELETE CASCADE,
      datum_aanpassing          TEXT,
      categorie_id              INTEGER REFERENCES categorieen(id),
      categorie                 TEXT,
      subcategorie              TEXT,
      status                    TEXT NOT NULL DEFAULT 'nieuw',
      handmatig_gecategoriseerd INTEGER NOT NULL DEFAULT 0,
      fout_geboekt              INTEGER NOT NULL DEFAULT 0,
      toelichting               TEXT
    )
  `);

  // Eenmalige datamisgratie: kopieer bestaande aanpassingen uit transacties
  // Alleen uitvoeren als de legacy-kolom 'categorie' nog op de transacties tabel staat
  const heeftCategorieKolom = (db.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('transacties') WHERE name = 'categorie'").get() as { n: number }).n > 0;
  const aanpassingenLeeg = db.prepare('SELECT COUNT(*) AS n FROM transactie_aanpassingen').get() as { n: number };
  if (aanpassingenLeeg.n === 0 && heeftCategorieKolom) {
    db.transaction(() => {
      db.prepare(`
        INSERT OR IGNORE INTO transactie_aanpassingen
          (transactie_id, datum_aanpassing, categorie_id, categorie, subcategorie,
           status, handmatig_gecategoriseerd, fout_geboekt, toelichting)
        SELECT
          id,
          CASE WHEN originele_datum IS NOT NULL THEN datum ELSE NULL END,
          CASE WHEN categorie_id IS NOT NULL AND EXISTS (SELECT 1 FROM categorieen WHERE id = transacties.categorie_id) THEN categorie_id ELSE NULL END,
          categorie,
          subcategorie,
          COALESCE(status, 'nieuw'),
          COALESCE(handmatig_gecategoriseerd, 0),
          COALESCE(fout_geboekt, 0),
          toelichting
        FROM transacties
        WHERE categorie_id IS NOT NULL
           OR categorie IS NOT NULL
           OR originele_datum IS NOT NULL
           OR status = 'verwerkt'
           OR COALESCE(handmatig_gecategoriseerd, 0) = 1
           OR COALESCE(fout_geboekt, 0) = 1
           OR toelichting IS NOT NULL
      `).run();
      // Herstel originele importdatum voor verplaatste transacties
      db.prepare('UPDATE transacties SET datum = originele_datum WHERE originele_datum IS NOT NULL').run();
    })();
  }

  // ── Stap 13: Dashboard weergave-instellingen ─────────────────────────────
  try { db.exec('ALTER TABLE instellingen ADD COLUMN dashboard_bls_tonen     INTEGER NOT NULL DEFAULT 1'); } catch {}
  try { db.exec('ALTER TABLE instellingen ADD COLUMN dashboard_cat_tonen     INTEGER NOT NULL DEFAULT 1'); } catch {}
  try { db.exec('ALTER TABLE instellingen ADD COLUMN dashboard_bls_uitgeklapt INTEGER NOT NULL DEFAULT 0'); } catch {}
  try { db.exec('ALTER TABLE instellingen ADD COLUMN dashboard_cat_uitgeklapt INTEGER NOT NULL DEFAULT 1'); } catch {}

  // ── Stap 14: Laatst herstelde backup bijhouden (cross-device sync) ───────
  try { db.exec("ALTER TABLE instellingen ADD COLUMN laatst_herstelde_backup TEXT DEFAULT NULL"); } catch {}

  // ── Stap 15: Transacties in subcategorieën standaard uitgeklapt ─────────
  try { db.exec("ALTER TABLE instellingen ADD COLUMN cat_trx_uitgeklapt INTEGER NOT NULL DEFAULT 0"); } catch {}

  // ── Stap 16: Vaste lasten overzicht instellingen ───────────────────────
  try { db.exec("ALTER TABLE instellingen ADD COLUMN vaste_lasten_overzicht_maanden INTEGER NOT NULL DEFAULT 4"); } catch {}
  try { db.exec("ALTER TABLE instellingen ADD COLUMN vaste_lasten_afwijking_procent INTEGER NOT NULL DEFAULT 5"); } catch {}

  // ── Stap 17: Kleur kolom op rekeningen ──────────────────────────────────
  try { db.exec("ALTER TABLE rekeningen ADD COLUMN kleur TEXT DEFAULT NULL"); } catch {}

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
