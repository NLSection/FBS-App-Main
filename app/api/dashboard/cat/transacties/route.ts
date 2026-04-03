// FILE: route.ts (api/dashboard/cat/transacties)
// AANGEMAAKT: 03-04-2026 22:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 22:00
//
// WIJZIGINGEN (03-04-2026 22:00):
// - Initiële aanmaak: GET /api/dashboard/cat/transacties — transacties per subcategorie

import { NextRequest, NextResponse } from 'next/server';
import { getTransacties } from '@/lib/transacties';

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const categorie   = params.get('categorie');
  const subcategorie = params.get('subcategorie') ?? '';
  const van = params.get('van') ?? undefined;
  const tot = params.get('tot') ?? undefined;

  if (!categorie) return NextResponse.json({ error: 'categorie is verplicht.' }, { status: 400 });

  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  if (van && !ISO_DATE.test(van)) return NextResponse.json({ error: 'van moet YYYY-MM-DD formaat hebben.' }, { status: 400 });
  if (tot && !ISO_DATE.test(tot)) return NextResponse.json({ error: 'tot moet YYYY-MM-DD formaat hebben.' }, { status: 400 });

  try {
    const transacties = getTransacties({ datum_van: van, datum_tot: tot });
    const gefilterd = transacties.filter(t => {
      if (t.categorie !== categorie) return false;
      if (t.type === 'omboeking-af' || t.type === 'omboeking-bij') return false;
      if (subcategorie !== '') return (t.subcategorie ?? '') === subcategorie;
      return true;
    });

    return NextResponse.json(gefilterd.map(t => ({
      id:              t.id,
      datum:           t.datum_aanpassing ?? t.datum,
      naam_tegenpartij: t.naam_tegenpartij,
      omschrijving:    [t.omschrijving_1, t.omschrijving_2, t.omschrijving_3].filter(Boolean).join(' '),
      bedrag:          t.bedrag,
      rekening_naam:   t.rekening_naam,
      categorie:       t.categorie,
      subcategorie:    t.subcategorie,
    })));
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
