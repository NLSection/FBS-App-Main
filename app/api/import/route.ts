// FILE: route.ts
// AANGEMAAKT: 25-03-2026 10:30
// VERSIE: 1
// GEWIJZIGD: 25-03-2026 18:30
//
// WIJZIGINGEN (25-03-2026 17:30):
// - Initiële aanmaak: POST /api/import — multipart CSV ontvangen, parsen, matchen en opslaan
// - overgeslagen-veld toegevoegd aan response (duplicaten op basis van volgnummer)
// - Auto-categorisatie na import: gecategoriseerd + ongecategoriseerd in response
// WIJZIGINGEN (25-03-2026 18:30):
// - telling bijgewerkt naar nieuw type systeem (normaal-af/bij + omboeking-af/bij)
// WIJZIGINGEN (26-03-2026 11:00):
// - categoriseerTransacties aangeroepen zonder importId zodat ALLE transacties herverwerkt worden

import { NextRequest, NextResponse } from 'next/server';
import { parseCSV } from '@/features/import/utils/parseCSV';
import { matchTransactie } from '@/features/import/utils/matchTransactie';
import { getMatchConfig } from '@/lib/configStore';
import { insertImport, insertTransacties } from '@/lib/imports';
import { categoriseerTransacties } from '@/lib/categorisatie';

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek — multipart/form-data verwacht.' }, { status: 400 });
  }

  const bestanden = formData.getAll('files') as File[];
  if (bestanden.length === 0) {
    return NextResponse.json({ error: 'Geen bestanden ontvangen.' }, { status: 400 });
  }

  let config;
  try {
    config = getMatchConfig();
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Configuratiefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }

  const resultaten = [];

  for (const bestand of bestanden) {
    let csvTekst: string;
    try {
      csvTekst = await bestand.text();
    } catch {
      return NextResponse.json(
        { error: `Bestand '${bestand.name}' kon niet worden gelezen.` },
        { status: 400 }
      );
    }

    const ruweTransacties = parseCSV(csvTekst);
    if (ruweTransacties.length === 0) {
      return NextResponse.json(
        { error: `Geen transacties gevonden in '${bestand.name}'. Controleer het bestandsformaat.` },
        { status: 400 }
      );
    }

    const gematcht = ruweTransacties.map(t => ({
      ...t,
      type: matchTransactie(t, config),
    }));

    let importId: number;
    let opgeslagen: number;
    let gecategoriseerd = 0;
    let ongecategoriseerd = 0;
    try {
      importId = insertImport(bestand.name, ruweTransacties.length);
      opgeslagen = insertTransacties(importId, gematcht);
      ({ gecategoriseerd, ongecategoriseerd } = categoriseerTransacties());
    } catch (err) {
      const bericht = err instanceof Error ? err.message : 'Databasefout.';
      return NextResponse.json({ error: `Opslaan mislukt: ${bericht}` }, { status: 500 });
    }

    const telling = gematcht.reduce(
      (acc, t) => { acc[t.type]++; return acc; },
      { 'normaal-af': 0, 'normaal-bij': 0, 'omboeking-af': 0, 'omboeking-bij': 0 }
    );

    resultaten.push({
      importId,
      aantalNormaalAf:   telling['normaal-af'],
      aantalNormaalBij:  telling['normaal-bij'],
      aantalOmboekingAf: telling['omboeking-af'],
      aantalOmboekingBij:telling['omboeking-bij'],
      totaal:            ruweTransacties.length,
      overgeslagen:     ruweTransacties.length - opgeslagen,
      gecategoriseerd,
      ongecategoriseerd,
    });
  }

  return NextResponse.json({ resultaten });
}
