// FILE: route.ts (api/categorieen)
// AANGEMAAKT: 25-03-2026 17:30
// VERSIE: 1
// GEWIJZIGD: 30-03-2026 21:00
//
// WIJZIGINGEN (30-03-2026 21:00):
// - POST: toelichting doorgestuurd naar insertCategorieRegel
// WIJZIGINGEN (28-03-2026 14:00):
// - POST: naam_zoekwoord_raw doorgestuurd naar insertCategorieRegel

import { NextRequest, NextResponse } from 'next/server';
import { getCategorieRegels, insertCategorieRegel, categoriseerTransacties } from '@/lib/categorisatie';

export function GET() {
  try {
    return NextResponse.json(getCategorieRegels());
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 });
  }

  const { iban, naam_origineel, naam_zoekwoord_raw, omschrijving_raw, categorie, subcategorie, toelichting, type } = body;

  if (!categorie || typeof categorie !== 'string') {
    return NextResponse.json({ error: 'categorie is verplicht.' }, { status: 400 });
  }

  try {
    const id = insertCategorieRegel({
      iban:              typeof iban === 'string'              ? iban              : null,
      naam_origineel:    typeof naam_origineel === 'string'    ? naam_origineel    : null,
      naam_zoekwoord_raw:typeof naam_zoekwoord_raw === 'string'? naam_zoekwoord_raw: undefined,
      omschrijving_raw:  typeof omschrijving_raw === 'string'  ? omschrijving_raw  : null,
      categorie,
      subcategorie:      typeof subcategorie === 'string'      ? subcategorie      : null,
      toelichting:       typeof toelichting === 'string'       ? toelichting || null : undefined,
      type:              typeof type === 'string'               ? type as never     : 'alle',
    });
    categoriseerTransacties();
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
