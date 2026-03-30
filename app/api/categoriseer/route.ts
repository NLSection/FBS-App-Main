// FILE: route.ts (api/categoriseer)
// AANGEMAAKT: 25-03-2026 17:30
// VERSIE: 1
// GEWIJZIGD: 25-03-2026 17:30
//
// WIJZIGINGEN (25-03-2026 17:30):
// - Initiële aanmaak: POST { importId } — voert categoriseerTransacties uit
// WIJZIGINGEN (26-03-2026 11:15):
// - importId optioneel: zonder importId worden ALLE transacties herverwerkt

import { NextRequest, NextResponse } from 'next/server';
import { categoriseerTransacties } from '@/lib/categorisatie';

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

  try {
    const resultaat = categoriseerTransacties(importId);
    return NextResponse.json(resultaat);
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
