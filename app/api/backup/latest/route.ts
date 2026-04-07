// FILE: route.ts (api/backup/latest)
// AANGEMAAKT: 02-04-2026 10:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 10:00
//
// WIJZIGINGEN (03-04-2026 10:00):
// - BACKUP_DIR lowercase: backup/ i.p.v. Backup/
// WIJZIGINGEN (02-04-2026 10:00):
// - Initiële aanmaak: GET retourneert inhoud van nieuwste backup-bestand

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DB_PATH } from '@/lib/db';
import { leesBackupBestand } from '@/lib/backup';

const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backup');

export function GET() {
  try {
    const metaPath = path.join(BACKUP_DIR, 'backup-meta.json');
    if (!fs.existsSync(metaPath)) {
      return NextResponse.json({ error: 'Geen backup beschikbaar.' }, { status: 404 });
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as { latestBackup: string };

    // Valideer bestandsnaam (alleen backup_*.json of .json.gz uit BACKUP_DIR)
    if (!/^backup_[\d_-]+\.json(\.gz)?$/.test(meta.latestBackup)) {
      return NextResponse.json({ error: 'Ongeldig backup-bestandsnaam.' }, { status: 400 });
    }

    const bestandsPad = path.join(BACKUP_DIR, meta.latestBackup);
    if (!fs.existsSync(bestandsPad)) {
      return NextResponse.json({ error: 'Backup-bestand niet gevonden.' }, { status: 404 });
    }

    const inhoud = leesBackupBestand(bestandsPad);
    return NextResponse.json(inhoud);
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Fout bij lezen backup.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
