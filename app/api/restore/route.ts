// FILE: route.ts (api/restore)
// AANGEMAAKT: 29-03-2026 15:00
// VERSIE: 1
// GEWIJZIGD: 05-04-2026 00:00
//
// WIJZIGINGEN (05-04-2026 00:00):
// - Fix: onbekende kolommen uit backup negeren via PRAGMA table_info (Too many parameter values)
// WIJZIGINGEN (04-04-2026 23:45):
// - Fix: fallback type='potje' voor budgetten_potjes bij backup import (NOT NULL constraint)
// WIJZIGINGEN (03-04-2026 16:45):
// - Na herstel: laatst_herstelde_backup opslaan in instellingen (cross-device sync)
// WIJZIGINGEN (02-04-2026 19:00):
// - Herschreven: accepteert { bestandsnaam?: string }, laadt JSON van disk
// - Zonder bestandsnaam wordt de meest recente backup gebruikt (via backup-meta.json)
// WIJZIGINGEN (30-03-2026):
// - Vaste insert/delete-volgorde om FOREIGN KEY constraint errors te voorkomen
// WIJZIGINGEN (29-03-2026 15:00):
// - Initiële aanmaak: POST /api/restore — importeert JSON, overschrijft geselecteerde tabellen

// ╔══════════════════════════════════════════════════════════════════╗
// ║  DEV-ONLY: Dit endpoint is uitsluitend bedoeld tijdens         ║
// ║  ontwikkeling. Verwijderen vóór productie-release.             ║
// ╚══════════════════════════════════════════════════════════════════╝

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import getDb, { DB_PATH } from '@/lib/db';
import { leesBackupBestand } from '@/lib/backup';
import { runMigrations } from '@/lib/migrations';
const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backup');

// Ouder-tabellen eerst; delete in omgekeerde volgorde
// Ouder-tabellen eerst; delete in omgekeerde volgorde (kind-tabellen eerst)
const TABEL_VOLGORDE = [
  'instellingen',
  'rekeningen',
  'genegeerde_rekeningen',
  'rekening_groepen',
  'rekening_groep_rekeningen',
  'categorieen',
  'imports',
  'budgetten_potjes',
  'budgetten_potjes_rekeningen',
  'subcategorieen',
  'transacties',
  'transactie_aanpassingen',
  'vaste_posten_config',
  'vp_groepen',
  'vp_groep_subcategorieen',
  'vp_volgorde',
  'vp_negeer',
  'trend_panels',
  'trend_panel_items',
];

