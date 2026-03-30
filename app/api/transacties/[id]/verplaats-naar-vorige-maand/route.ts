// FILE: route.ts (api/transacties/[id]/verplaats-naar-vorige-maand)
// AANGEMAAKT: 26-03-2026 17:00
// VERSIE: 1
// GEWIJZIGD: 26-03-2026 17:00
//
// WIJZIGINGEN (26-03-2026 17:00):
// - Initiële aanmaak: PATCH — verplaats transactie naar eind van vorige maandperiode

import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getPeriodeVanDatum, getPeriodeBereik } from '@/lib/maandperiodes';

type Params = Promise<{ id: string }>;

export async function PATCH(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: 'Ongeldig id.' }, { status: 400 });

  const db = getDb();

  const transactie = db
    .prepare('SELECT id, datum, originele_datum FROM transacties WHERE id = ?')
    .get(numId) as { id: number; datum: string | null; originele_datum: string | null } | undefined;
  if (!transactie) return NextResponse.json({ error: 'Transactie niet gevonden.' }, { status: 404 });
  if (!transactie.datum) return NextResponse.json({ error: 'Transactie heeft geen datum.' }, { status: 400 });

  const inst = db
    .prepare('SELECT maand_start_dag FROM instellingen WHERE id = 1')
    .get() as { maand_start_dag: number };
  const maandStartDag = inst.maand_start_dag;

  const [y, m, d] = transactie.datum.split('-').map(Number);
  const datumObj = new Date(y, m - 1, d);

  // Huidige periode (label-maand = eind-maand van de periode)
  const huidigePeriode = getPeriodeVanDatum(datumObj, maandStartDag);

  // Vorige periode
  const prevMaand = huidigePeriode.maand === 1 ? 12 : huidigePeriode.maand - 1;
  const prevJaar  = huidigePeriode.maand === 1 ? huidigePeriode.jaar - 1 : huidigePeriode.jaar;

  // Einddatum van de vorige periode = maandStartDag - 1 van huidigePeriode.maand
  const { eind } = getPeriodeBereik(prevJaar, prevMaand, maandStartDag);

  // Bewaar originele_datum als die nog niet gezet is
  const origDatum = transactie.originele_datum ?? transactie.datum;

  db.prepare('UPDATE transacties SET datum = ?, originele_datum = ?, handmatig_gecategoriseerd = 1 WHERE id = ?')
    .run(eind, origDatum, numId);

  return NextResponse.json({ ok: true, nieuweDatum: eind });
}
