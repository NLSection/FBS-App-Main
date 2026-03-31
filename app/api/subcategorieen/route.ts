// FILE: route.ts (api/subcategorieen)
// AANGEMAAKT: 28-03-2026 15:00
// VERSIE: 1
// GEWIJZIGD: 31-03-2026 22:30
//
// WIJZIGINGEN (28-03-2026 15:00):
// - Initiële aanmaak: GET ?categorie=X — geeft unieke subcategorieën voor een categorie
// WIJZIGINGEN (31-03-2026 22:30):
// - Bronnen uitgebreid: categorieregels (categorieen) + handmatige aanpassingen (transactie_aanpassingen)

import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export function GET(request: NextRequest) {
  const categorie = request.nextUrl.searchParams.get('categorie');
  if (!categorie) {
    return NextResponse.json({ error: 'categorie parameter verplicht.' }, { status: 400 });
  }
  try {
    const rows = getDb().prepare(`
      SELECT DISTINCT subcategorie FROM categorieen
      WHERE categorie = ? AND subcategorie IS NOT NULL
      UNION
      SELECT DISTINCT COALESCE(c.subcategorie, a.subcategorie) AS subcategorie
      FROM transactie_aanpassingen a
      LEFT JOIN categorieen c ON a.categorie_id = c.id
      WHERE COALESCE(c.categorie, a.categorie) = ?
        AND COALESCE(c.subcategorie, a.subcategorie) IS NOT NULL
      ORDER BY subcategorie
    `).all(categorie, categorie) as { subcategorie: string }[];
    return NextResponse.json(rows.map(r => r.subcategorie));
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
