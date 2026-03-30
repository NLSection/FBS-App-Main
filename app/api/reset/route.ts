// FILE: route.ts (api/reset)
// AANGEMAAKT: 30-03-2026 10:00
// VERSIE: 1
// GEWIJZIGD: 30-03-2026 10:00
//
// WIJZIGINGEN (30-03-2026 10:00):
// - Initiële aanmaak: POST /api/reset leegt alle tabellen (zonder te verwijderen)

import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

const TABELLEN = [
  'transacties',
  'imports',
  'categorieen',
  'budgetten_potjes',
  'rekeningen',
  'instellingen',
  'genegeerde_rekeningen',
];

export function POST() {
  try {
    const db = getDb();
    const reset = db.transaction(() => {
      for (const tabel of TABELLEN) {
        db.prepare(`DELETE FROM "${tabel}"`).run();
      }
    });
    reset();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
