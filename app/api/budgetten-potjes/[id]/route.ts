// FILE: route.ts
// AANGEMAAKT: 25-03-2026 19:30
// VERSIE: 1
// GEWIJZIGD: 28-03-2026 00:00
//
// WIJZIGINGEN (28-03-2026 00:00):
// - type parameter verwijderd uit PUT body en updateBudgetPotje aanroep

import { NextRequest, NextResponse } from 'next/server';
import { deleteBudgetPotje, getBudgetPotje, updateBudgetPotje } from '@/lib/budgettenPotjes';
import { triggerBackup } from '@/lib/backup';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: 'Ongeldig id.' }, { status: 400 });

  let body: { naam?: string; rekening_ids?: number[]; kleur?: string | null };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 });
  }

  try {
    const huidig = getBudgetPotje(numId);
    updateBudgetPotje(
      numId,
      body.naam ?? huidig?.naam ?? null,
      body.rekening_ids ?? huidig?.rekening_ids ?? [],
      'kleur' in body ? (body.kleur ?? null) : (huidig?.kleur ?? null),
    );
    triggerBackup();
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 400 });
  }
}

export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'Ongeldig id.' }, { status: 400 });
    }
    try {
      deleteBudgetPotje(numId);
      triggerBackup();
      return new NextResponse(null, { status: 204 });
    } catch (err) {
      const bericht = err instanceof Error ? err.message : 'Databasefout.';
      const status = bericht.includes('beschermd') ? 403 : 500;
      return NextResponse.json({ error: bericht }, { status });
    }
  });
}
