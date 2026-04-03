// FILE: instellingen.ts
// AANGEMAAKT: 25-03-2026 21:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 22:00
//
// WIJZIGINGEN (03-04-2026 22:00):
// - catUitklappen instelling toegevoegd (cat_uitklappen kolom)
// WIJZIGINGEN (25-03-2026 21:00):
// - Initiële aanmaak: getInstellingen en updateInstellingen

import getDb from '@/lib/db';

export interface Instellingen {
  maandStartDag:          number;
  dashboardBlsTonen:      boolean;
  dashboardCatTonen:      boolean;
  dashboardBlsUitgeklapt: boolean;
  dashboardCatUitgeklapt: boolean;
  catUitklappen:          boolean;
  catTrxUitgeklapt:       boolean;
  vasteLastenOverzichtMaanden: number;
  vasteLastenAfwijkingProcent: number;
}

type Row = {
  maand_start_dag:           number;
  dashboard_bls_tonen:       number;
  dashboard_cat_tonen:       number;
  dashboard_bls_uitgeklapt:  number;
  dashboard_cat_uitgeklapt:  number;
  cat_uitklappen:            number;
  cat_trx_uitgeklapt:        number;
  vaste_lasten_overzicht_maanden: number;
  vaste_lasten_afwijking_procent: number;
};

export function getInstellingen(): Instellingen {
  const row = getDb()
    .prepare('SELECT maand_start_dag, dashboard_bls_tonen, dashboard_cat_tonen, dashboard_bls_uitgeklapt, dashboard_cat_uitgeklapt, cat_uitklappen, cat_trx_uitgeklapt, vaste_lasten_overzicht_maanden, vaste_lasten_afwijking_procent FROM instellingen WHERE id = 1')
    .get() as Row | undefined;
  if (!row) throw new Error('Instellingen niet gevonden in database.');
  return {
    maandStartDag:          row.maand_start_dag,
    dashboardBlsTonen:      row.dashboard_bls_tonen      !== 0,
    dashboardCatTonen:      row.dashboard_cat_tonen      !== 0,
    dashboardBlsUitgeklapt: row.dashboard_bls_uitgeklapt !== 0,
    dashboardCatUitgeklapt: row.dashboard_cat_uitgeklapt !== 0,
    catUitklappen:          row.cat_uitklappen            !== 0,
    catTrxUitgeklapt:       row.cat_trx_uitgeklapt        !== 0,
    vasteLastenOverzichtMaanden: row.vaste_lasten_overzicht_maanden ?? 4,
    vasteLastenAfwijkingProcent: row.vaste_lasten_afwijking_procent ?? 5,
  };
}

export function updateInstellingen(data: Partial<Instellingen>): void {
  const sets: string[]  = [];
  const values: unknown[] = [];

  if (data.maandStartDag !== undefined) {
    if (!Number.isInteger(data.maandStartDag) || data.maandStartDag < 1 || data.maandStartDag > 28) {
      throw new Error('maandStartDag moet een geheel getal zijn tussen 1 en 28.');
    }
    sets.push('maand_start_dag = ?');
    values.push(data.maandStartDag);
  }
  if (data.dashboardBlsTonen      !== undefined) { sets.push('dashboard_bls_tonen = ?');      values.push(data.dashboardBlsTonen      ? 1 : 0); }
  if (data.dashboardCatTonen      !== undefined) { sets.push('dashboard_cat_tonen = ?');      values.push(data.dashboardCatTonen      ? 1 : 0); }
  if (data.dashboardBlsUitgeklapt !== undefined) { sets.push('dashboard_bls_uitgeklapt = ?'); values.push(data.dashboardBlsUitgeklapt ? 1 : 0); }
  if (data.dashboardCatUitgeklapt !== undefined) { sets.push('dashboard_cat_uitgeklapt = ?'); values.push(data.dashboardCatUitgeklapt ? 1 : 0); }
  if (data.catUitklappen          !== undefined) { sets.push('cat_uitklappen = ?');           values.push(data.catUitklappen          ? 1 : 0); }
  if (data.catTrxUitgeklapt       !== undefined) { sets.push('cat_trx_uitgeklapt = ?');      values.push(data.catTrxUitgeklapt       ? 1 : 0); }
  if (data.vasteLastenOverzichtMaanden !== undefined) {
    if (!Number.isInteger(data.vasteLastenOverzichtMaanden) || data.vasteLastenOverzichtMaanden < 1 || data.vasteLastenOverzichtMaanden > 12) {
      throw new Error('vasteLastenOverzichtMaanden moet een geheel getal zijn tussen 1 en 12.');
    }
    sets.push('vaste_lasten_overzicht_maanden = ?'); values.push(data.vasteLastenOverzichtMaanden);
  }
  if (data.vasteLastenAfwijkingProcent !== undefined) {
    if (!Number.isInteger(data.vasteLastenAfwijkingProcent) || data.vasteLastenAfwijkingProcent < 1 || data.vasteLastenAfwijkingProcent > 100) {
      throw new Error('vasteLastenAfwijkingProcent moet een geheel getal zijn tussen 1 en 100.');
    }
    sets.push('vaste_lasten_afwijking_procent = ?'); values.push(data.vasteLastenAfwijkingProcent);
  }

  if (sets.length === 0) throw new Error('Geen velden om bij te werken.');
  getDb().prepare(`UPDATE instellingen SET ${sets.join(', ')} WHERE id = 1`).run(...values);
}
