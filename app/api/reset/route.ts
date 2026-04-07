// FILE: route.ts (api/reset)
// AANGEMAAKT: 30-03-2026 10:00
// VERSIE: 2
// GEWIJZIGD: 07-04-2026
//
// WIJZIGINGEN (07-04-2026):
// - Tabellen dynamisch ophalen uit sqlite_master (future-proof)
// - Foreign keys uitgeschakeld tijdens reset

import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { BACKUP_DIR } from '@/lib/backup';
import fs from 'fs';
import path from 'path';

export function POST() {
  try {
    const db = getDb();
    const tabellen = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    ).all() as { name: string }[];

    db.pragma('foreign_keys = OFF');
    db.transaction(() => {
      for (const { name } of tabellen) {
        db.prepare(`DELETE FROM "${name}"`).run();
      }
    })();
    db.pragma('foreign_keys = ON');
    db.prepare('INSERT INTO instellingen (id, maand_start_dag, backup_versie) VALUES (1, 27, 0)').run();

    // backup-meta.json verwijderen zodat het backup-systeem geen oude versie terugzet
    const metaPath = path.join(BACKUP_DIR, 'backup-meta.json');
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
