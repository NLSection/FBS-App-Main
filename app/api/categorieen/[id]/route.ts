// FILE: route.ts (api/categorieen/[id])
// AANGEMAAKT: 25-03-2026 17:30
// VERSIE: 1
// GEWIJZIGD: 28-03-2026 14:00
//
// WIJZIGINGEN (28-03-2026 14:00):
// - PUT: naam_zoekwoord_raw doorgestuurd naar updateCategorieRegel

import { NextRequest, NextResponse } from 'next/server';
import { updateCategorieRegel, deleteCategorieRegel } from '@/lib/categorisatie';

type Params = Promise<{ id: string }>;

export function DELETE(_req: NextRequest, { params }: { params: Params }) {
  return params.then(({ id }) => {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return NextResponse.json({ error: 'Ongeldig id.' }, { status: 400 });
    try {
      deleteCategorieRegel(numId);
      return NextResponse.json({ ok: true });
    } catch (err) {
      const bericht = err instanceof Error ? err.message : 'Databasefout.';
      return NextResponse.json({ error: bericht }, { status: 500 });
    }
  });
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: 'Ongeldig id.' }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 });
  }

  const { iban, naam_origineel, naam_zoekwoord_raw, omschrijving_raw, categorie, subcategorie, type } = body;

  if (!categorie || typeof categorie !== 'string') {
    return NextResponse.json({ error: 'categorie is verplicht.' }, { status: 400 });
  }

  try {
    updateCategorieRegel(numId, {
      iban:              typeof iban === 'string'              ? iban              : null,
      naam_origineel:    typeof naam_origineel === 'string'    ? naam_origineel    : null,
      naam_zoekwoord_raw:'naam_zoekwoord_raw' in body
                          ? (typeof naam_zoekwoord_raw === 'string' ? naam_zoekwoord_raw : null)
                          : undefined,
      omschrijving_raw:  typeof omschrijving_raw === 'string'  ? omschrijving_raw  : null,
      categorie,
      subcategorie:      typeof subcategorie === 'string'      ? subcategorie      : null,
      type:              typeof type === 'string'               ? type as never     : 'alle',
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
