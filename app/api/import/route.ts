// FILE: route.ts
// AANGEMAAKT: 25-03-2026 10:30
// VERSIE: 1
// GEWIJZIGD: 02-04-2026 10:00
//
// WIJZIGINGEN (25-03-2026 17:30):
// - Initiële aanmaak: POST /api/import — multipart CSV ontvangen, parsen, matchen en opslaan
// - overgeslagen-veld toegevoegd aan response (duplicaten op basis van volgnummer)
// - Auto-categorisatie na import: gecategoriseerd + ongecategoriseerd in response
// WIJZIGINGEN (25-03-2026 18:30):
// - telling bijgewerkt naar nieuw type systeem (normaal-af/bij + omboeking-af/bij)
// WIJZIGINGEN (26-03-2026 11:00):
// - categoriseerTransacties aangeroepen zonder importId zodat ALLE transacties herverwerkt worden
// WIJZIGINGEN (30-03-2026):
// - Detectie onbekende rekeningen vóór opslaan; return { onbekendeRekeningen } bij onbekenden
// WIJZIGINGEN (30-03-2026 16:30):
// - categorie_id → categorie_ids (many-to-many via budgetten_potjes_rekeningen)
// - Optionele form-fields: bevestigdeRekeningen, genegeerdeIbans, permanentGenegeerdeIbans
// - Bevestigde rekeningen worden opgeslagen incl. beheerd-vlag en optionele budgetten_potjes koppeling
// - Genegeerde IBans worden gefilterd uit de import
// WIJZIGINGEN (02-04-2026 10:00):
// - triggerBackup() aangeroepen na succesvolle import

import { NextRequest, NextResponse } from 'next/server';
import { parseCSV } from '@/features/import/utils/parseCSV';
import { matchTransactie } from '@/features/import/utils/matchTransactie';
import { getMatchConfig } from '@/lib/configStore';
import { insertImport, insertTransacties } from '@/lib/imports';
import { categoriseerTransacties } from '@/lib/categorisatie';
import { getRekeningen, insertRekening, updateBeheerd } from '@/lib/rekeningen';
import getDb from '@/lib/db';
import { triggerBackup } from '@/lib/backup';
import { kiesAutomatischeKleur } from '@/lib/kleuren';
import { getBudgettenPotjes } from '@/lib/budgettenPotjes';

