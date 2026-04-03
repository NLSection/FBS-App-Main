// FILE: route.ts (api/backup/check)
// AANGEMAAKT: 02-04-2026 10:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 10:00
//
// WIJZIGINGEN (03-04-2026 10:00):
// - BACKUP_DIR lowercase: backup/ i.p.v. Backup/
// WIJZIGINGEN (02-04-2026 10:00):
// - Initiële aanmaak: GET vergelijkt nieuwste backup met db-mtime

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'backup');
const DB_PATH    = path.join(process.cwd(), 'fbs.db');

export function GET() {
  let backupIsNieuwer = false;
  let backupDatum: string | null = null;
  let dbDatum: string | null = null;
  let backupBestand: string | null = null;

  try {
    const metaPath = path.join(BACKUP_DIR, 'backup-meta.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as { latestBackup: string; dbMtime: string };
      backupBestand = meta.latestBackup;
      backupDatum   = meta.dbMtime;

      const dbStat = fs.statSync(DB_PATH);
      dbDatum = dbStat.mtime.toISOString();

      // Backup is nieuwer als de db-staat ten tijde van de backup jonger is dan de huidige db
      // (d.w.z. de db is teruggedraaid of gereset na de backup)
      backupIsNieuwer = new Date(meta.dbMtime) > dbStat.mtime;
    }
  } catch {
    // Geen backup of geen db — geen melding tonen
  }

  return NextResponse.json({ backupIsNieuwer, backupDatum, dbDatum, backupBestand });
}
