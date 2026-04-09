// FILE: route.ts (api/backup)
// AANGEMAAKT: 29-03-2026 15:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 10:00
//
// WIJZIGINGEN (03-04-2026 10:00):
// - transactie_aanpassingen toegevoegd aan TOEGESTANE_TABELLEN
// WIJZIGINGEN (29-03-2026 15:00):
// - Initiële aanmaak: GET /api/backup?tabellen=... exporteert geselecteerde tabellen als JSON

import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

const TOEGESTANE_TABELLEN = ['transacties', 'transactie_aanpassingen', 'imports', 'categorieen', 'budgetten_potjes', 'budgetten_potjes_rekeningen', 'subcategorieen', 'rekeningen', 'genegeerde_rekeningen', 'rekening_groepen', 'rekening_groep_rekeningen', 'vaste_posten_config', 'vp_groepen', 'vp_groep_subcategorieen', 'vp_volgorde', 'vp_negeer', 'trend_panels', 'trend_panel_items', 'instellingen'];

export function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get('tabellen') ?? '';
  const tabellen = param.split(',').map(t => t.trim()).filter(t => TOEGESTANE_TABELLEN.includes(t));
  if (tabellen.length === 0) {
    return NextResponse.json({ error: 'Geen geldige tabellen opgegeven.' }, { status: 400 });
  }

  try {
    const db = getDb();
    const backup: Record<string, unknown[]> = {};
    for (const tabel of tabellen) {
      backup[tabel] = db.prepare(`SELECT * FROM "${tabel}"`).all();
    }
    return NextResponse.json(backup);
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
