import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import getDb, { DB_PATH } from '@/lib/db';
import { BACKUP_DIR } from '@/lib/backup';

interface BackupMeta {
  latestBackup: string;
  dbMtime: string;
  backupTijd?: string;
  apparaatId?: string;
  versie?: number;
}

export function GET() {
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

    const laatstHersteld = row?.laatst_herstelde_backup ?? null;
    const eigenApparaatId = row?.apparaat_id ?? null;
    const externPad = row?.backup_extern_pad ?? null;
    const lokaleVersie = row?.backup_versie ?? 0;

    // Check lokale backup-meta
    const lokaalMetaPath = path.join(BACKUP_DIR, 'backup-meta.json');
    let lokaalMeta: BackupMeta | null = null;
    if (fs.existsSync(lokaalMetaPath)) {
      lokaalMeta = JSON.parse(fs.readFileSync(lokaalMetaPath, 'utf-8'));
    }

    // Check externe backup-meta (als ingesteld en bereikbaar)
    let externMeta: BackupMeta | null = null;
    if (externPad) {
      try {
        const externMetaPath = path.join(externPad, 'backup-meta.json');
        if (fs.existsSync(externMetaPath)) {
          externMeta = JSON.parse(fs.readFileSync(externMetaPath, 'utf-8'));
        }
      } catch { /* extern niet bereikbaar */ }
    }

    // Bepaal of er een nieuwere backup is op basis van versienummer
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

    // Fork-detectie: alleen als BEIDE apparaten onafhankelijke wijzigingen hebben gemaakt.
    // externVersie > lokaleVersie = extern is vooruit (ander apparaat heeft gebackupt)
    // lokaalVersie > externVersie = dit apparaat is ook vooruit (lokale backups niet gesynchroniseerd)
    if (externMeta && externMeta.apparaatId && eigenApparaatId && externMeta.apparaatId !== eigenApparaatId) {
      if (externVersie > lokaleVersie && lokaalVersie > externVersie) {
        forkDetected = true;
      }
    }

    // Check encryptie-configuratie mismatch
    if (externPad && row?.backup_encryptie_hash) {
      try {
        const configPad = path.join(externPad, 'backup-config.json');
        if (fs.existsSync(configPad)) {
          const config = JSON.parse(fs.readFileSync(configPad, 'utf-8')) as { hash?: string };
          if (config.hash && config.hash !== row.backup_encryptie_hash) {
            encryptieConfigMismatch = true;
          }
        } else {
          encryptieConfigOntbreekt = true;
        }
      } catch { /* extern niet bereikbaar */ }
    }

    // Verplaats pending-extern bestanden als extern bereikbaar is
    const pendingDir = path.join(BACKUP_DIR, 'pending-extern');
    if (externPad && fs.existsSync(pendingDir)) {
      try {
        fs.mkdirSync(externPad, { recursive: true });
        const bestanden = fs.readdirSync(pendingDir).filter(f => f.startsWith('backup_'));
        for (const f of bestanden) {
          fs.copyFileSync(path.join(pendingDir, f), path.join(externPad, f));
          fs.unlinkSync(path.join(pendingDir, f));
        }
        if (fs.readdirSync(pendingDir).length === 0) fs.rmdirSync(pendingDir);
      } catch { /* extern niet bereikbaar */ }
    }
    // Tel resterende pending bestanden
    if (fs.existsSync(pendingDir)) {
      try { pendingExtern = fs.readdirSync(pendingDir).filter(f => f.startsWith('backup_')).length; } catch { /* */ }
    }
  } catch {
    // Geen backup of geen db — geen melding tonen
  }

  return NextResponse.json({ backupIsNieuwer, backupDatum, backupBestand, bron, forkDetected, pendingExtern, encryptieConfigMismatch, encryptieConfigOntbreekt });
}

/** POST: synchroniseer backup_versie naar het maximum van lokale en externe meta.
 *  Gebruikt door "Lokale versie behouden" om fork-detectie te resetten. */
export function POST() {
  try {
    const db = getDb();
    const row = db.prepare('SELECT backup_extern_pad, backup_versie FROM instellingen WHERE id = 1')
      .get() as { backup_extern_pad: string | null; backup_versie: number } | undefined;

    let maxVersie = row?.backup_versie ?? 0;

    // Lokale meta
    const lokaalMetaPath = path.join(BACKUP_DIR, 'backup-meta.json');
    if (fs.existsSync(lokaalMetaPath)) {
      const meta = JSON.parse(fs.readFileSync(lokaalMetaPath, 'utf-8')) as { versie?: number };
      if ((meta.versie ?? 0) > maxVersie) maxVersie = meta.versie!;
    }

    // Externe meta
    if (row?.backup_extern_pad) {
      try {
        const externMetaPath = path.join(row.backup_extern_pad, 'backup-meta.json');
        if (fs.existsSync(externMetaPath)) {
          const meta = JSON.parse(fs.readFileSync(externMetaPath, 'utf-8')) as { versie?: number };
          if ((meta.versie ?? 0) > maxVersie) maxVersie = meta.versie!;
        }
      } catch { /* extern niet bereikbaar */ }
    }

    db.prepare('UPDATE instellingen SET backup_versie = ? WHERE id = 1').run(maxVersie);
    return NextResponse.json({ ok: true, versie: maxVersie });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Fout.' }, { status: 500 });
  }
}
