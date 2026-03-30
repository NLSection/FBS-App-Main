// FILE: instellingen.ts
// AANGEMAAKT: 25-03-2026 21:00
// VERSIE: 1
// GEWIJZIGD: 25-03-2026 21:00
//
// WIJZIGINGEN (25-03-2026 21:00):
// - Initiële aanmaak: getInstellingen en updateInstellingen

import getDb from '@/lib/db';

export interface Instellingen {
  maandStartDag: number;
}

export function getInstellingen(): Instellingen {
  const row = getDb()
    .prepare('SELECT maand_start_dag FROM instellingen WHERE id = 1')
    .get() as { maand_start_dag: number } | undefined;
  if (!row) throw new Error('Instellingen niet gevonden in database.');
  return { maandStartDag: row.maand_start_dag };
}

export function updateInstellingen(data: Instellingen): void {
  const { maandStartDag } = data;
  if (!Number.isInteger(maandStartDag) || maandStartDag < 1 || maandStartDag > 28) {
    throw new Error('maandStartDag moet een geheel getal zijn tussen 1 en 28.');
  }
  getDb()
    .prepare('UPDATE instellingen SET maand_start_dag = ? WHERE id = 1')
    .run(maandStartDag);
}
