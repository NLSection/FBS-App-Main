import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import getDb, { DB_PATH } from './db';
import { versleutel, ontsleutel } from './backupEncryptie';
import { SCHEMA_VERSION } from './migrations';
export const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backup');

export function triggerBackup(): void {
  setImmediate(() => {
    try {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });

      const db = getDb();
      const alleTabellenRaw = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
      const UITGESLOTEN = new Set(['sqlite_sequence']);
      const TABELLEN = alleTabellenRaw.map(r => r.name).filter(n => !UITGESLOTEN.has(n));

      const backup: Record<string, unknown[]> = {};
      for (const tabel of TABELLEN) {
        try {
          backup[tabel] = db.prepare(`SELECT * FROM "${tabel}"`).all();
        } catch {
          backup[tabel] = [];
        }
      }

      // Versienummer ophogen
      db.prepare('UPDATE instellingen SET backup_versie = backup_versie + 1 WHERE id = 1').run();
      const instRow = db.prepare('SELECT apparaat_id, backup_bewaar_dagen, backup_min_bewaard, backup_extern_pad, backup_versie, backup_encryptie_hash, backup_encryptie_salt FROM instellingen WHERE id = 1').get() as {
        apparaat_id: string | null; backup_bewaar_dagen: number; backup_min_bewaard: number;
        backup_extern_pad: string | null; backup_versie: number;
        backup_encryptie_hash: string | null; backup_encryptie_salt: string | null;
      } | undefined;

      const apparaatId   = instRow?.apparaat_id ?? 'onbekend';
      const bewaarDagen  = instRow?.backup_bewaar_dagen ?? 7;
      const minBewaard   = instRow?.backup_min_bewaard ?? 3;
      const externPad    = instRow?.backup_extern_pad ?? null;
      const versie       = instRow?.backup_versie ?? 1;
      const encryptieSalt = instRow?.backup_encryptie_salt ?? null;
      const heeftEncryptie = !!instRow?.backup_encryptie_hash && !!encryptieSalt;

      // Timestamp in Amsterdam-tijd als bestandsnaam
      const nu = new Date();
      const stamp = nu.toLocaleString('sv-SE', { timeZone: 'Europe/Amsterdam' })
        .replace(' ', '_')
        .replace(/:/g, '-');
      const naam = `backup_${stamp}.json.gz`;

      // Comprimeer met gzip
      const json = JSON.stringify({ ...backup, schema_version: SCHEMA_VERSION });
      const compressed = zlib.gzipSync(Buffer.from(json, 'utf-8'));
      fs.writeFileSync(path.join(BACKUP_DIR, naam), compressed);

      // Backup-meta met apparaat-ID en versie
      const dbMtime = fs.statSync(DB_PATH).mtime.toISOString();
      const backupTijd = nu.toISOString();
      const meta = { latestBackup: naam, dbMtime, backupTijd, apparaatId, versie };
      fs.writeFileSync(path.join(BACKUP_DIR, 'backup-meta.json'), JSON.stringify(meta), 'utf-8');

      // Markeer deze backup als "bekend" op dit apparaat
      try {
        db.prepare('UPDATE instellingen SET laatst_herstelde_backup = ? WHERE id = 1').run(naam);
      } catch { /* kolom bestaat mogelijk nog niet bij eerste run */ }

      // Extern backup: versleutel en kopieer of sla lokaal op als pending
      const pendingDir = path.join(BACKUP_DIR, 'pending-extern');
      if (externPad) {
        const externNaam = heeftEncryptie && encryptieSalt ? naam.replace('.json.gz', '.enc.gz') : naam;
        const externData = heeftEncryptie && encryptieSalt
          ? versleutel(compressed, instRow!.backup_encryptie_hash!, encryptieSalt)
          : compressed;

        let externBereikbaar = false;
        try {
          fs.mkdirSync(externPad, { recursive: true });
          fs.writeFileSync(path.join(externPad, externNaam), externData);
          meta.latestBackup = externNaam;
          fs.writeFileSync(path.join(externPad, 'backup-meta.json'), JSON.stringify(meta), 'utf-8');
          externBereikbaar = true;
        } catch {
          // Extern niet bereikbaar — sla versleuteld lokaal op als pending
          fs.mkdirSync(pendingDir, { recursive: true });
          fs.writeFileSync(path.join(pendingDir, externNaam), externData);
          console.warn('[backup] Extern niet bereikbaar, opgeslagen als pending-extern.');
        }

        if (externBereikbaar) {
          // Sync gemiste backups + verplaats pending bestanden
          syncNaarExtern(externPad, heeftEncryptie, instRow?.backup_encryptie_hash ?? null, encryptieSalt);
          verplaatsPending(pendingDir, externPad);
          try { cleanupBackups(externPad, bewaarDagen, minBewaard, nu); } catch { /* */ }
        }
      }

      // Cleanup lokale backups (exclusief pending-extern)
      cleanupBackups(BACKUP_DIR, bewaarDagen, minBewaard, nu);

    } catch (err) {
      console.error('[backup] Automatische backup mislukt:', err);
    }
  });
}

