// FILE: vasteLastenConfig.ts
// AANGEMAAKT: 25-03-2026 11:30
// VERSIE: 1
// GEWIJZIGD: 25-03-2026 20:00
//
// WIJZIGINGEN (25-03-2026 14:00):
// - Initiële aanmaak: CRUD-queries voor vaste_lasten_config tabel
// - verwachte_dag en verwacht_bedrag toegevoegd aan interface en queries
// WIJZIGINGEN (25-03-2026 20:00):
// - updateVasteLastDefinitie toegevoegd

import getDb from '@/lib/db';

export interface VasteLastDefinitie {
  id: number;
  iban: string;
  naam: string;
  omschrijving: string | null;
  label: string;
  verwachte_dag: number | null;
  verwacht_bedrag: number | null;
}

export function getVasteLastenConfig(): VasteLastDefinitie[] {
  return getDb()
    .prepare('SELECT id, iban, naam, omschrijving, label, verwachte_dag, verwacht_bedrag FROM vaste_lasten_config ORDER BY label')
    .all() as VasteLastDefinitie[];
}

export function insertVasteLastDefinitie(
  iban: string,
  naam: string,
  omschrijving: string | null,
  label: string
): void {
  getDb()
    .prepare(
      'INSERT INTO vaste_lasten_config (iban, naam, omschrijving, label) VALUES (?, ?, ?, ?)'
    )
    .run(iban.trim().toUpperCase(), naam.trim(), omschrijving?.trim() || null, label.trim());
}

export function updateVasteLastDefinitie(
  id: number,
  iban: string,
  naam: string,
  omschrijving: string | null,
  label: string,
  verwachte_dag: number | null,
  verwacht_bedrag: number | null
): void {
  if (!iban.trim()) throw new Error('IBAN mag niet leeg zijn.');
  if (!naam.trim()) throw new Error('Naam mag niet leeg zijn.');
  if (!label.trim()) throw new Error('Label mag niet leeg zijn.');
  getDb()
    .prepare(`UPDATE vaste_lasten_config
              SET iban = ?, naam = ?, omschrijving = ?, label = ?,
                  verwachte_dag = ?, verwacht_bedrag = ?
              WHERE id = ?`)
    .run(iban.trim().toUpperCase(), naam.trim(), omschrijving?.trim() || null,
         label.trim(), verwachte_dag, verwacht_bedrag, id);
}

export function deleteVasteLastDefinitie(id: number): void {
  getDb()
    .prepare('DELETE FROM vaste_lasten_config WHERE id = ?')
    .run(id);
}
