// FILE: categorisatie.ts
// AANGEMAAKT: 25-03-2026 17:30
// VERSIE: 1
// GEWIJZIGD: 30-03-2026 21:00
//
// WIJZIGINGEN (30-03-2026 21:00):
// - CategorieRegel: toelichting veld toegevoegd
// - categoriseerTransacties: toelichting van matchende regel overnemen naar transactie
// - insertCategorieRegel: toelichting opslaan; bij duplicaat alsnog toelichting updaten
// - updateCategorieRegel: toelichting opslaan
// WIJZIGINGEN (29-03-2026 06:00):
// - insertCategorieRegel: duplicaatcheck uitgebreid met omschrijving_zoekwoord
// WIJZIGINGEN (28-03-2026 23:15):
// - schoonMaken: koppelteken (-) toegevoegd aan toegestane tekens
// - categoriseerTransacties: omboekingen proberen eerst matchCategorie; fallback naar categoriseerOmboeking
// - insertCategorieRegel: validatie verwijderd die omboekingen blokkeerde
// - insertCategorieRegel: duplicaatcheck op iban + naam_zoekwoord + type; bestaande id teruggeven

import getDb from '@/lib/db';
import type { Transactie } from '@/lib/schema';

export type CategorieType =
  | 'normaal-af'
  | 'normaal-bij'
  | 'omboeking-af'
  | 'omboeking-bij'
  | 'alle';

export interface CategorieRegel {
  id: number;
  iban: string | null;
  naam_zoekwoord: string | null;
  naam_origineel: string | null;
  omschrijving_zoekwoord: string | null;
  categorie: string;
  subcategorie: string | null;
  toelichting: string | null;
  type: CategorieType;
  laatste_gebruik: string | null;
}

// ── Hulpfuncties ─────────────────────────────────────────────────────────────

function schoonMaken(s: string | null | undefined): string {
  if (!s) return '';
  return s.toLowerCase().replace(/[^a-z0-9&-]/g, '');
}

function typeMatch(t: Transactie, regelType: CategorieType): boolean {
  if (regelType === 'alle') return true;
  return t.type === regelType;
}

// ── Matchlogica ───────────────────────────────────────────────────────────────

export function matchCategorie(
  t: Transactie,
  regels: CategorieRegel[]
): CategorieRegel | null {
  const tegenIban   = t.tegenrekening_iban_bban?.trim() ?? null;
  const naamSchoon  = schoonMaken(t.naam_tegenpartij);
  const omschrRaw   = [t.omschrijving_1, t.omschrijving_2, t.omschrijving_3]
    .filter(Boolean).join(' ');
  const omschrSchoon = schoonMaken(omschrRaw);

  const van = regels.filter(r => typeMatch(t, r.type));

  // Prioriteit 1: IBAN + omschrijving_zoekwoord
  const p1 = van.filter(r =>
    r.iban && r.omschrijving_zoekwoord &&
    r.iban === tegenIban &&
    omschrSchoon.includes(r.omschrijving_zoekwoord)
  );
  if (p1.length > 0) {
    return p1.sort((a, b) =>
      (b.omschrijving_zoekwoord?.length ?? 0) - (a.omschrijving_zoekwoord?.length ?? 0)
    )[0];
  }

  // Prioriteit 2: IBAN alleen (geen omschrijving_zoekwoord in de regel)
  const p2 = van.filter(r =>
    r.iban && !r.omschrijving_zoekwoord && r.iban === tegenIban
  );
  if (p2.length > 0) return p2[0];

  // Prioriteit 3: naam_zoekwoord substring (geen iban in de regel) — langste match wint
  const p3 = van.filter(r =>
    r.naam_zoekwoord && !r.iban &&
    naamSchoon.includes(r.naam_zoekwoord)
  );
  if (p3.length > 0) {
    return p3.sort((a, b) =>
      (b.naam_zoekwoord?.length ?? 0) - (a.naam_zoekwoord?.length ?? 0)
    )[0];
  }

  return null;
}

// ── Omboeking-categorisatie ───────────────────────────────────────────────────

export function categoriseerOmboeking(
  t: Transactie,
  budgettenPotjes: { naam: string }[]
): { categorie: string; subcategorie: string } {
  const omschr = [t.omschrijving_1, t.omschrijving_2, t.omschrijving_3]
    .filter(Boolean).join(' ').toLowerCase();

  const gevonden = budgettenPotjes.find(bp =>
    omschr.includes(bp.naam.toLowerCase())
  );

  return {
    categorie:    'Omboekingen',
    subcategorie: gevonden ? gevonden.naam : 'Overige Uitgaven',
  };
}

// ── Batch-categorisatie ───────────────────────────────────────────────────────