/** Sync lokale backups die nog niet op extern staan (alleen gecomprimeerde bestanden) */
function syncNaarExtern(externPad: string, heeftEncryptie: boolean, hash: string | null, salt: string | null): void {
  const lokaal = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('backup_') && f.endsWith('.json.gz'));
  const extern = new Set(
    fs.readdirSync(externPad).filter(f => f.startsWith('backup_'))
  );
  for (const f of lokaal) {
    // Bepaal de externe bestandsnaam
    const externNaam = heeftEncryptie && hash && salt ? f.replace('.json.gz', '.enc.gz').replace('.json', '.enc.json') : f;
    if (!extern.has(externNaam)) {
      if (heeftEncryptie && hash && salt) {
        const data = fs.readFileSync(path.join(BACKUP_DIR, f));
        const encrypted = versleutel(data, hash, salt);
        fs.writeFileSync(path.join(externPad, externNaam), encrypted);
      } else {
        fs.copyFileSync(path.join(BACKUP_DIR, f), path.join(externPad, f));
      }
    }
  }
}

/** Verplaats pending-extern bestanden naar externe locatie en ruim lokaal op */
function verplaatsPending(pendingDir: string, externPad: string): void {
  if (!fs.existsSync(pendingDir)) return;
  const bestanden = fs.readdirSync(pendingDir).filter(f => f.startsWith('backup_'));
  for (const f of bestanden) {
    try {
      fs.copyFileSync(path.join(pendingDir, f), path.join(externPad, f));
      fs.unlinkSync(path.join(pendingDir, f));
    } catch { /* individueel bestand mislukt — probeer de rest */ }
  }
  // Verwijder lege pending map
  try { const rest = fs.readdirSync(pendingDir); if (rest.length === 0) fs.rmdirSync(pendingDir); } catch { /* */ }
}

/** Cleanup: verwijder backups ouder dan bewaartermijn, bewaar altijd minimum aantal */
function cleanupBackups(dir: string, bewaarDagen: number, minBewaard: number, nu: Date): void {
  // Verwijder legacy ongecomprimeerde .json bestanden (vervangen door .json.gz)
  const allebestanden = fs.readdirSync(dir).filter(f => f.startsWith('backup_'));
  for (const f of allebestanden) {
    if (f.endsWith('.json') && !f.endsWith('.json.gz') && !f.endsWith('.enc.gz')) {
      try { fs.unlinkSync(path.join(dir, f)); } catch { /* */ }
    }
  }

  const bestanden = fs.readdirSync(dir)
    .filter(f => f.startsWith('backup_') && (f.endsWith('.json') || f.endsWith('.json.gz') || f.endsWith('.enc.gz')))
    .sort();
  if (bestanden.length > minBewaard) {
    const grens = new Date(nu.getTime() - bewaarDagen * 24 * 60 * 60 * 1000);
    const verwijderbaar = bestanden.slice(0, bestanden.length - minBewaard);
    for (const f of verwijderbaar) {
      const stat = fs.statSync(path.join(dir, f));
      if (stat.mtime < grens) {
        fs.unlinkSync(path.join(dir, f));
      }
    }
  }
}

/** Leest een backup bestand (.json, .json.gz of .enc.gz) en retourneert geparsed JSON */
export function leesBackupBestand(bestandsPad: string, wachtwoordHash?: string, salt?: string): Record<string, unknown> {
  const raw = fs.readFileSync(bestandsPad);
  if (bestandsPad.endsWith('.enc.gz')) {
    if (!wachtwoordHash || !salt) throw new Error('Wachtwoord is vereist voor versleutelde backups.');
    const decrypted = ontsleutel(raw, wachtwoordHash, salt);
    return JSON.parse(zlib.gunzipSync(decrypted).toString('utf-8'));
  }
  if (bestandsPad.endsWith('.gz')) {
    return JSON.parse(zlib.gunzipSync(raw).toString('utf-8'));
  }
  return JSON.parse(raw.toString('utf-8'));
}