export async function POST(req: NextRequest) {
  let bestandsnaam: string | undefined;
  let bron: string | undefined;
  let backupData: Record<string, unknown> | undefined;

  try {
    const body = await req.json() as Record<string, unknown>;
    if (typeof body.bestandsnaam === 'string') {
      bestandsnaam = body.bestandsnaam;
    }
    if (typeof body.bron === 'string') {
      bron = body.bron;
    }
    if (!bestandsnaam && TABEL_VOLGORDE.some(t => t in body)) {
      // Component stuurde directe tabeldata
      backupData = body;
      bestandsnaam = '(upload)';
    }
  } catch {
    // Lege body — gebruik meest recente backup
  }

  // Extern pad + encryptie ophalen uit instellingen
  let externPad: string | null = null;
  let encryptieHash: string | null = null;
  let encryptieSalt: string | null = null;
  try {
    const db = getDb();
    const row = db.prepare('SELECT backup_extern_pad, backup_encryptie_hash, backup_encryptie_salt FROM instellingen WHERE id = 1').get() as { backup_extern_pad: string | null; backup_encryptie_hash: string | null; backup_encryptie_salt: string | null } | undefined;
    externPad = row?.backup_extern_pad ?? null;
    encryptieHash = row?.backup_encryptie_hash ?? null;
    encryptieSalt = row?.backup_encryptie_salt ?? null;
  } catch { /* */ }

  if (!backupData) {
    // Bepaal welk backup-bestand geladen moet worden
    if (!bestandsnaam) {
      // Bij externe bron: gebruik externe backup-meta.json
      const metaDir = bron === 'extern' && externPad ? externPad : BACKUP_DIR;
      const metaPath = path.join(metaDir, 'backup-meta.json');
      if (!fs.existsSync(metaPath)) {
        return NextResponse.json({ error: 'Geen backup beschikbaar.' }, { status: 404 });
      }
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as { latestBackup: string };
      bestandsnaam = meta.latestBackup;
    }

    // Valideer bestandsnaam (backup_*.json/.json.gz/.enc.gz of fbs-backup-*.json)
    if (!/^(backup_[\d_-]+|fbs-backup-[\d_-]+(\s*\(\d+\))?)(\.(json(\.gz)?|enc\.gz))$/.test(bestandsnaam)) {
      return NextResponse.json({ error: 'Ongeldig backup-bestandsnaam.' }, { status: 400 });
    }

    let bestandsPad = path.join(BACKUP_DIR, bestandsnaam);
    if (!fs.existsSync(bestandsPad)) {
      // Check externe locatie als het bestand niet lokaal staat
      if (externPad) {
        const externBestandsPad = path.join(externPad, bestandsnaam);
        if (fs.existsSync(externBestandsPad)) {
          bestandsPad = externBestandsPad;
        }
      }
    }
    if (!fs.existsSync(bestandsPad)) {
      // Fallback: zoek meest recent backup-bestand in de relevante map
      const zoekDir = bron === 'extern' && externPad ? externPad : BACKUP_DIR;
      const bestanden = fs.readdirSync(zoekDir)
        .filter(f => f.startsWith('backup_') && (f.endsWith('.json') || f.endsWith('.json.gz') || f.endsWith('.enc.gz')))
        .sort()
        .reverse();
      if (bestanden.length === 0) {
        return NextResponse.json({ error: `Backup-bestand niet gevonden: ${bestandsnaam}` }, { status: 404 });
      }
      bestandsnaam = bestanden[0];
      bestandsPad = path.join(zoekDir, bestandsnaam);
    }

    try {
      backupData = leesBackupBestand(bestandsPad, encryptieHash ?? undefined, encryptieSalt ?? undefined);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Backup-bestand is geen geldige JSON.';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  const tabellen = TABEL_VOLGORDE.filter(t => Object.prototype.hasOwnProperty.call(backupData, t));
  if (tabellen.length === 0) {
    return NextResponse.json({ error: 'Geen geldige tabellen in backup.' }, { status: 400 });
  }

  try {
    const db = getDb();

    // Bewaar device-specifieke instellingen vóór restore
    const deviceVelden = tabellen.includes('instellingen')
      ? db.prepare('SELECT apparaat_id, backup_extern_pad, backup_versie, backup_encryptie_hash, backup_encryptie_hint, backup_encryptie_salt, backup_herstelsleutel_hash FROM instellingen WHERE id = 1').get() as Record<string, unknown> | undefined
      : undefined;

    db.transaction(() => {
      // Verwijder in omgekeerde volgorde (kind-tabellen eerst)
      for (const tabel of [...tabellen].reverse()) {
        db.prepare(`DELETE FROM "${tabel}"`).run();
      }
      // Voeg in correcte volgorde in (ouder-tabellen eerst)
      for (const tabel of tabellen) {
        const records = backupData[tabel];
        if (!Array.isArray(records) || records.length === 0) continue;
        // Filter kolommen: alleen kolommen die in de huidige tabel bestaan
        const tabelKolommen = new Set(
          (db.prepare(`PRAGMA table_info("${tabel}")`).all() as { name: string }[]).map(r => r.name)
        );
        const kolommen = Object.keys(records[0] as Record<string, unknown>).filter(k => tabelKolommen.has(k));
        if (kolommen.length === 0) continue;
        const placeholders = kolommen.map(() => '?').join(', ');
        const insert = db.prepare(
          `INSERT INTO "${tabel}" (${kolommen.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders})`
        );
        for (const record of records as Record<string, unknown>[]) {
          // Fallback voor budgetten_potjes.type: voorkom NOT NULL constraint fout
          if (tabel === 'budgetten_potjes' && !record['type']) {
            record['type'] = 'potje';
          }
          insert.run(kolommen.map(k => record[k]));
        }
      }
    })();

    // Herstel device-specifieke velden die door de restore zijn overschreven
    if (deviceVelden) {
      db.prepare(`UPDATE instellingen SET
        apparaat_id = ?, backup_extern_pad = ?, backup_encryptie_hash = ?,
        backup_encryptie_hint = ?, backup_encryptie_salt = ?, backup_herstelsleutel_hash = ?
        WHERE id = 1`).run(
        deviceVelden.apparaat_id, deviceVelden.backup_extern_pad, deviceVelden.backup_encryptie_hash,
        deviceVelden.backup_encryptie_hint, deviceVelden.backup_encryptie_salt, deviceVelden.backup_herstelsleutel_hash
      );
    }

    // Synchroniseer backup_versie naar max van lokale meta, externe meta en eerder bewaarde waarde
    try {
      let maxVersie = (deviceVelden?.backup_versie as number) ?? 0;
      const metaPath = path.join(BACKUP_DIR, 'backup-meta.json');
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as { versie?: number; latestBackup?: string };
        if ((meta.versie ?? 0) > maxVersie) maxVersie = meta.versie!;
      }
      // Ook externe meta meenemen zodat backup_versie niet lager blijft dan extern
      if (externPad) {
        try {
          const externMetaPath = path.join(externPad, 'backup-meta.json');
          if (fs.existsSync(externMetaPath)) {
            const externMeta = JSON.parse(fs.readFileSync(externMetaPath, 'utf-8')) as { versie?: number };
            if ((externMeta.versie ?? 0) > maxVersie) maxVersie = externMeta.versie!;
          }
        } catch { /* extern niet bereikbaar */ }
      }
      db.prepare('UPDATE instellingen SET laatst_herstelde_backup = ?, backup_versie = ? WHERE id = 1')
        .run(bestandsnaam, maxVersie);
    } catch {
      db.prepare('UPDATE instellingen SET laatst_herstelde_backup = ? WHERE id = 1').run(bestandsnaam);
    }

    // Schema-versie uit de backup lezen (ontbreekt in oude backups → 0)
    const backupSchemaVersion = typeof (backupData as Record<string, unknown>).schema_version === 'number'
      ? (backupData as Record<string, unknown>).schema_version as number
      : 0;

    // user_version terugzetten naar backup-versie zodat runMigrations de ontbrekende stappen uitvoert
    db.pragma(`user_version = ${backupSchemaVersion}`);
    runMigrations();

    return NextResponse.json({ success: true, hersteld: bestandsnaam });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
