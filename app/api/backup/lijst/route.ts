import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { BACKUP_DIR } from '@/lib/backup';
import getDb from '@/lib/db';

export function GET(request: NextRequest) {
  const bron = request.nextUrl.searchParams.get('bron') ?? 'lokaal';

  try {
    let dir: string;
    if (bron === 'extern') {
      const row = getDb().prepare('SELECT backup_extern_pad FROM instellingen WHERE id = 1').get() as { backup_extern_pad: string | null } | undefined;
      if (!row?.backup_extern_pad) return NextResponse.json({ error: 'Geen externe locatie ingesteld.' }, { status: 400 });
      dir = row.backup_extern_pad;
      if (!fs.existsSync(dir)) return NextResponse.json({ error: 'Externe locatie niet bereikbaar.' }, { status: 503 });
    } else {
      dir = BACKUP_DIR;
    }

    const bestanden = fs.readdirSync(dir)
      .filter(f => f.startsWith('backup_') && (f.endsWith('.json') || f.endsWith('.json.gz') || f.endsWith('.enc.gz')))
      .sort()
      .reverse()
      .map(f => {
        const stat = fs.statSync(path.join(dir, f));
        return {
          naam: f,
          grootte: stat.size,
          datum: stat.mtime.toISOString(),
          versleuteld: f.endsWith('.enc.gz'),
        };
      });

    return NextResponse.json({ bron, bestanden });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Fout bij laden backup lijst.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
