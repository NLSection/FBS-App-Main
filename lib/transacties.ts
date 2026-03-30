// FILE: transacties.ts
// AANGEMAAKT: 25-03-2026 12:00
// VERSIE: 1
// GEWIJZIGD: 31-03-2026 02:00
//
// WIJZIGINGEN (25-03-2026 18:30):
// - Initiële aanmaak: getTransacties, getTransactie, updateTransactieTypeByIban
// - updateTransactieTypeByIban verwijderd (markeer-vast concept vervallen)
// WIJZIGINGEN (25-03-2026 21:00):
// - TransactieMetCategorie interface toegevoegd met categorie + subcategorie
// - getTransacties gebruikt LEFT JOIN op categorieen tabel
// - TransactieFilters uitgebreid met datum_van en datum_tot
// WIJZIGINGEN (26-03-2026 17:00):
// - TransactieMetCategorie uitgebreid met originele_datum en handmatig_gecategoriseerd
// WIJZIGINGEN (26-03-2026 19:00):
// - TransactieMetCategorie uitgebreid met fout_geboekt
// WIJZIGINGEN (26-03-2026 22:00):
// - TransactieMetCategorie uitgebreid met rekening_naam en tegenrekening_naam
// - getTransacties: twee LEFT JOINs op rekeningen (r1 = eigen, r2 = tegenrekening)
// WIJZIGINGEN (31-03-2026 02:00):
// - TransactieFilters: naam_tegenpartij filter toegevoegd
// WIJZIGINGEN (30-03-2026 19:00):
// - TransactieMetCategorie uitgebreid met toelichting
// WIJZIGINGEN (28-03-2026 18:00):
// - COALESCE(c.categorie, t.categorie) + COALESCE(c.subcategorie, t.subcategorie): tekstkolommen als fallback voor omboekingen

import getDb from '@/lib/db';
import type { Transactie, TransactieType, TransactieStatus } from '@/lib/schema';

export interface TransactieFilters {
  type?: TransactieType;
  import_id?: number;
  status?: TransactieStatus;
  datum_van?: string;
  datum_tot?: string;
  naam_tegenpartij?: string;
}

export interface TransactieMetCategorie extends Transactie {
  categorie: string | null;
  subcategorie: string | null;
  toelichting: string | null;
  originele_datum: string | null;
  handmatig_gecategoriseerd: number;
  fout_geboekt: number;
  rekening_naam: string | null;
  tegenrekening_naam: string | null;
}

export function getTransacties(filters?: TransactieFilters): TransactieMetCategorie[] {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters?.type) {
    conditions.push('t.type = ?');
    params.push(filters.type);
  }
  if (filters?.import_id !== undefined) {
    conditions.push('t.import_id = ?');
    params.push(filters.import_id);
  }
  if (filters?.status) {
    conditions.push('t.status = ?');
    params.push(filters.status);
  }
  if (filters?.datum_van) {
    conditions.push('t.datum >= ?');
    params.push(filters.datum_van);
  }
  if (filters?.datum_tot) {
    conditions.push('t.datum <= ?');
    params.push(filters.datum_tot);
  }
  if (filters?.naam_tegenpartij) {
    conditions.push('t.naam_tegenpartij = ?');
    params.push(filters.naam_tegenpartij);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT t.*,
           COALESCE(c.categorie, t.categorie) AS categorie,
           COALESCE(c.subcategorie, t.subcategorie) AS subcategorie,
           r1.naam AS rekening_naam,
           r2.naam AS tegenrekening_naam
    FROM transacties t
    LEFT JOIN categorieen c ON t.categorie_id = c.id
    LEFT JOIN rekeningen r1 ON t.iban_bban = r1.iban
    LEFT JOIN rekeningen r2 ON t.tegenrekening_iban_bban = r2.iban
    ${where}
    ORDER BY t.datum DESC, t.id DESC
  `;

  return getDb().prepare(sql).all(params) as TransactieMetCategorie[];
}

export function getTransactie(id: number): Transactie | undefined {
  return getDb()
    .prepare('SELECT * FROM transacties WHERE id = ?')
    .get(id) as Transactie | undefined;
}