interface BevestigdeRekening {
  iban: string;
  naam: string;
  type: 'betaal' | 'spaar';
  beheerd: number;
  categorie_ids: number[];
}

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

  // Optionele bevestigingsparams (worden meegegeven bij herhaalde aanroep na modal)
  const bevestigdeRekeningen: BevestigdeRekening[] = JSON.parse(
    (formData.get('bevestigdeRekeningen') as string | null) ?? '[]'
  );
  const genegeerdeIbans: string[] = JSON.parse(
    (formData.get('genegeerdeIbans') as string | null) ?? '[]'
  );
  const permanentGenegeerdeIbans: string[] = JSON.parse(
    (formData.get('permanentGenegeerdeIbans') as string | null) ?? '[]'
  );

  let config;
  try {
    config = getMatchConfig();
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Configuratiefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }

  // Fase 1: Alle bestanden parsen
  const geParste: Array<{ bestand: File; ruweTransacties: ReturnType<typeof parseCSV> }> = [];
  for (const bestand of bestanden) {
    let csvTekst: string;
    try {
      csvTekst = await bestand.text();
    } catch {
      return NextResponse.json({ error: `Bestand '${bestand.name}' kon niet worden gelezen.` }, { status: 400 });
    }
    const ruweTransacties = parseCSV(csvTekst);
    if (ruweTransacties.length === 0) {
      return NextResponse.json(
        { error: `Geen transacties gevonden in '${bestand.name}'. Controleer het bestandsformaat.` },
        { status: 400 }
      );
    }
    geParste.push({ bestand, ruweTransacties });
  }

  // Fase 2: Onbekende rekeningen detecteren
  const db = getDb();
  const bekendeIbans = new Set(
    (db.prepare('SELECT iban FROM rekeningen').all() as { iban: string }[]).map(r => r.iban)
  );
  const genegeerdeDbIbans = new Set(
    (db.prepare('SELECT iban FROM genegeerde_rekeningen').all() as { iban: string }[]).map(r => r.iban)
  );
  const bevestigdeSet  = new Set(bevestigdeRekeningen.map(r => r.iban.trim().toUpperCase()));
  const skipSet        = new Set([...genegeerdeIbans, ...permanentGenegeerdeIbans].map(i => i.trim().toUpperCase()));

  const alleIbans = new Set<string>();
  const eersteTransactiePerIban: Record<string, string | null> = {};
  for (const { ruweTransacties } of geParste) {
    for (const t of ruweTransacties) {
      const iban = t.iban_bban?.trim().toUpperCase();
      if (!iban) continue;
      alleIbans.add(iban);
      if (!(iban in eersteTransactiePerIban)) {
        eersteTransactiePerIban[iban] = t.naam_tegenpartij ?? null;
      }
    }
  }

  const onbekend = Array.from(alleIbans).filter(
    iban => !bekendeIbans.has(iban) && !genegeerdeDbIbans.has(iban) && !bevestigdeSet.has(iban) && !skipSet.has(iban)
  );

  if (onbekend.length > 0) {
    return NextResponse.json({
      onbekendeRekeningen: onbekend.map(iban => ({
        iban,
        eersteTransactie: eersteTransactiePerIban[iban] ?? null,
      })),
    });
  }

  // Fase 3: Bevestigde rekeningen opslaan
  for (const r of bevestigdeRekeningen) {
    try {
      const bestaandeRek = getRekeningen().map(rk => rk.kleur).filter((k): k is string => !!k);
      const catKleuren = getBudgettenPotjes().map(bp => bp.kleur).filter((k): k is string => !!k);
      const kleur = kiesAutomatischeKleur([...bestaandeRek, ...catKleuren]);
      insertRekening(r.iban, r.naam, r.type, kleur);
      const rec = db
        .prepare('SELECT id FROM rekeningen WHERE iban = ?')
        .get(r.iban.trim().toUpperCase()) as { id: number } | undefined;
      if (rec) {
        updateBeheerd(rec.id, r.beheerd);
        for (const catId of r.categorie_ids ?? []) {
          db.prepare('INSERT OR IGNORE INTO budgetten_potjes_rekeningen (potje_id, rekening_id) VALUES (?, ?)').run(catId, rec.id);
        }
      }
    } catch { /* rekening bestond al */ }
  }

  // Permanent genegeerde rekeningen opslaan
  for (const iban of permanentGenegeerdeIbans) {
    db.prepare('INSERT OR IGNORE INTO genegeerde_rekeningen (iban) VALUES (?)')
      .run(iban.trim().toUpperCase());
  }

  // Fase 4: Import uitvoeren — genegeerde IBans overslaan
  const resultaten = [];
  for (const { bestand, ruweTransacties } of geParste) {
    const gefilterd = ruweTransacties.filter(t => !skipSet.has(t.iban_bban?.trim().toUpperCase() ?? ''));

    if (gefilterd.length === 0) {
      resultaten.push({
        importId: 0,
        aantalNormaalAf: 0, aantalNormaalBij: 0, aantalOmboekingAf: 0, aantalOmboekingBij: 0,
        totaal: ruweTransacties.length, overgeslagen: ruweTransacties.length,
        gecategoriseerd: 0, ongecategoriseerd: 0,
      });
      continue;
    }

    const gematcht = gefilterd.map(t => ({ ...t, type: matchTransactie(t, config) }));

    let importId: number;
    let opgeslagen: number;
    let gecategoriseerd = 0;
    let ongecategoriseerd = 0;
    try {
      importId = insertImport(bestand.name, gefilterd.length);
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
      aantalNormaalAf:    telling['normaal-af'],
      aantalNormaalBij:   telling['normaal-bij'],
      aantalOmboekingAf:  telling['omboeking-af'],
      aantalOmboekingBij: telling['omboeking-bij'],
      totaal:             ruweTransacties.length,
      overgeslagen:       ruweTransacties.length - opgeslagen,
      gecategoriseerd,
      ongecategoriseerd,
    });
  }

  // Vroegste datum bepalen voor redirect
  let vroegsteDatum: string | null = null;
  for (const { ruweTransacties } of geParste) {
    for (const t of ruweTransacties) {
      if (t.datum && (!vroegsteDatum || t.datum < vroegsteDatum)) vroegsteDatum = t.datum;
    }
  }

  triggerBackup();
  return NextResponse.json({ resultaten, vroegsteDatum });
}
