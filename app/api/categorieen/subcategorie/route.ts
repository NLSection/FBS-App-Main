// FILE: route.ts (api/categorieen/subcategorie)
// AANGEMAAKT: 03-04-2026 01:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 01:00
//
// WIJZIGINGEN (03-04-2026 01:00):
// - Initiële aanmaak: PATCH hernoemt subcategorie binnen een categorie

import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { triggerBackup } from '@/lib/backup';

export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 });
  }

  const { categorie, subcategorie_oud, subcategorie_nieuw } = body;

  if (!categorie || typeof categorie !== 'string') {
    return NextResponse.json({ error: 'categorie is verplicht.' }, { status: 400 });
  }
  if (typeof subcategorie_oud !== 'string' || !subcategorie_oud) {
    return NextResponse.json({ error: 'subcategorie_oud is verplicht.' }, { status: 400 });
  }
  if (typeof subcategorie_nieuw !== 'string' || !subcategorie_nieuw) {
    return NextResponse.json({ error: 'subcategorie_nieuw is verplicht.' }, { status: 400 });
  }

  try {
    const db = getDb();
    const result = db.prepare(
      'UPDATE categorieen SET subcategorie = ? WHERE categorie = ? AND subcategorie = ?'
    ).run(subcategorie_nieuw, categorie, subcategorie_oud);

    triggerBackup();
    return NextResponse.json({ bijgewerkt: result.changes });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
