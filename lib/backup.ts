// FILE: backup.ts
// AANGEMAAKT: 02-04-2026 10:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 16:45
//
// WIJZIGINGEN (03-04-2026 16:45):
// - Na backup: laatst_herstelde_backup bijwerken zodat bronapparaat geen melding krijgt
// WIJZIGINGEN (02-04-2026 10:00):
// - Initiële aanmaak: triggerBackup() — asynchroon JSON-export + rotatie tot 10 bestanden

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import getDb from './db';

function getBackupPaths() {
  const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), 'fbs.db');
  return { dbPath, backupDir: path.join(path.dirname(dbPath), 'backup') };
}
const TABELLEN   = ['transacties', 'transactie_aanpassingen', 'imports', 'categorieen', 'budgetten_potjes', 'rekeningen', 'instellingen'];
const MAX_BACKUPS = 10;

export function triggerBackup(): void {
  setImmediate(() => {
    try {
      const { dbPath: DB_PATH, backupDir: BACKUP_DIR } = getBackupPaths();
      fs.mkdirSync(BACKUP_DIR, { recursive: true });

      const db = getDb();
      const backup: Record<string, unknown[]> = {};
      for (const tabel of TABELLEN) {
        try {
          backup[tabel] = db.prepare(`SELECT * FROM "${tabel}"`).all();
        } catch {
          backup[tabel] = [];
        }
      }

      // Timestamp in Amsterdam-tijd als bestandsnaam
      const nu = new Date();
      const stamp = nu.toLocaleString('sv-SE', { timeZone: 'Europe/Amsterdam' })
        .replace(' ', '_')
        .replace(/:/g, '-');
      const naam = `backup_${stamp}.json`;

      fs.writeFileSync(path.join(BACKUP_DIR, naam), JSON.stringify(backup), 'utf-8');

      // Sla db-mtime op zodat check-endpoint weet wanneer de backup gemaakt is
      const dbMtime = fs.statSync(/* turbopackIgnore: true */ DB_PATH).mtime.toISOString();
      fs.writeFileSync(
        path.join(BACKUP_DIR, 'backup-meta.json'),
        JSON.stringify({ latestBackup: naam, dbMtime }),
        'utf-8'
      );

      // Markeer deze backup als "bekend" op dit apparaat (voorkomt eigen melding)
      try {
        db.prepare('UPDATE instellingen SET laatst_herstelde_backup = ? WHERE id = 1').run(naam);
      } catch { /* kolom bestaat mogelijk nog niet bij eerste run */ }

      // Rotatie: oudste verwijderen als er meer dan MAX_BACKUPS zijn
      const bestanden = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
        .sort();
      if (bestanden.length > MAX_BACKUPS) {
        for (const f of bestanden.slice(0, bestanden.length - MAX_BACKUPS)) {
          fs.unlinkSync(path.join(BACKUP_DIR, f));
        }
      }

      // Git commit + push van volledige backup/ map (asynchroon, fouten worden alleen gelogd)
      const cmd = 'git add backup/ && git commit -m "backup: auto [skip ci]" && git push';
      exec(cmd, { cwd: process.cwd() }, (err, _stdout, stderr) => {
        if (err) {
          console.warn('[backup] Git sync mislukt (niet fataal):', stderr || err.message);
        }
      });
    } catch (err) {
      console.error('[backup] Automatische backup mislukt:', err);
    }
  });
}
