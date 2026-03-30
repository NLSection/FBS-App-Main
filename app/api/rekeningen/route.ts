// FILE: route.ts
// AANGEMAAKT: 25-03-2026 11:30
// VERSIE: 1
// GEWIJZIGD: 30-03-2026 15:00
//
// WIJZIGINGEN (25-03-2026 11:30):
// - Initiële aanmaak: GET en POST /api/rekeningen
// WIJZIGINGEN (26-03-2026 21:30):
// - POST roept herclassificeerTypes() aan na insertRekening
// WIJZIGINGEN (30-03-2026 15:00):
// - POST geeft nieuw rekening id terug in response body

import { NextRequest, NextResponse } from 'next/server';
import { getRekeningen, insertRekening } from '@/lib/rekeningen';
import { herclassificeerTypes } from '@/lib/herclassificeer';

export function GET() {
  try {
    return NextResponse.json(getRekeningen());
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: { iban?: string; naam?: string; type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON.' }, { status: 400 });
  }

  const { iban, naam, type } = body;
  if (!iban || !naam || !type) {
    return NextResponse.json({ error: 'iban, naam en type zijn verplicht.' }, { status: 400 });
  }
  if (type !== 'betaal' && type !== 'spaar') {
    return NextResponse.json({ error: 'type moet "betaal" of "spaar" zijn.' }, { status: 400 });
  }

  try {
    const id = insertRekening(iban, naam, type);
    herclassificeerTypes();
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
