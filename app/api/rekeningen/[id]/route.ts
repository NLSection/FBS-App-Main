// FILE: route.ts
// AANGEMAAKT: 25-03-2026 11:30
// VERSIE: 1
// GEWIJZIGD: 30-03-2026
//
// WIJZIGINGEN (25-03-2026 11:30):
// - Initiële aanmaak: DELETE /api/rekeningen/[id]
// WIJZIGINGEN (25-03-2026 20:00):
// - PUT /api/rekeningen/[id] toegevoegd
// WIJZIGINGEN (26-03-2026 21:30):
// - PUT en DELETE roepen herclassificeerTypes() aan na wijziging
// WIJZIGINGEN (30-03-2026):
// - PUT accepteert ook { beheerd: 0|1 } zonder iban/naam/type

import { NextRequest, NextResponse } from 'next/server';
import { deleteRekening, updateRekening, updateBeheerd } from '@/lib/rekeningen';
import { herclassificeerTypes } from '@/lib/herclassificeer';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: 'Ongeldig id.' }, { status: 400 });

  let body: { iban?: string; naam?: string; type?: string; beheerd?: number };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 });
  }

  // Alleen beheerd bijwerken
  if (body.beheerd !== undefined && !body.iban && !body.naam && !body.type) {
    try {
      updateBeheerd(numId, body.beheerd);
      return new NextResponse(null, { status: 204 });
    } catch (err) {
      const bericht = err instanceof Error ? err.message : 'Databasefout.';
      return NextResponse.json({ error: bericht }, { status: 400 });
    }
  }

  if (body.type !== 'betaal' && body.type !== 'spaar') {
    return NextResponse.json({ error: 'Type moet "betaal" of "spaar" zijn.' }, { status: 400 });
  }
  try {
    updateRekening(numId, body.iban ?? '', body.naam ?? '', body.type);
    herclassificeerTypes();
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 400 });
  }
}

export function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return params.then(({ id }) => {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'Ongeldig id.' }, { status: 400 });
    }
    try {
      deleteRekening(numId);
      herclassificeerTypes();
      return NextResponse.json({ ok: true });
    } catch (err) {
      const bericht = err instanceof Error ? err.message : 'Databasefout.';
      return NextResponse.json({ error: bericht }, { status: 500 });
    }
  });
}
