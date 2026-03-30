// FILE: route.ts
// AANGEMAAKT: 25-03-2026 11:30
// VERSIE: 1
// GEWIJZIGD: 25-03-2026 20:00
//
// WIJZIGINGEN (25-03-2026 11:30):
// - Initiële aanmaak: DELETE /api/vaste-lasten-config/[id]
// WIJZIGINGEN (25-03-2026 20:00):
// - PUT /api/vaste-lasten-config/[id] toegevoegd

import { NextRequest, NextResponse } from 'next/server';
import { deleteVasteLastDefinitie, updateVasteLastDefinitie } from '@/lib/vasteLastenConfig';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: 'Ongeldig id.' }, { status: 400 });

  let body: { iban?: string; naam?: string; omschrijving?: string | null; label?: string; verwachte_dag?: number | null; verwacht_bedrag?: number | null };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 });
  }
  try {
    updateVasteLastDefinitie(
      numId,
      body.iban ?? '',
      body.naam ?? '',
      body.omschrijving ?? null,
      body.label ?? '',
      body.verwachte_dag ?? null,
      body.verwacht_bedrag ?? null
    );
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
      deleteVasteLastDefinitie(numId);
      return NextResponse.json({ ok: true });
    } catch (err) {
      const bericht = err instanceof Error ? err.message : 'Databasefout.';
      return NextResponse.json({ error: bericht }, { status: 500 });
    }
  });
}
