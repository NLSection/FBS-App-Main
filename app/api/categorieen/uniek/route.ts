// FILE: route.ts (api/categorieen/uniek)
// AANGEMAAKT: 29-03-2026 07:00
// VERSIE: 1
// GEWIJZIGD: 29-03-2026 07:00
//
// WIJZIGINGEN (29-03-2026 07:00):
// - Initieel: GET distinct categorienamen uit transacties (niet-null)

import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  const rows = getDb()
    .prepare('SELECT DISTINCT categorie FROM transacties WHERE categorie IS NOT NULL ORDER BY categorie')
    .all() as { categorie: string }[];
  return NextResponse.json(rows.map(r => r.categorie));
}
