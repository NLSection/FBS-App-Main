// FILE: route.ts (api/restore)
// AANGEMAAKT: 29-03-2026 15:00
// VERSIE: 1
// GEWIJZIGD: 30-03-2026
//
// WIJZIGINGEN (29-03-2026 15:00):
// - Initiële aanmaak: POST /api/restore — importeert JSON, overschrijft geselecteerde tabellen
// WIJZIGINGEN (30-03-2026):
// - Vaste insert/delete-volgorde om FOREIGN KEY constraint errors te voorkomen

import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

// Ouder-tabellen eerst; delete in omgekeerde volgorde
const TABEL_VOLGORDE = ['instellingen', 'rekeningen', 'categorieen', 'imports', 'budgetten_potjes', 'transacties'];

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 });
  }

  const tabellen = TABEL_VOLGORDE.filter(t => Object.prototype.hasOwnProperty.call(body, t));
  if (tabellen.length === 0) {
    return NextResponse.json({ error: 'Geen geldige tabellen in backup.' }, { status: 400 });
  }

  try {
    const db = getDb();
    const resultaat: Record<string, number> = {};

    db.transaction(() => {
      // Verwijder in omgekeerde volgorde (kind-tabellen eerst)
      for (const tabel of [...tabellen].reverse()) {
        db.prepare(`DELETE FROM "${tabel}"`).run();
      }
      // Voeg in correcte volgorde in (ouder-tabellen eerst)
      for (const tabel of tabellen) {
        const records = body[tabel];
        if (!Array.isArray(records)) continue;
        if (records.length === 0) { resultaat[tabel] = 0; continue; }
        const kolommen = Object.keys(records[0] as Record<string, unknown>);
        const placeholders = kolommen.map(() => '?').join(', ');
        const insert = db.prepare(
          `INSERT INTO "${tabel}" (${kolommen.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders})`
        );
        for (const record of records as Record<string, unknown>[]) {
          insert.run(Object.values(record));
        }
        resultaat[tabel] = records.length;
      }
    })();

    return NextResponse.json(resultaat);
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
