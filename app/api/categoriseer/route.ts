// FILE: route.ts (api/categoriseer)
// AANGEMAAKT: 25-03-2026 17:30
// VERSIE: 1
// GEWIJZIGD: 30-03-2026 19:00
//
// WIJZIGINGEN (30-03-2026 19:00):
// - POST: toelichting + categorie_id optioneel; na hermatch bulk-update toelichting op matchende transacties
// WIJZIGINGEN (25-03-2026 17:30):
// - Initiële aanmaak: POST { importId } — voert categoriseerTransacties uit
// WIJZIGINGEN (26-03-2026 11:15):
// - importId optioneel: zonder importId worden ALLE transacties herverwerkt

import { NextRequest, NextResponse } from 'next/server';
import { categoriseerTransacties } from '@/lib/categorisatie';
import getDb from '@/lib/db';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const importIdRaw = body.importId;
  const importId = importIdRaw !== undefined && importIdRaw !== null
    ? (typeof importIdRaw === 'number' ? importIdRaw : parseInt(String(importIdRaw), 10))
    : undefined;

  if (importId !== undefined && isNaN(importId)) {
    return NextResponse.json({ error: 'importId moet een getal zijn.' }, { status: 400 });
  }

  const toelichting = typeof body.toelichting === 'string' && body.toelichting ? body.toelichting : null;
  const categorieId = typeof body.categorie_id === 'number' ? body.categorie_id : null;

  try {
    const resultaat = categoriseerTransacties(importId);
    if (toelichting && categorieId !== null) {
      getDb().prepare('UPDATE transacties SET toelichting = ? WHERE categorie_id = ?').run(toelichting, categorieId);
    }
    return NextResponse.json(resultaat);
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
