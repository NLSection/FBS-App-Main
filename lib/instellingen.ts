// FILE: instellingen.ts
// AANGEMAAKT: 25-03-2026 21:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 10:00
//
// WIJZIGINGEN (03-04-2026 10:00):
// - Dashboard weergave-instellingen toegevoegd (blsTonen, catTonen, blsUitgeklapt, catUitgeklapt)
// - updateInstellingen accepteert nu partiële updates
// WIJZIGINGEN (25-03-2026 21:00):
// - Initiële aanmaak: getInstellingen en updateInstellingen

import getDb from '@/lib/db';

export interface Instellingen {
  maandStartDag:          number;
  dashboardBlsTonen:      boolean;
  dashboardCatTonen:      boolean;
  dashboardBlsUitgeklapt: boolean;
  dashboardCatUitgeklapt: boolean;
}

type Row = {
  maand_start_dag:           number;
  dashboard_bls_tonen:       number;
  dashboard_cat_tonen:       number;
  dashboard_bls_uitgeklapt:  number;
  dashboard_cat_uitgeklapt:  number;
};

export function getInstellingen(): Instellingen {
  const row = getDb()
    .prepare('SELECT maand_start_dag, dashboard_bls_tonen, dashboard_cat_tonen, dashboard_bls_uitgeklapt, dashboard_cat_uitgeklapt FROM instellingen WHERE id = 1')
    .get() as Row | undefined;
  if (!row) throw new Error('Instellingen niet gevonden in database.');
  return {
    maandStartDag:          row.maand_start_dag,
    dashboardBlsTonen:      row.dashboard_bls_tonen      !== 0,
    dashboardCatTonen:      row.dashboard_cat_tonen      !== 0,
    dashboardBlsUitgeklapt: row.dashboard_bls_uitgeklapt !== 0,
    dashboardCatUitgeklapt: row.dashboard_cat_uitgeklapt !== 0,
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

  if (sets.length === 0) throw new Error('Geen velden om bij te werken.');
  getDb().prepare(`UPDATE instellingen SET ${sets.join(', ')} WHERE id = 1`).run(...values);
}
