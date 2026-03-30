// FILE: route.ts
// AANGEMAAKT: 25-03-2026 11:30
// VERSIE: 1
// GEWIJZIGD: 25-03-2026 11:30
//
// WIJZIGINGEN (25-03-2026 11:30):
// - Initiële aanmaak: GET en POST /api/vaste-lasten-config

import { NextRequest, NextResponse } from 'next/server';
import { getVasteLastenConfig, insertVasteLastDefinitie } from '@/lib/vasteLastenConfig';

export function GET() {
  try {
    return NextResponse.json(getVasteLastenConfig());
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: { iban?: string; naam?: string; omschrijving?: string; label?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON.' }, { status: 400 });
  }

  const { iban, naam, omschrijving, label } = body;
  if (!iban || !naam || !label) {
    return NextResponse.json({ error: 'iban, naam en label zijn verplicht.' }, { status: 400 });
  }

  try {
    insertVasteLastDefinitie(iban, naam, omschrijving ?? null, label);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
