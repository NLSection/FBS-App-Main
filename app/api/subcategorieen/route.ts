// FILE: route.ts (api/subcategorieen)
// AANGEMAAKT: 28-03-2026 15:00
// VERSIE: 1
// GEWIJZIGD: 28-03-2026 15:00
//
// WIJZIGINGEN (28-03-2026 15:00):
// - Initiële aanmaak: GET ?categorie=X — geeft unieke subcategorieën voor een categorie

import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export function GET(request: NextRequest) {
  const categorie = request.nextUrl.searchParams.get('categorie');
  if (!categorie) {
    return NextResponse.json({ error: 'categorie parameter verplicht.' }, { status: 400 });
  }
  try {
    const rows = getDb()
      .prepare('SELECT DISTINCT subcategorie FROM categorieen WHERE categorie = ? AND subcategorie IS NOT NULL ORDER BY subcategorie')
      .all(categorie) as { subcategorie: string }[];
    return NextResponse.json(rows.map(r => r.subcategorie));
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
