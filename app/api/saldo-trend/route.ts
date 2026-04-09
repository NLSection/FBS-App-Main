import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getInstellingen } from '@/lib/instellingen';
import { getPeriodeVanDatum } from '@/lib/maandperiodes';

export function GET() {
  try {
    const db = getDb();
    const { maandStartDag } = getInstellingen();

    // Alle transacties van spaarrekeningen met saldo, gesorteerd op datum+id
    const rijen = db.prepare(`
      SELECT r.id AS rekening_id, r.naam, r.kleur,
             t.datum, t.saldo_na_trn, t.id AS trx_id
      FROM rekeningen r
      JOIN transacties t ON t.iban_bban = r.iban
      WHERE r.type = 'spaar'
        AND t.saldo_na_trn IS NOT NULL
        AND t.datum IS NOT NULL
      ORDER BY t.datum ASC, t.id ASC
    `).all() as { rekening_id: number; naam: string; kleur: string | null; datum: string; saldo_na_trn: number; trx_id: number }[];

    // Groepeer per rekening + app-maand, bewaar laatste saldo per groep
    const sleutelMap = new Map<string, { rekening_id: number; naam: string; kleur: string | null; maand: string; eindsaldo: number }>();

    for (const r of rijen) {
      const datum = new Date(r.datum);
      const { jaar, maand } = getPeriodeVanDatum(datum, maandStartDag);
      const maandStr = `${jaar}-${String(maand).padStart(2, '0')}`;
      const sleutel = `${r.rekening_id}|${maandStr}`;
      // Overschrijven = altijd de laatste (want gesorteerd op datum ASC, id ASC)
      sleutelMap.set(sleutel, {
        rekening_id: r.rekening_id,
        naam: r.naam,
        kleur: r.kleur,
        maand: maandStr,
        eindsaldo: r.saldo_na_trn,
      });
    }

    const saldi = [...sleutelMap.values()].sort((a, b) =>
      a.naam.localeCompare(b.naam) || a.maand.localeCompare(b.maand)
    );

    // Spaarrekeningen met data
    const spaarIds = new Set(saldi.map(s => s.rekening_id));
    const rekeningen = (db.prepare(
      `SELECT id, naam, kleur FROM rekeningen WHERE type = 'spaar' ORDER BY naam`
    ).all() as { id: number; naam: string; kleur: string | null }[])
      .filter(r => spaarIds.has(r.id));

    // Rekeninggroepen waarbij ALLE rekeningen spaarrekeningen zijn met data
    const koppelingen = db.prepare(
      `SELECT groep_id, rekening_id FROM rekening_groep_rekeningen`
    ).all() as { groep_id: number; rekening_id: number }[];

    const groepRekeningen = new Map<number, number[]>();
    for (const k of koppelingen) {
      if (!groepRekeningen.has(k.groep_id)) groepRekeningen.set(k.groep_id, []);
      groepRekeningen.get(k.groep_id)!.push(k.rekening_id);
    }

    const alleGroepen = db.prepare(
      `SELECT id, naam FROM rekening_groepen ORDER BY volgorde ASC, id ASC`
    ).all() as { id: number; naam: string }[];

    const spaarGroepen = alleGroepen
      .map(g => ({ ...g, rekening_ids: groepRekeningen.get(g.id) ?? [] }))
      .filter(g =>
        g.rekening_ids.length > 0 &&
        g.rekening_ids.every(id => spaarIds.has(id))
      );

    return NextResponse.json({ saldi, rekeningen, groepen: spaarGroepen });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
