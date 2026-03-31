// FILE: route.ts (api/dashboard/bls)
// AANGEMAAKT: 31-03-2026 21:00
// VERSIE: 1
// GEWIJZIGD: 31-03-2026 21:00
//
// WIJZIGINGEN (31-03-2026 21:00):
// - Initiële aanmaak: GET /api/dashboard/bls — BLS-berekening per categorie

import { NextRequest, NextResponse } from 'next/server';
import { getTransacties } from '@/lib/transacties';

interface SubcategorieRegel {
  naam: string;
  bedrag: number;
}

interface BlsRegel {
  categorie: string;
  uitgegeven: number;
  gecorrigeerd: number;
  saldo: number;
  subcategorieen: SubcategorieRegel[];
}

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const datumVan = params.get('datum_van') ?? undefined;
  const datumTot = params.get('datum_tot') ?? undefined;

  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  if (datumVan && !ISO_DATE.test(datumVan)) {
    return NextResponse.json({ error: 'datum_van moet YYYY-MM-DD formaat hebben.' }, { status: 400 });
  }
  if (datumTot && !ISO_DATE.test(datumTot)) {
    return NextResponse.json({ error: 'datum_tot moet YYYY-MM-DD formaat hebben.' }, { status: 400 });
  }

  try {
    const transacties = getTransacties({ datum_van: datumVan, datum_tot: datumTot });

    const uitgegevenPerCat = new Map<string, number>();
    const subcatPerCat = new Map<string, Map<string, number>>();
    const gecorrPerCat = new Map<string, number>();

    for (const t of transacties) {
      if (!t.categorie) continue;
      const bedrag = t.bedrag ?? 0;
      const subcatNaam = t.subcategorie ?? '';
      const isOmboeking = subcatNaam.startsWith('Omboekingen');

      if (!isOmboeking && (t.type === 'normaal-af' || t.type === 'normaal-bij')) {
        uitgegevenPerCat.set(t.categorie, (uitgegevenPerCat.get(t.categorie) ?? 0) + bedrag);

        const subMap = subcatPerCat.get(t.categorie) ?? new Map<string, number>();
        const label = t.subcategorie ?? '(geen subcategorie)';
        subMap.set(label, (subMap.get(label) ?? 0) + bedrag);
        subcatPerCat.set(t.categorie, subMap);
      } else if (isOmboeking) {
        // Formaat: "Omboekingen – [doelcategorie] – GR/BR"
        const delen = subcatNaam.split(' – ');
        if (delen.length >= 2) {
          const doelcat = delen[1].trim();
          gecorrPerCat.set(doelcat, (gecorrPerCat.get(doelcat) ?? 0) + bedrag);
        }
      }
    }

    const alleCats = new Set([...uitgegevenPerCat.keys(), ...gecorrPerCat.keys()]);
    const resultaat: BlsRegel[] = [];

    for (const cat of alleCats) {
      const uitgegeven = uitgegevenPerCat.get(cat) ?? 0;
      const gecorrigeerd = gecorrPerCat.get(cat) ?? 0;
      const subMap = subcatPerCat.get(cat);
      const subcategorieen: SubcategorieRegel[] = subMap
        ? [...subMap.entries()]
            .map(([naam, bedrag]) => ({ naam, bedrag }))
            .sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))
        : [];

      resultaat.push({
        categorie: cat,
        uitgegeven,
        gecorrigeerd,
        saldo: uitgegeven + gecorrigeerd,
        subcategorieen,
      });
    }

    resultaat.sort((a, b) => a.categorie.localeCompare(b.categorie, 'nl'));
    return NextResponse.json(resultaat);
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
