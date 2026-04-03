// FILE: db.ts
// AANGEMAAKT: 25-03-2026 10:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 22:00
//
// WIJZIGINGEN (25-03-2026 10:00):
// - Initiële aanmaak: singleton SQLite verbinding naar fbs.db
// WIJZIGINGEN (03-04-2026 22:00):
// - Migratie: cat_uitklappen kolom toegevoegd aan instellingen tabel

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'fbs.db');

declare global {
  // eslint-disable-next-line no-var
  var _db: Database.Database | undefined;
}

function getDb(): Database.Database {
  if (!global._db) {
    global._db = new Database(DB_PATH);
    global._db.pragma('journal_mode = WAL');
    global._db.pragma('foreign_keys = ON');
    // Migratie: beheerd kolom toevoegen indien nog niet aanwezig
    try {
      global._db.prepare('ALTER TABLE rekeningen ADD COLUMN beheerd INTEGER DEFAULT 1').run();
      global._db.prepare('UPDATE rekeningen SET beheerd = 1 WHERE beheerd IS NULL').run();
    } catch { /* kolom bestaat al */ }
    global._db.prepare(`
      CREATE TABLE IF NOT EXISTS genegeerde_rekeningen (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        iban TEXT NOT NULL UNIQUE,
        datum_toegevoegd TEXT NOT NULL DEFAULT (date('now'))
      )
    `).run();
    // Migratie: cat_uitklappen kolom aan instellingen toevoegen indien nog niet aanwezig
    try {
      global._db.prepare('ALTER TABLE instellingen ADD COLUMN cat_uitklappen INTEGER DEFAULT 1').run();
    } catch { /* kolom bestaat al */ }
    // Zet bestaande rijen op 1 als de waarde nog 0 is (eerste keer na kolom-aanmaak)
    try {
      global._db.prepare('UPDATE instellingen SET cat_uitklappen = 1 WHERE cat_uitklappen = 0').run();
    } catch { /* geen actie nodig */ }
  }
  return global._db;
}

export default getDb;
