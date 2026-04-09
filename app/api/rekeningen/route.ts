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
import { kiesAutomatischeKleur } from '@/lib/kleuren';
import { getBudgettenPotjes } from '@/lib/budgettenPotjes';
import { triggerBackup } from '@/lib/backup';

export function GET() {
  try {
    return NextResponse.json(getRekeningen());
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: { iban?: string; naam?: string; type?: string; kleur?: string | null; kleur_auto?: number };
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
    // Als geen kleur meegegeven, automatisch toewijzen uit palette
    let kleur = body.kleur ?? null;
    if (!kleur) {
      const bestaandeRek = getRekeningen().map(r => r.kleur).filter((k): k is string => !!k);
      const catKleuren = getBudgettenPotjes().map(bp => bp.kleur).filter((k): k is string => !!k);
      kleur = kiesAutomatischeKleur([...bestaandeRek, ...catKleuren]);
    }
    const id = insertRekening(iban, naam, type, kleur, body.kleur_auto);
    herclassificeerTypes();
    triggerBackup();
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
