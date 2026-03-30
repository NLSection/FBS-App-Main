// FILE: maandperiodes.ts
// AANGEMAAKT: 25-03-2026 21:00
// VERSIE: 1
// GEWIJZIGD: 25-03-2026 22:00
//
// WIJZIGINGEN (25-03-2026 21:00):
// - Initiële aanmaak: periode-logica op basis van MaandStartDag
// WIJZIGINGEN (25-03-2026 22:00):
// - Periode label = EINDMAAND (bijv. "jan '26" = 27 dec t/m 26 jan)

import getDb from '@/lib/db';

export type PeriodeStatus = 'afgesloten' | 'actueel' | 'toekomstig';

export interface Periode {
  jaar: number;
  maand: number;      // 1–12, label-maand (= EINDMAAND)
  label: string;      // bijv. "jan '26" = 27 dec t/m 26 jan
  start: string;      // ISO 'YYYY-MM-DD'
  eind: string;       // ISO 'YYYY-MM-DD'
  status: PeriodeStatus;
}

const MAAND_LABELS = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

/** Parse ISO datum-string als lokale datum (voorkomt UTC-shift) */
function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Formatteer Date als YYYY-MM-DD op basis van lokale tijd */
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Geeft start- en einddatum van een periode.
 * Periode (jaar, maand) met maandStartDag D, waarbij maand = EINDMAAND (label):
 *   eind  = dag D-1 van (jaar, maand)   [D=1: laatste dag van maand]
 *   start = dag D   van de vorige kalendermaand
 */
export function getPeriodeBereik(
  jaar: number,
  maand: number,      // 1-indexed EINDMAAND
  maandStartDag: number,
): { start: string; eind: string } {
  // Einddatum: dag (D-1) van de eindmaand; D=1 → laatste dag van eindmaand
  const eind = maandStartDag > 1
    ? new Date(jaar, maand - 1, maandStartDag - 1)
    : new Date(jaar, maand, 0);   // dag 0 van volgende maand = laatste dag eindmaand

  // Startdatum: dag D van de vorige kalendermaand
  const prevMaand0 = maand === 1 ? 11 : maand - 2;   // 0-indexed
  const prevJaar   = maand === 1 ? jaar - 1 : jaar;
  const start = maandStartDag === 1
    ? new Date(jaar, maand - 1, 1)                    // D=1: start = 1e van eindmaand zelf
    : new Date(prevJaar, prevMaand0, maandStartDag);

  return { start: toISO(start), eind: toISO(eind) };
}

/**
 * Geeft de periode-label (jaar + maand = EINDMAAND) waartoe een datum behoort.
 * Als dag >= maandStartDag: datum valt in periode die eindigt in de VOLGENDE maand.
 * Als dag <  maandStartDag: datum valt in periode die eindigt in DEZE maand.
 */
export function getPeriodeVanDatum(
  datum: Date,
  maandStartDag: number,
): { jaar: number; maand: number } {
  // D=1 → gewone kalendermaanden
  if (maandStartDag === 1) {
    return { jaar: datum.getFullYear(), maand: datum.getMonth() + 1 };
  }
  const dag = datum.getDate();
  if (dag >= maandStartDag) {
    // Periode gestart deze kalendermaand → eindigt in de VOLGENDE maand
    const nextMaand1 = datum.getMonth() + 2;          // 1-indexed volgende maand
    if (nextMaand1 > 12) return { jaar: datum.getFullYear() + 1, maand: 1 };
    return { jaar: datum.getFullYear(), maand: nextMaand1 };
  }
  // Periode gestart vorige kalendermaand → eindigt in DEZE maand
  return { jaar: datum.getFullYear(), maand: datum.getMonth() + 1 };
}

function periodeStatus(start: string, eind: string, vandaag: string): PeriodeStatus {
  if (eind   < vandaag) return 'afgesloten';
  if (start  > vandaag) return 'toekomstig';
  return 'actueel';
}

function periodeLabel(jaar: number, maand: number): string {
  return `${MAAND_LABELS[maand - 1]} '${String(jaar).slice(2)}`;
}

function stapMaand(jaar: number, maand: number): { jaar: number; maand: number } {
  return maand === 12
    ? { jaar: jaar + 1, maand: 1 }
    : { jaar, maand: maand + 1 };
}

function vergelijk(a: { jaar: number; maand: number }, b: { jaar: number; maand: number }): number {
  return a.jaar !== b.jaar ? a.jaar - b.jaar : a.maand - b.maand;
}

/**
 * Geeft alle periodes:
 * - Waarvoor transacties bestaan (min t/m max datum uit DB)
 * - Plus toekomstige periodes t/m december van het huidige jaar
 */
export function getAllePeriodes(maandStartDag: number): Periode[] {
  const db = getDb();
  const row = db
    .prepare('SELECT MIN(datum) AS min_datum, MAX(datum) AS max_datum FROM transacties WHERE datum IS NOT NULL')
    .get() as { min_datum: string | null; max_datum: string | null };

  const vandaag       = toISO(new Date());
  const huidigePeriode = getPeriodeVanDatum(new Date(), maandStartDag);
  const eindeJaar      = { jaar: new Date().getFullYear(), maand: 12 };

  // Startpunt: minPeriode als transacties aanwezig zijn, anders huidigePeriode
  const beginPeriode = row.min_datum
    ? getPeriodeVanDatum(parseISO(row.min_datum), maandStartDag)
    : huidigePeriode;

  // Eindpunt: max van maxPeriode en december huidig jaar
  const maxPeriode = row.max_datum
    ? getPeriodeVanDatum(parseISO(row.max_datum), maandStartDag)
    : huidigePeriode;
  const eindPeriode = vergelijk(eindeJaar, maxPeriode) > 0 ? eindeJaar : maxPeriode;

  const periodes: Periode[] = [];
  let cursor = { ...beginPeriode };
  while (vergelijk(cursor, eindPeriode) <= 0) {
    const bereik = getPeriodeBereik(cursor.jaar, cursor.maand, maandStartDag);
    periodes.push({
      ...cursor,
      label:  periodeLabel(cursor.jaar, cursor.maand),
      ...bereik,
      status: periodeStatus(bereik.start, bereik.eind, vandaag),
    });
    cursor = stapMaand(cursor.jaar, cursor.maand);
  }
  return periodes;
}
