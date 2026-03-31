// FILE: route.ts (api/dashboard/bls)
// AANGEMAAKT: 31-03-2026 21:00
// VERSIE: 1
// GEWIJZIGD: 31-03-2026 22:00
//
// WIJZIGINGEN (31-03-2026 21:00):
// - Initiële aanmaak: GET /api/dashboard/bls — BLS-berekening per categorie
// WIJZIGINGEN (31-03-2026 21:30):
// - BLS filter op eigen rekening; isOmboeking check op type
// WIJZIGINGEN (31-03-2026 22:00):
// - Volledig herschreven: BLS = verkeerde boekingen per {categorie, transactierekening, gekoppelde rekening}
// - Gecorrigeerd via omboekingen die exact matchen op {subcategorie, iban_bban}

import { NextRequest, NextResponse } from 'next/server';
import { getTransacties } from '@/lib/transacties';
import { getBudgettenPotjes } from '@/lib/budgettenPotjes';
import { getRekeningen } from '@/lib/rekeningen';

interface BlsRegel {
  categorie: string;
  gedaanOpRekening: string;
  hoortOpRekening: string;
  bedrag: number;
  gecorrigeerd: number;
  saldo: number;
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
    // Stap 1 — Data ophalen
    const rekeningen = getRekeningen();
    const rekeningNaamById  = new Map<number, string>(rekeningen.map(r => [r.id,   r.naam]));
    const rekeningNaamByIban = new Map<string, string>(rekeningen.map(r => [r.iban, r.naam]));
    const rekeningIdByIban   = new Map<string, number>(rekeningen.map(r => [r.iban, r.id]));

    // Categorieën (budgetten/potjes) met gekoppelde rekening_id
    const catGekoppeld = new Map<string, number>(); // naam → rekening_id
    for (const potje of getBudgettenPotjes()) {
      if (potje.rekening_ids.length > 0) {
        catGekoppeld.set(potje.naam, potje.rekening_ids[0]);
      }
    }

    const transacties = getTransacties({ datum_van: datumVan, datum_tot: datumTot });

    // Stap 2 — BLS rijen: verkeerde boekingen
    type Groep = { categorie: string; iban_bban: string; gekoppeldeRekeningId: number; bedrag: number; gecorrigeerd: number };
    const groepMap = new Map<string, Groep>();

    for (const t of transacties) {
      if (!t.categorie || !t.iban_bban) continue;
      if (t.type !== 'normaal-af' && t.type !== 'normaal-bij') continue;

      const gekoppeldeRekeningId = catGekoppeld.get(t.categorie);
      if (gekoppeldeRekeningId === undefined) continue;

      const trxRekeningId = rekeningIdByIban.get(t.iban_bban);
      if (trxRekeningId === undefined) continue;
      if (trxRekeningId === gekoppeldeRekeningId) continue; // juiste rekening

      const sleutel = `${t.categorie}::${t.iban_bban}::${gekoppeldeRekeningId}`;
      const bestaand = groepMap.get(sleutel);
      if (bestaand) {
        bestaand.bedrag += t.bedrag ?? 0;
      } else {
        groepMap.set(sleutel, {
          categorie: t.categorie,
          iban_bban: t.iban_bban,
          gekoppeldeRekeningId,
          bedrag: t.bedrag ?? 0,
          gecorrigeerd: 0,
        });
      }
    }

    // Stap 3 — Gecorrigeerd: omboekingen die exact matchen op {subcategorie = categorie_naam, iban_bban}
    for (const t of transacties) {
      if (t.type !== 'omboeking-af' && t.type !== 'omboeking-bij') continue;
      if (!t.subcategorie || !t.iban_bban) continue;

      const gekoppeldeRekeningId = catGekoppeld.get(t.subcategorie);
      if (gekoppeldeRekeningId === undefined) continue;

      const sleutel = `${t.subcategorie}::${t.iban_bban}::${gekoppeldeRekeningId}`;
      const groep = groepMap.get(sleutel);
      if (groep) groep.gecorrigeerd += t.bedrag ?? 0;
    }

    // Stap 4 — Response opmaken
    const resultaat: BlsRegel[] = [];
    for (const g of groepMap.values()) {
      resultaat.push({
        categorie:        g.categorie,
        gedaanOpRekening: rekeningNaamByIban.get(g.iban_bban)         ?? g.iban_bban,
        hoortOpRekening:  rekeningNaamById.get(g.gekoppeldeRekeningId) ?? String(g.gekoppeldeRekeningId),
        bedrag:           g.bedrag,
        gecorrigeerd:     g.gecorrigeerd,
        saldo:            g.bedrag + g.gecorrigeerd,
      });
    }

    resultaat.sort((a, b) => a.categorie.localeCompare(b.categorie, 'nl'));
    return NextResponse.json(resultaat);
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