export function categoriseerTransacties(
  importId?: number
): { gecategoriseerd: number; ongecategoriseerd: number } {
  const db = getDb();
  const regels          = db.prepare('SELECT * FROM categorieen').all() as CategorieRegel[];
  const budgettenPotjes = db.prepare('SELECT naam FROM budgetten_potjes').all() as { naam: string }[];
  const transacties     = importId !== undefined
    ? db.prepare('SELECT * FROM transacties WHERE import_id = ? AND (handmatig_gecategoriseerd IS NULL OR handmatig_gecategoriseerd = 0)').all(importId) as Transactie[]
    : db.prepare('SELECT * FROM transacties WHERE handmatig_gecategoriseerd IS NULL OR handmatig_gecategoriseerd = 0').all() as Transactie[];

  const updTransactie = db.prepare(
    'UPDATE transacties SET categorie_id = ?, status = ?, toelichting = ? WHERE id = ?'
  );
  const updOmboeking = db.prepare(
    'UPDATE transacties SET categorie_id = NULL, categorie = ?, subcategorie = ?, status = ? WHERE id = ?'
  );
  const updLaatsteGebruik = db.prepare(
    "UPDATE categorieen SET laatste_gebruik = date('now') WHERE id = ?"
  );

  let gecategoriseerd = 0;
  let ongecategoriseerd = 0;

  db.transaction(() => {
    for (const t of transacties) {
      if (t.type === 'omboeking-af' || t.type === 'omboeking-bij') {
        const match = matchCategorie(t, regels);
        if (match) {
          updTransactie.run(match.id, 'verwerkt', match.toelichting ?? null, t.id);
          updLaatsteGebruik.run(match.id);
        } else {
          const { categorie, subcategorie } = categoriseerOmboeking(t, budgettenPotjes);
          updOmboeking.run(categorie, subcategorie, 'verwerkt', t.id);
        }
        gecategoriseerd++;
      } else {
        const match = matchCategorie(t, regels);
        if (match) {
          updTransactie.run(match.id, 'verwerkt', match.toelichting ?? null, t.id);
          updLaatsteGebruik.run(match.id);
          gecategoriseerd++;
        } else {
          updTransactie.run(null, 'nieuw', null, t.id);
          ongecategoriseerd++;
        }
      }
    }
  })();

  return { gecategoriseerd, ongecategoriseerd };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function getCategorieRegels(): CategorieRegel[] {
  return getDb()
    .prepare('SELECT * FROM categorieen ORDER BY categorie, subcategorie, id')
    .all() as CategorieRegel[];
}

export function insertCategorieRegel(data: {
  iban?: string | null;
  naam_origineel?: string | null;
  naam_zoekwoord_raw?: string | null;
  omschrijving_raw?: string | null;
  categorie: string;
  subcategorie?: string | null;
  toelichting?: string | null;
  type?: CategorieType;
}): number {
  const naam_zoekwoord         = data.naam_zoekwoord_raw !== undefined
    ? (schoonMaken(data.naam_zoekwoord_raw) || null)
    : (schoonMaken(data.naam_origineel) || null);
  const omschrijving_zoekwoord = schoonMaken(data.omschrijving_raw) || null;

  const db = getDb();
  const type = data.type ?? 'alle';

  const bestaand = db
    .prepare('SELECT id FROM categorieen WHERE iban IS ? AND naam_zoekwoord IS ? AND omschrijving_zoekwoord IS ? AND type = ? LIMIT 1')
    .get(data.iban ?? null, naam_zoekwoord, omschrijving_zoekwoord, type) as { id: number } | undefined;
  if (bestaand) {
    if (data.toelichting !== undefined) {
      db.prepare('UPDATE categorieen SET toelichting = ? WHERE id = ?').run(data.toelichting ?? null, bestaand.id);
    }
    return bestaand.id;
  }

  const result = db
    .prepare(`
      INSERT INTO categorieen
        (iban, naam_zoekwoord, naam_origineel, omschrijving_zoekwoord,
         categorie, subcategorie, toelichting, type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      data.iban ?? null,
      naam_zoekwoord,
      data.naam_origineel ?? null,
      omschrijving_zoekwoord,
      data.categorie,
      data.subcategorie ?? null,
      data.toelichting ?? null,
      type
    );

  return result.lastInsertRowid as number;
}

export function updateCategorieRegel(
  id: number,
  data: {
    iban?: string | null;
    naam_origineel?: string | null;
    naam_zoekwoord_raw?: string | null;
    omschrijving_raw?: string | null;
    categorie?: string;
    subcategorie?: string | null;
    toelichting?: string | null;
    type?: CategorieType;
  }
): void {
  const naam_zoekwoord         = data.naam_zoekwoord_raw !== undefined
    ? (schoonMaken(data.naam_zoekwoord_raw) || null)
    : (schoonMaken(data.naam_origineel) || null);
  const omschrijving_zoekwoord = schoonMaken(data.omschrijving_raw) || null;

  getDb()
    .prepare(`
      UPDATE categorieen SET
        iban = ?, naam_zoekwoord = ?, naam_origineel = ?,
        omschrijving_zoekwoord = ?, categorie = ?, subcategorie = ?,
        toelichting = ?, type = ?
      WHERE id = ?
    `)
    .run(
      data.iban ?? null,
      naam_zoekwoord,
      data.naam_origineel ?? null,
      omschrijving_zoekwoord,
      data.categorie,
      data.subcategorie ?? null,
      data.toelichting !== undefined ? (data.toelichting ?? null) : null,
      data.type ?? 'alle',
      id
    );
}

export function deleteCategorieRegel(id: number): void {
  getDb().prepare('DELETE FROM categorieen WHERE id = ?').run(id);
}
