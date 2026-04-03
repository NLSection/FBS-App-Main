// FILE: route.ts (api/backup/check)
// AANGEMAAKT: 02-04-2026 10:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 16:45
//
// WIJZIGINGEN (03-04-2026 16:45):
// - Vergelijking op bestandsnaam i.p.v. mtime (cross-device sync)
// WIJZIGINGEN (02-04-2026 10:00):
// - Initiële aanmaak: GET vergelijkt nieuwste backup met db-mtime

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import getDb from '@/lib/db';

const BACKUP_DIR = path.join(process.cwd(), 'backup');

export function GET() {
  let backupIsNieuwer = false;
  let backupDatum: string | null = null;
  let backupBestand: string | null = null;

  try {
    const metaPath = path.join(BACKUP_DIR, 'backup-meta.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as { latestBackup: string; dbMtime: string };
      backupBestand = meta.latestBackup;
      backupDatum   = meta.dbMtime;

      // Vergelijk met laatst herstelde/aangemaakte backup op dit apparaat
      const row = getDb()
        .prepare('SELECT laatst_herstelde_backup FROM instellingen WHERE id = 1')
        .get() as { laatst_herstelde_backup: string | null } | undefined;

      const laatstHersteld = row?.laatst_herstelde_backup ?? null;
      backupIsNieuwer = meta.latestBackup !== laatstHersteld;
    }
  } catch {
    // Geen backup of geen db — geen melding tonen
  }

  return NextResponse.json({ backupIsNieuwer, backupDatum, backupBestand });
}
