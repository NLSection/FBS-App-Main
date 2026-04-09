// FILE: db.ts
// AANGEMAAKT: 25-03-2026 10:00
// VERSIE: 1
// GEWIJZIGD: 04-04-2026 22:30
//
// WIJZIGINGEN (25-03-2026 10:00):
// - Initiële aanmaak: singleton SQLite verbinding naar fbs.db
// WIJZIGINGEN (03-04-2026 22:00):
// - Migratie: cat_uitklappen kolom toegevoegd aan instellingen tabel
// WIJZIGINGEN (04-04-2026 22:30):
// - Fix: UPDATE die cat_uitklappen=0 steeds resette naar 1 verwijderd

import Database from 'better-sqlite3';
import path from 'path';

export const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'fbs.db');

declare global {
  // eslint-disable-next-line no-var
  var _db: Database.Database | undefined;
}

function getDb(): Database.Database {
  if (!global._db) {
    global._db = new Database(DB_PATH);
    global._db.pragma('journal_mode = WAL');
    global._db.pragma('foreign_keys = ON');
    global._db.pragma('cache_size = -32768');
    global._db.pragma('mmap_size = 134217728');
    global._db.pragma('temp_store = MEMORY');
    // (beheerd kolom verwijderd in migratie stap 20)
    global._db.prepare(`
      CREATE TABLE IF NOT EXISTS genegeerde_rekeningen (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        iban TEXT NOT NULL UNIQUE,
        datum_toegevoegd TEXT NOT NULL DEFAULT (date('now'))
      )
    `).run();
    // Idempotente kolom-checks (fallback naast runMigrations)
    try { global._db.prepare('ALTER TABLE instellingen ADD COLUMN cat_uitklappen INTEGER DEFAULT 1').run(); } catch {}
    try { global._db.prepare('ALTER TABLE instellingen ADD COLUMN vaste_posten_buffer REAL NOT NULL DEFAULT 0').run(); } catch {}
    try { global._db.prepare('ALTER TABLE instellingen ADD COLUMN vaste_posten_vergelijk_maanden INTEGER DEFAULT 3').run(); } catch {}
    try { global._db.prepare('ALTER TABLE rekeningen ADD COLUMN kleur_auto INTEGER NOT NULL DEFAULT 1').run(); } catch {}
    try { global._db.prepare('ALTER TABLE budgetten_potjes ADD COLUMN kleur_auto INTEGER NOT NULL DEFAULT 1').run(); } catch {}
  }
  return global._db;
}

export default getDb;
