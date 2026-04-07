// FILE: route.ts (api/genegeerde-rekeningen/[id])
// AANGEMAAKT: 30-03-2026
// VERSIE: 1
// GEWIJZIGD: 30-03-2026
//
// WIJZIGINGEN (30-03-2026):
// - Initiële aanmaak: DELETE /api/genegeerde-rekeningen/[id]

import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { triggerBackup } from '@/lib/backup';

export function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return params.then(({ id }) => {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return NextResponse.json({ error: 'Ongeldig id.' }, { status: 400 });
    try {
      getDb().prepare('DELETE FROM genegeerde_rekeningen WHERE id = ?').run(numId);
      triggerBackup();
      return NextResponse.json({ ok: true });
    } catch (err) {
      const bericht = err instanceof Error ? err.message : 'Databasefout.';
      return NextResponse.json({ error: bericht }, { status: 500 });
    }
  });
}
