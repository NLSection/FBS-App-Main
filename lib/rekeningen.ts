// FILE: rekeningen.ts
// AANGEMAAKT: 25-03-2026 11:30
// VERSIE: 1
// GEWIJZIGD: 30-03-2026
//
// WIJZIGINGEN (25-03-2026 11:30):
// - Initiële aanmaak: CRUD-queries voor rekeningen tabel
// WIJZIGINGEN (25-03-2026 20:00):
// - updateRekening toegevoegd
// WIJZIGINGEN (30-03-2026):
// - beheerd veld toegevoegd aan interface, SELECT en updateBeheerd

import getDb from '@/lib/db';

export interface Rekening {
  id: number;
  iban: string;
  naam: string;
  type: 'betaal' | 'spaar';
  beheerd: number;
}

export function getRekeningen(): Rekening[] {
  return getDb()
    .prepare('SELECT id, iban, naam, type, beheerd FROM rekeningen ORDER BY type, naam')
    .all() as Rekening[];
}

export function insertRekening(iban: string, naam: string, type: 'betaal' | 'spaar'): void {
  getDb()
    .prepare('INSERT INTO rekeningen (iban, naam, type) VALUES (?, ?, ?)')
    .run(iban.trim().toUpperCase(), naam.trim(), type);
}

export function updateRekening(id: number, iban: string, naam: string, type: 'betaal' | 'spaar'): void {
  if (!iban.trim()) throw new Error('IBAN mag niet leeg zijn.');
  if (!naam.trim()) throw new Error('Naam mag niet leeg zijn.');
  getDb()
    .prepare('UPDATE rekeningen SET iban = ?, naam = ?, type = ? WHERE id = ?')
    .run(iban.trim().toUpperCase(), naam.trim(), type, id);
}

export function updateBeheerd(id: number, beheerd: number): void {
  getDb()
    .prepare('UPDATE rekeningen SET beheerd = ? WHERE id = ?')
    .run(beheerd ? 1 : 0, id);
}

export function deleteRekening(id: number): void {
  getDb()
    .prepare('DELETE FROM rekeningen WHERE id = ?')
    .run(id);
}
