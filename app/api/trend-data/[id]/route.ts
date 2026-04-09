import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getPanel } from '@/lib/trendPanels';
import { getInstellingen } from '@/lib/instellingen';
import { getPeriodeVanDatum } from '@/lib/maandperiodes';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const panel = getPanel(parseInt(id));
    if (!panel) return NextResponse.json({ error: 'Panel niet gevonden.' }, { status: 404 });

    const db = getDb();
    const { maandStartDag } = getInstellingen();

    if (panel.databron === 'saldo') {
      return NextResponse.json(saldoData(db, panel.items.filter(i => i.item_type === 'rekening').map(i => i.item_id), maandStartDag));
    }

    // uitgaven of inkomsten
    const catIds = panel.items.filter(i => i.item_type === 'categorie').map(i => i.item_id);
    const subIds = panel.items.filter(i => i.item_type === 'subcategorie').map(i => i.item_id);
    return NextResponse.json(bestedingsData(db, panel.databron, catIds, subIds, maandStartDag));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function saldoData(db: ReturnType<typeof getDb>, rekeningIds: number[], maandStartDag: number) {
  if (rekeningIds.length === 0) return { series: [], maanden: [] };

  const placeholders = rekeningIds.map(() => '?').join(',');
  const rijen = db.prepare(`
    SELECT r.id AS rekening_id, r.naam, r.kleur,
           t.datum, t.saldo_na_trn
    FROM rekeningen r
    JOIN transacties t ON t.iban_bban = r.iban
    WHERE r.id IN (${placeholders})
      AND t.saldo_na_trn IS NOT NULL
      AND t.datum IS NOT NULL
    ORDER BY t.datum ASC, t.id ASC
  `).all(...rekeningIds) as { rekening_id: number; naam: string; kleur: string | null; datum: string; saldo_na_trn: number }[];

  const sleutelMap = new Map<string, { rekening_id: number; naam: string; kleur: string | null; maand: string; waarde: number }>();

  for (const r of rijen) {
    const datum = new Date(r.datum);
    const { jaar, maand } = getPeriodeVanDatum(datum, maandStartDag);
    const maandStr = `${jaar}-${String(maand).padStart(2, '0')}`;
    const sleutel = `${r.rekening_id}|${maandStr}`;
    sleutelMap.set(sleutel, { rekening_id: r.rekening_id, naam: r.naam, kleur: r.kleur, maand: maandStr, waarde: r.saldo_na_trn });
  }

  const dataPunten = [...sleutelMap.values()];
  const maanden = [...new Set(dataPunten.map(d => d.maand))].sort();
  const rekNamen = db.prepare(`SELECT id, naam, kleur FROM rekeningen WHERE id IN (${placeholders}) ORDER BY naam`).all(...rekeningIds) as { id: number; naam: string; kleur: string | null }[];

  const series = rekNamen.map(r => ({
    id: r.id,
    naam: r.naam,
    kleur: r.kleur,
    data: maanden.map(m => {
      const punt = dataPunten.find(d => d.rekening_id === r.id && d.maand === m);
      return punt ? punt.waarde : null;
    }),
  }));

  return { series, maanden };
}

function bestedingsData(
  db: ReturnType<typeof getDb>,
  databron: string,
  catIds: number[],
  subIds: number[],
  maandStartDag: number,
) {
  // Haal alle subcategorie-records op voor de geselecteerde items
  const subRecords: { id: number; categorie: string; naam: string }[] = [];

  if (catIds.length > 0) {
    const ph = catIds.map(() => '?').join(',');
    const subs = db.prepare(`SELECT id, categorie, naam FROM subcategorieen WHERE id IN (${ph})`).all(...catIds) as typeof subRecords;
    subRecords.push(...subs);
  }
  if (subIds.length > 0) {
    const ph = subIds.map(() => '?').join(',');
    const subs = db.prepare(`SELECT id, categorie, naam FROM subcategorieen WHERE id IN (${ph})`).all(...subIds) as typeof subRecords;
    subRecords.push(...subs);
  }

  if (subRecords.length === 0) return { series: [], maanden: [] };

  // Bouw een mapping: subcategorie naam → id (voor matching met categorieen tabel)
  // Transacties zijn gekoppeld via categorie_id → categorieen.id → categorieen.subcategorie
  // We groeperen op de subcategorie naam uit de categorieen tabel

  // Haal alle relevante transacties op
  const bedragFilter = databron === 'uitgaven' ? 't.bedrag < 0' : 't.bedrag > 0';

  // Bouw WHERE clause voor de subcategorieën
  const subNamen = subRecords.map(s => s.naam);
  const subCats = subRecords.map(s => s.categorie);
  const conditions: string[] = [];
  const condParams: string[] = [];

  for (const sub of subRecords) {
    conditions.push('(c.categorie = ? AND c.subcategorie = ?)');
    condParams.push(sub.categorie, sub.naam);
  }

  if (conditions.length === 0) return { series: [], maanden: [] };

  const rijen = db.prepare(`
    SELECT t.datum, t.bedrag, c.categorie, c.subcategorie
    FROM transacties t
    JOIN categorieen c ON t.categorie_id = c.id
    WHERE ${bedragFilter}
      AND t.datum IS NOT NULL
      AND (${conditions.join(' OR ')})
    ORDER BY t.datum ASC
  `).all(...condParams) as { datum: string; bedrag: number; categorie: string; subcategorie: string }[];

  // Groepeer per subcategorie + maand
  const totalen = new Map<string, number>();
  const alleMaanden = new Set<string>();

  for (const r of rijen) {
    const datum = new Date(r.datum);
    const { jaar, maand } = getPeriodeVanDatum(datum, maandStartDag);
    const maandStr = `${jaar}-${String(maand).padStart(2, '0')}`;
    const label = r.subcategorie || r.categorie;
    const sleutel = `${label}|${maandStr}`;
    totalen.set(sleutel, (totalen.get(sleutel) ?? 0) + Math.abs(r.bedrag));
    alleMaanden.add(maandStr);
  }

  const maanden = [...alleMaanden].sort();

  // Unieke labels in volgorde van subRecords
  const labels = [...new Map(subRecords.map(s => [s.naam || s.categorie, s])).keys()];

  const series = labels.map(label => ({
    id: subRecords.find(s => (s.naam || s.categorie) === label)?.id ?? 0,
    naam: label,
    kleur: null as string | null,
    data: maanden.map(m => {
      const val = totalen.get(`${label}|${m}`);
      return val !== undefined ? Math.round(val * 100) / 100 : null;
    }),
  }));

  return { series, maanden };
}
