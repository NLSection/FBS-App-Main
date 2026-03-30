// FILE: route.ts
// AANGEMAAKT: 25-03-2026 21:00
// VERSIE: 1
// GEWIJZIGD: 25-03-2026 21:00
//
// WIJZIGINGEN (25-03-2026 21:00):
// - Initiële aanmaak: GET en PUT /api/instellingen

import { NextRequest, NextResponse } from 'next/server';
import { getInstellingen, updateInstellingen } from '@/lib/instellingen';

export function GET() {
  try {
    return NextResponse.json(getInstellingen());
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let body: { maandStartDag?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 });
  }
  if (body.maandStartDag === undefined) {
    return NextResponse.json({ error: 'maandStartDag is verplicht.' }, { status: 400 });
  }
  try {
    updateInstellingen({ maandStartDag: body.maandStartDag as number });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 400 });
  }
}
