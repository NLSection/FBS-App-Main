// FILE: route.ts (api/vaste-lasten-overzicht)
// AANGEMAAKT: 03-04-2026 19:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 19:00
//
// WIJZIGINGEN (03-04-2026 19:00):
// - Initiële aanmaak: GET vaste lasten overzicht per subcategorie en naam

import { NextResponse } from 'next/server';
import { getInstellingen } from '@/lib/instellingen';
import { getTransacties } from '@/lib/transacties';
import { getPeriodeBereik } from '@/lib/maandperiodes';

const MAAND_LABELS = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

export function GET() {
  try {
    const inst = getInstellingen();
    const aantalMaanden = inst.vasteLastenOverzichtMaanden;
    const afwijkingDrempel = inst.vasteLastenAfwijkingProcent;
    const maandStartDag = inst.maandStartDag;

    // Bepaal huidige periode
    const vandaag = new Date();
    const dagVandaag = vandaag.getDate();
    let huidigMaand = vandaag.getMonth() + 1; // 1-indexed
    let huidigJaar = vandaag.getFullYear();
    if (maandStartDag > 1 && dagVandaag >= maandStartDag) {
      huidigMaand++;
      if (huidigMaand > 12) { huidigMaand = 1; huidigJaar++; }
    }

    // Laatste N afgesloten periodes (de huidige periode is actueel, dus we gaan N terug)
    const periodes: { jaar: number; maand: number; label: string; start: string; eind: string }[] = [];
    let pJaar = huidigJaar;
    let pMaand = huidigMaand;
    // Ga 1 terug voor de eerste afgesloten periode
    for (let i = 0; i < aantalMaanden; i++) {
      pMaand--;
      if (pMaand < 1) { pMaand = 12; pJaar--; }
      const bereik = getPeriodeBereik(pJaar, pMaand, maandStartDag);
      periodes.unshift({
        jaar: pJaar,
        maand: pMaand,
        label: `${MAAND_LABELS[pMaand - 1]} '${String(pJaar).slice(2)}`,
        ...bereik,
      });
    }

    if (periodes.length === 0) {
      return NextResponse.json({ periodes: [], afwijkingDrempel, groepen: [] });
    }

    // Haal transacties op voor het volledige bereik
    const datumVan = periodes[0].start;
    const datumTot = periodes[periodes.length - 1].eind;
    const transacties = getTransacties({ datum_van: datumVan, datum_tot: datumTot });

    // Filter op Vaste Lasten categorie, exclusief omboekingen
    const vasteLasten = transacties.filter(t =>
      t.categorie === 'Vaste Lasten' &&
      t.type !== 'omboeking-af' && t.type !== 'omboeking-bij'
    );

    // Bepaal in welke periode elke transactie valt
    type PeriodeKey = string;
    const periodeLabels = periodes.map(p => p.label);
    const periodeRanges = periodes.map(p => ({ label: p.label, start: p.start, eind: p.eind }));

    function getPeriodeLabel(datum: string): PeriodeKey | null {
      for (const p of periodeRanges) {
        if (datum >= p.start && datum <= p.eind) return p.label;
      }
      return null;
    }

    // Groepeer: subcategorie → naam → periode → bedrag
    const groepMap = new Map<string, Map<string, Map<PeriodeKey, number>>>();

    for (const t of vasteLasten) {
      const datum = t.datum_aanpassing ?? t.datum;
      if (!datum) continue;
      const periodeLabel = getPeriodeLabel(datum);
      if (!periodeLabel) continue;

      const sub = t.subcategorie ?? 'Overig';
      const naam = t.naam_tegenpartij ?? 'Onbekend';

      if (!groepMap.has(sub)) groepMap.set(sub, new Map());
      const subMap = groepMap.get(sub)!;
      if (!subMap.has(naam)) subMap.set(naam, new Map());
      const naamMap = subMap.get(naam)!;
      naamMap.set(periodeLabel, (naamMap.get(periodeLabel) ?? 0) + (t.bedrag ?? 0));
    }

    // Bouw response
    const groepen = [...groepMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([subcategorie, subMap]) => ({
        subcategorie,
        items: [...subMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([naam, naamMap]) => {
            const periodesObj: Record<string, { bedrag: number | null; afwijking: number | null; afwezig: boolean }> = {};
            let vorigBedrag: number | null = null;

            for (const label of periodeLabels) {
              const bedrag = naamMap.get(label) ?? null;
              const afwezig = bedrag === null;
              let afwijking: number | null = null;

              if (!afwezig && vorigBedrag !== null && vorigBedrag !== 0) {
                afwijking = Math.round(((bedrag - vorigBedrag) / Math.abs(vorigBedrag)) * 100);
              }

              periodesObj[label] = { bedrag, afwijking, afwezig };
              if (!afwezig) vorigBedrag = bedrag;
            }

            return { naam, periodes: periodesObj };
          }),
      }));

    return NextResponse.json({ periodes: periodeLabels, afwijkingDrempel, groepen });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
