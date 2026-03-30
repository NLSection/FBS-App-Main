// FILE: route.ts
// AANGEMAAKT: 25-03-2026 14:00
// VERSIE: 1
// GEWIJZIGD: 25-03-2026 14:00
//
// WIJZIGINGEN (25-03-2026 14:00):
// - Initiële aanmaak: GET /api/dashboard/vaste-lasten-nog-te-gaan
//   Geeft vaste lasten waarvan de verwachte dag nog niet verstreken is

import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export function GET() {
  try {
    const db = getDb();
    const vandaagDag = new Date().getDate();

    const rijen = db.prepare(`
      SELECT id, label, verwachte_dag, verwacht_bedrag
      FROM vaste_lasten_config
      WHERE verwachte_dag IS NOT NULL
        AND verwachte_dag >= ?
      ORDER BY verwachte_dag ASC
    `).all(vandaagDag) as {
      id: number;
      label: string;
      verwachte_dag: number;
      verwacht_bedrag: number | null;
    }[];

    return NextResponse.json(rijen);
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
