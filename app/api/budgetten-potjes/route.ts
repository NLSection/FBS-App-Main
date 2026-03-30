// FILE: route.ts
// AANGEMAAKT: 25-03-2026 19:30
// VERSIE: 1
// GEWIJZIGD: 28-03-2026 00:00
//
// WIJZIGINGEN (28-03-2026 00:00):
// - type parameter verwijderd uit POST body en insertBudgetPotje aanroep

import { NextRequest, NextResponse } from 'next/server';
import { getBudgettenPotjes, insertBudgetPotje } from '@/lib/budgettenPotjes';

export function GET() {
  try {
    return NextResponse.json(getBudgettenPotjes());
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: { naam?: string; rekening_id?: number | null; kleur?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ongeldig JSON-verzoek.' }, { status: 400 });
  }

  const naam = body.naam?.trim();
  if (!naam) return NextResponse.json({ error: 'Naam is verplicht.' }, { status: 400 });

  try {
    const id = insertBudgetPotje(naam, body.rekening_id ?? null, body.kleur ?? null);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
