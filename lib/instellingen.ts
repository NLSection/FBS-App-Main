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
  catUitklappen:          boolean;
  catTrxUitgeklapt:       boolean;
  blsTrxUitgeklapt:       boolean;
  vastePostenOverzichtMaanden: number;
  vastePostenAfwijkingProcent: number;
  backupBewaarDagen:     number;
  backupMinBewaard:      number;
  apparaatId:            string | null;
  backupExternPad:       string | null;
  backupVersie:          number;
  backupEncryptieHash:   string | null;
  backupEncryptieHint:   string | null;
  backupEncryptieSalt:   string | null;
  vastePostenBuffer:     number;
}

type Row = {
  maand_start_dag:           number;
  dashboard_bls_tonen:       number;
  dashboard_cat_tonen:       number;
  cat_uitklappen:            number;
  bls_trx_uitgeklapt:        number;
  cat_trx_uitgeklapt:        number;
  vaste_posten_overzicht_maanden: number;
  vaste_posten_afwijking_procent: number;
  backup_bewaar_dagen:     number;
  backup_min_bewaard:      number;
  apparaat_id:             string | null;
  backup_extern_pad:       string | null;
  backup_versie:           number;
  backup_encryptie_hash:   string | null;
  backup_encryptie_hint:   string | null;
  backup_encryptie_salt:   string | null;
  vaste_posten_buffer:     number;
};

export function getInstellingen(): Instellingen {
  const row = getDb()
    .prepare('SELECT maand_start_dag, dashboard_bls_tonen, dashboard_cat_tonen, cat_uitklappen, cat_trx_uitgeklapt, bls_trx_uitgeklapt, vaste_posten_overzicht_maanden, vaste_posten_afwijking_procent, vaste_posten_buffer, backup_bewaar_dagen, backup_min_bewaard, apparaat_id, backup_extern_pad, backup_versie, backup_encryptie_hash, backup_encryptie_hint, backup_encryptie_salt FROM instellingen WHERE id = 1')
    .get() as Row | undefined;
  if (!row) throw new Error('Instellingen niet gevonden in database.');
  return {
    maandStartDag:          row.maand_start_dag,
    dashboardBlsTonen:      row.dashboard_bls_tonen      !== 0,
    dashboardCatTonen:      row.dashboard_cat_tonen      !== 0,
    catUitklappen:          row.cat_uitklappen            !== 0,
    blsTrxUitgeklapt:       (row.bls_trx_uitgeklapt ?? 0) !== 0,
    catTrxUitgeklapt:       row.cat_trx_uitgeklapt        !== 0,
    vastePostenOverzichtMaanden: row.vaste_posten_overzicht_maanden ?? 4,
    vastePostenAfwijkingProcent: row.vaste_posten_afwijking_procent ?? 5,
    backupBewaarDagen:     row.backup_bewaar_dagen     ?? 7,
    backupMinBewaard:      row.backup_min_bewaard      ?? 3,
    apparaatId:            row.apparaat_id             ?? null,
    backupExternPad:       row.backup_extern_pad       ?? null,
    backupVersie:          row.backup_versie           ?? 0,
    backupEncryptieHash:   row.backup_encryptie_hash   ?? null,
    backupEncryptieHint:   row.backup_encryptie_hint   ?? null,
    backupEncryptieSalt:   row.backup_encryptie_salt   ?? null,
    vastePostenBuffer:     row.vaste_posten_buffer      ?? 0,
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
  if (data.catUitklappen          !== undefined) { sets.push('cat_uitklappen = ?');           values.push(data.catUitklappen          ? 1 : 0); }
  if (data.blsTrxUitgeklapt       !== undefined) { sets.push('bls_trx_uitgeklapt = ?');      values.push(data.blsTrxUitgeklapt       ? 1 : 0); }
  if (data.catTrxUitgeklapt       !== undefined) { sets.push('cat_trx_uitgeklapt = ?');      values.push(data.catTrxUitgeklapt       ? 1 : 0); }
  if (data.vastePostenOverzichtMaanden !== undefined) {
    if (!Number.isInteger(data.vastePostenOverzichtMaanden) || data.vastePostenOverzichtMaanden < 1 || data.vastePostenOverzichtMaanden > 12) {
      throw new Error('vastePostenOverzichtMaanden moet een geheel getal zijn tussen 1 en 12.');
    }
    sets.push('vaste_posten_overzicht_maanden = ?'); values.push(data.vastePostenOverzichtMaanden);
  }
  if (data.vastePostenAfwijkingProcent !== undefined) {
    if (!Number.isInteger(data.vastePostenAfwijkingProcent) || data.vastePostenAfwijkingProcent < 1 || data.vastePostenAfwijkingProcent > 100) {
      throw new Error('vastePostenAfwijkingProcent moet een geheel getal zijn tussen 1 en 100.');
    }
    sets.push('vaste_posten_afwijking_procent = ?'); values.push(data.vastePostenAfwijkingProcent);
  }
  if (data.vastePostenBuffer !== undefined) {
    if (typeof data.vastePostenBuffer !== 'number' || data.vastePostenBuffer < 0) {
      throw new Error('vastePostenBuffer moet een positief getal zijn.');
    }
    sets.push('vaste_posten_buffer = ?'); values.push(data.vastePostenBuffer);
  }

  if (data.backupBewaarDagen !== undefined) {
    if (!Number.isInteger(data.backupBewaarDagen) || data.backupBewaarDagen < 1 || data.backupBewaarDagen > 365) {
      throw new Error('backupBewaarDagen moet een geheel getal zijn tussen 1 en 365.');
    }
    sets.push('backup_bewaar_dagen = ?'); values.push(data.backupBewaarDagen);
  }
  if (data.backupMinBewaard !== undefined) {
    if (!Number.isInteger(data.backupMinBewaard) || data.backupMinBewaard < 1 || data.backupMinBewaard > 100) {
      throw new Error('backupMinBewaard moet een geheel getal zijn tussen 1 en 100.');
    }
    sets.push('backup_min_bewaard = ?'); values.push(data.backupMinBewaard);
  }

  if (data.backupExternPad !== undefined) {
    sets.push('backup_extern_pad = ?');
    values.push(data.backupExternPad || null);
  }

  if (sets.length === 0) throw new Error('Geen velden om bij te werken.');
  getDb().prepare(`UPDATE instellingen SET ${sets.join(', ')} WHERE id = 1`).run(...values);
}
