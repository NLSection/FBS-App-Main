import { NextResponse } from 'next/server';
import fsp from 'fs/promises';
import path from 'path';
import getDb from '@/lib/db';
import { BACKUP_DIR } from '@/lib/backup';

interface BackupMeta {
  latestBackup: string;
  dbMtime: string;
  backupTijd?: string;
  apparaatId?: string;
  versie?: number;
}

async function leesMetaBestand(metaPad: string): Promise<BackupMeta | null> {
  try {
    const inhoud = await fsp.readFile(metaPad, 'utf-8');
    return JSON.parse(inhoud) as BackupMeta;
  } catch {
    return null;
  }
}

export async function GET() {
  let backupIsNieuwer = false;
  let backupDatum: string | null = null;
  let backupBestand: string | null = null;
  let bron: 'lokaal' | 'extern' | null = null;
  let forkDetected = false;
  let pendingExtern = 0;
  let encryptieConfigMismatch = false;
  let encryptieConfigOntbreekt = false;

  try {
    const db = getDb();
    const row = db.prepare('SELECT laatst_herstelde_backup, apparaat_id, backup_extern_pad, backup_versie, backup_encryptie_hash FROM instellingen WHERE id = 1')
      .get() as { laatst_herstelde_backup: string | null; apparaat_id: string | null; backup_extern_pad: string | null; backup_versie: number; backup_encryptie_hash: string | null } | undefined;

    const eigenApparaatId = row?.apparaat_id ?? null;
    const externPad = row?.backup_extern_pad ?? null;
    const lokaleVersie = row?.backup_versie ?? 0;

    // Lokale en externe meta parallel ophalen (niet-blokkerend)
    const [lokaalMeta, externMeta] = await Promise.all([
      leesMetaBestand(path.join(BACKUP_DIR, 'backup-meta.json')),
      externPad ? leesMetaBestand(path.join(externPad, 'backup-meta.json')) : Promise.resolve(null),
    ]);

    const lokaalVersie = lokaalMeta?.versie ?? 0;
    const externVersie = externMeta?.versie ?? 0;

    if (lokaalMeta && lokaalVersie > lokaleVersie) {
      backupIsNieuwer = true;
      backupBestand = lokaalMeta.latestBackup;
      backupDatum = lokaalMeta.backupTijd ?? lokaalMeta.dbMtime;
      bron = 'lokaal';
    }
    if (externMeta && externVersie > lokaleVersie && externVersie > lokaalVersie) {
      backupIsNieuwer = true;
      backupBestand = externMeta.latestBackup;
      backupDatum = externMeta.backupTijd ?? externMeta.dbMtime;
      bron = 'extern';
    }

    if (externMeta?.apparaatId && eigenApparaatId && externMeta.apparaatId !== eigenApparaatId) {
      if (externVersie > lokaleVersie && lokaalVersie > externVersie) {
        forkDetected = true;
      }
    }

    // Encryptie-configuratie mismatch (alleen als extern pad ingesteld is)
    if (externPad && row?.backup_encryptie_hash) {
      try {
        const configPad = path.join(externPad, 'backup-config.json');
        const configInhoud = await fsp.readFile(configPad, 'utf-8');
        const config = JSON.parse(configInhoud) as { hash?: string };
        if (config.hash && config.hash !== row.backup_encryptie_hash) {
          encryptieConfigMismatch = true;
        }
      } catch (e: unknown) {
        if ((e as NodeJS.ErrnoException)?.code !== 'ENOENT') {
          encryptieConfigOntbreekt = true;
        }
      }
    }

    // Verplaats pending-extern bestanden asynchroon
    const pendingDir = path.join(BACKUP_DIR, 'pending-extern');
    if (externPad) {
      try {
        const bestanden = (await fsp.readdir(pendingDir)).filter(f => f.startsWith('backup_'));
        if (bestanden.length > 0) {
          await fsp.mkdir(externPad, { recursive: true });
          await Promise.all(bestanden.map(async f => {
            await fsp.copyFile(path.join(pendingDir, f), path.join(externPad, f));
            await fsp.unlink(path.join(pendingDir, f));
          }));
          const resterend = await fsp.readdir(pendingDir);
          if (resterend.length === 0) await fsp.rmdir(pendingDir);
        }
      } catch { /* extern niet bereikbaar of pending-dir bestaat niet */ }
    }

    try {
      const resterend = await fsp.readdir(pendingDir);
      pendingExtern = resterend.filter(f => f.startsWith('backup_')).length;
    } catch { /* */ }

  } catch {
    // Geen backup of geen db — geen melding tonen
  }

  return NextResponse.json({ backupIsNieuwer, backupDatum, backupBestand, bron, forkDetected, pendingExtern, encryptieConfigMismatch, encryptieConfigOntbreekt });
}

/** POST: synchroniseer backup_versie naar het maximum van lokale en externe meta. */
export async function POST() {
  try {
    const db = getDb();
    const row = db.prepare('SELECT backup_extern_pad, backup_versie FROM instellingen WHERE id = 1')
      .get() as { backup_extern_pad: string | null; backup_versie: number } | undefined;

    let maxVersie = row?.backup_versie ?? 0;

    const [lokaalMeta, externMeta] = await Promise.all([
      leesMetaBestand(path.join(BACKUP_DIR, 'backup-meta.json')),
      row?.backup_extern_pad ? leesMetaBestand(path.join(row.backup_extern_pad, 'backup-meta.json')) : Promise.resolve(null),
    ]);

    if ((lokaalMeta?.versie ?? 0) > maxVersie) maxVersie = lokaalMeta!.versie!;
    if ((externMeta?.versie ?? 0) > maxVersie) maxVersie = externMeta!.versie!;

    db.prepare('UPDATE instellingen SET backup_versie = ? WHERE id = 1').run(maxVersie);
    return NextResponse.json({ ok: true, versie: maxVersie });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Fout.' }, { status: 500 });
  }
}
