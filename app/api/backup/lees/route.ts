import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { BACKUP_DIR, leesBackupBestand } from '@/lib/backup';
import getDb from '@/lib/db';

export function GET(request: NextRequest) {
  const bron = request.nextUrl.searchParams.get('bron') ?? 'lokaal';
  const bestand = request.nextUrl.searchParams.get('bestand');

  if (!bestand) return NextResponse.json({ error: 'Bestandsnaam is verplicht.' }, { status: 400 });
  if (!/^backup_[\d_-]+\.(json|json\.gz|enc\.gz)$/.test(bestand)) {
    return NextResponse.json({ error: 'Ongeldig bestandsnaam.' }, { status: 400 });
  }

  try {
    let dir: string;
    if (bron === 'extern') {
      const row = getDb().prepare('SELECT backup_extern_pad FROM instellingen WHERE id = 1').get() as { backup_extern_pad: string | null } | undefined;
      if (!row?.backup_extern_pad) return NextResponse.json({ error: 'Geen externe locatie ingesteld.' }, { status: 400 });
      dir = row.backup_extern_pad;
    } else {
      dir = BACKUP_DIR;
    }

    const bestandsPad = path.join(dir, bestand);
    if (!fs.existsSync(bestandsPad)) return NextResponse.json({ error: 'Bestand niet gevonden.' }, { status: 404 });

    // Voor versleutelde bestanden: gebruik de opgeslagen hash en salt
    let hash: string | undefined;
    let salt: string | undefined;
    if (bestand.endsWith('.enc.gz')) {
      const enc = getDb().prepare('SELECT backup_encryptie_hash, backup_encryptie_salt FROM instellingen WHERE id = 1').get() as { backup_encryptie_hash: string | null; backup_encryptie_salt: string | null } | undefined;
      if (!enc?.backup_encryptie_hash || !enc?.backup_encryptie_salt) {
        return NextResponse.json({ error: 'Versleutelde backup maar geen wachtwoord ingesteld op dit apparaat.' }, { status: 400 });
      }
      hash = enc.backup_encryptie_hash;
      salt = enc.backup_encryptie_salt;
    }

    const data = leesBackupBestand(bestandsPad, hash, salt);
    return NextResponse.json(data);
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Fout bij lezen backup.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
