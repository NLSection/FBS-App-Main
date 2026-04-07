// FILE: route.ts (api/dashboard/cat)
// AANGEMAAKT: 03-04-2026 03:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 03:00
//
// WIJZIGINGEN (03-04-2026 03:00):
// - Initiële aanmaak: GET /api/dashboard/cat — categorie-samenvatting per periode

import { NextRequest, NextResponse } from 'next/server';
import { getTransacties } from '@/lib/transacties';
import { getRekeningGroep } from '@/lib/rekeningGroepen';
import { getRekeningen } from '@/lib/rekeningen';

interface CatSubrij {
  subcategorie: string;
  bedrag: number;
}

interface CatRegel {
  categorie: string;
  totaal: number;
  subrijen: CatSubrij[];
}

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const datumVan  = params.get('datum_van') ?? undefined;
  const datumTot  = params.get('datum_tot') ?? undefined;
  const groepIdStr = params.get('groep_id');

  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  if (datumVan && !ISO_DATE.test(datumVan)) {
    return NextResponse.json({ error: 'datum_van moet YYYY-MM-DD formaat hebben.' }, { status: 400 });
  }
  if (datumTot && !ISO_DATE.test(datumTot)) {
    return NextResponse.json({ error: 'datum_tot moet YYYY-MM-DD formaat hebben.' }, { status: 400 });
  }

  try {
    const transacties = getTransacties({ datum_van: datumVan, datum_tot: datumTot });

    // Optioneel filteren op rekeninggroep
    const groepIbans = groepIdStr
      ? new Set(
          getRekeningen()
            .filter(r => (getRekeningGroep(Number(groepIdStr))?.rekening_ids ?? []).includes(r.id))
            .map(r => r.iban)
        )
      : null;

    // Groepeer op categorie + subcategorie, sluit omboekingen uit
    const groepMap = new Map<string, Map<string, number>>();

    for (const t of transacties) {
      if (!t.categorie) continue;
      if (t.type === 'omboeking-af' || t.type === 'omboeking-bij') continue;
      if (groepIbans && (!t.iban_bban || !groepIbans.has(t.iban_bban))) continue;

      const sub = t.subcategorie ?? '';
      if (!groepMap.has(t.categorie)) groepMap.set(t.categorie, new Map());
      const subMap = groepMap.get(t.categorie)!;
      subMap.set(sub, (subMap.get(sub) ?? 0) + (t.bedrag ?? 0));
    }

    const trunc2 = (n: number) => Math.trunc(n * 100) / 100;

    const resultaat: CatRegel[] = [];
    for (const [categorie, subMap] of groepMap) {
      const subrijen: CatSubrij[] = [];
      let totaal = 0;

      const subs = [...subMap.entries()].sort((a, b) => a[0].localeCompare(b[0], 'nl'));
      for (const [sub, bedrag] of subs) {
        totaal += bedrag;
        if (sub) subrijen.push({ subcategorie: sub, bedrag: trunc2(bedrag) });
      }

      // Toon subrijen alleen als er >1 subcategorie is, of als de subcategorie afwijkt van de categorienaam
      const gefilterdeSubrijen = subrijen.length > 1
        ? subrijen
        : subrijen.filter(s => s.subcategorie !== categorie);

      resultaat.push({ categorie, totaal: trunc2(totaal), subrijen: gefilterdeSubrijen });
    }

    resultaat.sort((a, b) => a.categorie.localeCompare(b.categorie, 'nl'));
    return NextResponse.json(resultaat);
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
