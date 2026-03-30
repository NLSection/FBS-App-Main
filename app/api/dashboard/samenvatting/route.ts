// FILE: route.ts
// AANGEMAAKT: 25-03-2026 14:00
// VERSIE: 1
// GEWIJZIGD: 25-03-2026 18:30
//
// WIJZIGINGEN (25-03-2026 18:30):
// - Initiële aanmaak: GET /api/dashboard/samenvatting — inkomsten, uitgaven en vrij_te_besteden huidige maand
// - Omboekingen uitgesloten van samenvatting (alleen normaal-af/bij telt mee)

import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export function GET() {
  try {
    const db = getDb();

    const now = new Date();
    const jaar = now.getFullYear();
    const maand = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${jaar}-${maand}`;

    const rij = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN bedrag > 0 THEN bedrag ELSE 0 END), 0) AS inkomsten,
        COALESCE(SUM(CASE WHEN bedrag < 0 THEN bedrag ELSE 0 END), 0) AS uitgaven
      FROM transacties
      WHERE datum LIKE ?
        AND type IN ('normaal-af', 'normaal-bij')
    `).get(`${prefix}%`) as { inkomsten: number; uitgaven: number };

    return NextResponse.json({
      inkomsten: rij.inkomsten,
      uitgaven: rij.uitgaven,
      vrij_te_besteden: rij.inkomsten + rij.uitgaven,
    });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
