// FILE: route.ts (api/categorieen/[id])
// AANGEMAAKT: 25-03-2026 17:30
// VERSIE: 1
// GEWIJZIGD: 02-04-2026 10:00
//
// WIJZIGINGEN (30-03-2026 21:00):
// - PUT: toelichting doorgestuurd naar updateCategorieRegel
// WIJZIGINGEN (28-03-2026 14:00):
// - PUT: naam_zoekwoord_raw doorgestuurd naar updateCategorieRegel
// WIJZIGINGEN (02-04-2026 10:00):
// - triggerBackup() aangeroepen na succesvolle PUT en DELETE

import { NextRequest, NextResponse } from 'next/server';
import { updateCategorieRegel, deleteCategorieRegel, updateNaamOrigineel } from '@/lib/categorisatie';
import { triggerBackup } from '@/lib/backup';
import { insertSubcategorie } from '@/lib/subcategorieen';

type Params = Promise<{ id: string }>;

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: 'Ongeldig id.' }, { status: 400 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 }); }
  if (typeof body.naam_origineel !== 'string') return NextResponse.json({ error: 'naam_origineel is verplicht.' }, { status: 400 });
  try {
    updateNaamOrigineel(numId, body.naam_origineel);
    triggerBackup();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Databasefout.' }, { status: 500 });
  }
}

export function DELETE(_req: NextRequest, { params }: { params: Params }) {
  return params.then(({ id }) => {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return NextResponse.json({ error: 'Ongeldig id.' }, { status: 400 });
    try {
      deleteCategorieRegel(numId);
      triggerBackup();
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

  const { iban, naam_origineel, naam_zoekwoord_raw, omschrijving_raw, categorie, subcategorie, toelichting, type } = body;

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
      toelichting:       'toelichting' in body
                          ? (typeof toelichting === 'string' ? toelichting || null : null)
                          : undefined,
      type:              typeof type === 'string'               ? type as never     : 'alle',
    });
    // Zorg dat subcategorie in de subcategorieen tabel staat
    if (typeof subcategorie === 'string' && subcategorie.trim()) {
      try { insertSubcategorie(categorie as string, subcategorie as string); } catch { /* bestaat al */ }
    }
    triggerBackup();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
