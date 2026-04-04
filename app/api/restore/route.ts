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
import getDb from '@/lib/db';

const BACKUP_DIR = path.join(process.cwd(), 'backup');

// Ouder-tabellen eerst; delete in omgekeerde volgorde
const TABEL_VOLGORDE = ['instellingen', 'rekeningen', 'categorieen', 'imports', 'budgetten_potjes', 'transacties', 'transactie_aanpassingen'];

export async function POST(req: NextRequest) {
  let bestandsnaam: string | undefined;

  try {
    const body = await req.json() as { bestandsnaam?: string };
    bestandsnaam = body.bestandsnaam;
  } catch {
    // Lege body is toegestaan — gebruik dan de meest recente backup
  }

  // Bepaal welk backup-bestand geladen moet worden
  if (!bestandsnaam) {
    const metaPath = path.join(BACKUP_DIR, 'backup-meta.json');
    if (!fs.existsSync(metaPath)) {
      return NextResponse.json({ error: 'Geen backup beschikbaar.' }, { status: 404 });
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as { latestBackup: string };
    bestandsnaam = meta.latestBackup;
  }

  // Valideer bestandsnaam (alleen backup_*.json of fbs-backup-*.json)
  if (!/^(backup_[\d_-]+|fbs-backup-[\d-]+(\s*\(\d+\))?)\.json$/.test(bestandsnaam)) {
    return NextResponse.json({ error: 'Ongeldig backup-bestandsnaam.' }, { status: 400 });
  }

  const bestandsPad = path.join(BACKUP_DIR, bestandsnaam);
  if (!fs.existsSync(bestandsPad)) {
    return NextResponse.json({ error: `Backup-bestand niet gevonden: ${bestandsnaam}` }, { status: 404 });
  }

  let backupData: Record<string, unknown>;
  try {
    backupData = JSON.parse(fs.readFileSync(bestandsPad, 'utf-8'));
  } catch {
    return NextResponse.json({ error: 'Backup-bestand is geen geldige JSON.' }, { status: 400 });
  }

  const tabellen = TABEL_VOLGORDE.filter(t => Object.prototype.hasOwnProperty.call(backupData, t));
  if (tabellen.length === 0) {
    return NextResponse.json({ error: 'Geen geldige tabellen in backup.' }, { status: 400 });
  }

  try {
    const db = getDb();

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

    // Onthoud welke backup hersteld is (cross-device sync check)
    db.prepare('UPDATE instellingen SET laatst_herstelde_backup = ? WHERE id = 1').run(bestandsnaam);

    return NextResponse.json({ success: true, hersteld: bestandsnaam });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
