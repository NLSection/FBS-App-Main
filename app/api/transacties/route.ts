// FILE: route.ts
// AANGEMAAKT: 25-03-2026 12:00
// VERSIE: 1
// GEWIJZIGD: 31-03-2026 02:00
//
// WIJZIGINGEN (31-03-2026 02:00):
// - naam_tegenpartij query param toegevoegd voor woordfrequentie analyse
// WIJZIGINGEN (25-03-2026 18:30):
// - Initiële aanmaak: GET /api/transacties met optionele filters
// - GELDIGE_TYPES bijgewerkt naar nieuw type systeem
// WIJZIGINGEN (25-03-2026 21:00):
// - datum_van en datum_tot query params toegevoegd

import { NextRequest, NextResponse } from 'next/server';
import { getTransacties } from '@/lib/transacties';
import type { TransactieType, TransactieStatus } from '@/lib/schema';

const GELDIGE_TYPES = new Set<string>(['normaal-af', 'normaal-bij', 'omboeking-af', 'omboeking-bij']);
const GELDIGE_STATUSSEN = new Set<string>(['nieuw', 'verwerkt']);

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const typeParam     = params.get('type');
  const importParam   = params.get('import_id');
  const statusParam   = params.get('status');
  const datumVanParam = params.get('datum_van');
  const datumTotParam = params.get('datum_tot');
  const naamParam     = params.get('naam_tegenpartij');

  if (typeParam && !GELDIGE_TYPES.has(typeParam)) {
    return NextResponse.json({ error: `Ongeldig type: ${typeParam}` }, { status: 400 });
  }
  if (statusParam && !GELDIGE_STATUSSEN.has(statusParam)) {
    return NextResponse.json({ error: `Ongeldige status: ${statusParam}` }, { status: 400 });
  }

  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  if (datumVanParam && !ISO_DATE.test(datumVanParam)) {
    return NextResponse.json({ error: 'datum_van moet YYYY-MM-DD formaat hebben.' }, { status: 400 });
  }
  if (datumTotParam && !ISO_DATE.test(datumTotParam)) {
    return NextResponse.json({ error: 'datum_tot moet YYYY-MM-DD formaat hebben.' }, { status: 400 });
  }

  const import_id = importParam ? parseInt(importParam, 10) : undefined;
  if (importParam && isNaN(import_id!)) {
    return NextResponse.json({ error: 'import_id moet een getal zijn.' }, { status: 400 });
  }

  try {
    const transacties = getTransacties({
      type:      typeParam   ? (typeParam   as TransactieType)   : undefined,
      import_id: import_id,
      status:    statusParam ? (statusParam as TransactieStatus) : undefined,
      datum_van: datumVanParam ?? undefined,
      datum_tot: datumTotParam ?? undefined,
      naam_tegenpartij: naamParam ?? undefined,
    });
    return NextResponse.json(transacties);
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
