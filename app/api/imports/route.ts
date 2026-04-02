// FILE: route.ts (api/imports)
// AANGEMAAKT: 03-04-2026 02:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 02:00
//
// WIJZIGINGEN (03-04-2026 02:00):
// - Initiële aanmaak: GET retourneert 10 meest recente imports

import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export function GET() {
  try {
    const db = getDb();
    const imports = db.prepare(
      'SELECT id, bestandsnaam, geimporteerd_op, aantal_transacties FROM imports ORDER BY id DESC LIMIT 10'
    ).all();
    return NextResponse.json(imports);
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
