// FILE: route.ts (api/backup/latest)
// AANGEMAAKT: 02-04-2026 10:00
// VERSIE: 1
// GEWIJZIGD: 02-04-2026 10:00
//
// WIJZIGINGEN (02-04-2026 10:00):
// - Initiële aanmaak: GET retourneert inhoud van nieuwste backup-bestand

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'Backup');

export function GET() {
  try {
    const metaPath = path.join(BACKUP_DIR, 'backup-meta.json');
    if (!fs.existsSync(metaPath)) {
      return NextResponse.json({ error: 'Geen backup beschikbaar.' }, { status: 404 });
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as { latestBackup: string };

    // Valideer bestandsnaam (alleen backup_*.json uit BACKUP_DIR)
    if (!/^backup_[\d_-]+\.json$/.test(meta.latestBackup)) {
      return NextResponse.json({ error: 'Ongeldig backup-bestandsnaam.' }, { status: 400 });
    }

    const bestandsPad = path.join(BACKUP_DIR, meta.latestBackup);
    if (!fs.existsSync(bestandsPad)) {
      return NextResponse.json({ error: 'Backup-bestand niet gevonden.' }, { status: 404 });
    }

    const inhoud = JSON.parse(fs.readFileSync(bestandsPad, 'utf-8'));
    return NextResponse.json(inhoud);
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Fout bij lezen backup.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
