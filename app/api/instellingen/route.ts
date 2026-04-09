// FILE: route.ts
// AANGEMAAKT: 25-03-2026 21:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 22:00
//
// WIJZIGINGEN (03-04-2026 22:00):
// - catUitklappen toegevoegd aan PUT handler
// WIJZIGINGEN (25-03-2026 21:00):
// - Initiële aanmaak: GET en PUT /api/instellingen

import { NextRequest, NextResponse } from 'next/server';
import { getInstellingen, updateInstellingen } from '@/lib/instellingen';
import { triggerBackup } from '@/lib/backup';

export function GET() {
  try {
    return NextResponse.json(getInstellingen());
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 });
  }

  const update: Parameters<typeof updateInstellingen>[0] = {};
  if (body.maandStartDag          !== undefined) update.maandStartDag          = body.maandStartDag          as number;
  if (body.dashboardBlsTonen      !== undefined) update.dashboardBlsTonen      = Boolean(body.dashboardBlsTonen);
  if (body.dashboardCatTonen      !== undefined) update.dashboardCatTonen      = Boolean(body.dashboardCatTonen);
  if (body.catUitklappen          !== undefined) update.catUitklappen          = Boolean(body.catUitklappen);
  if (body.blsTrxUitgeklapt       !== undefined) update.blsTrxUitgeklapt       = Boolean(body.blsTrxUitgeklapt);
  if (body.catTrxUitgeklapt       !== undefined) update.catTrxUitgeklapt       = Boolean(body.catTrxUitgeklapt);
  if (body.vastePostenOverzichtMaanden !== undefined) update.vastePostenOverzichtMaanden = Number(body.vastePostenOverzichtMaanden);
  if (body.vastePostenAfwijkingProcent !== undefined) update.vastePostenAfwijkingProcent = Number(body.vastePostenAfwijkingProcent);
  if (body.vastePostenVergelijkMaanden !== undefined) update.vastePostenVergelijkMaanden = Number(body.vastePostenVergelijkMaanden);
  if (body.vastePostenBuffer          !== undefined) update.vastePostenBuffer          = Number(body.vastePostenBuffer);
  if (body.backupBewaarDagen    !== undefined) update.backupBewaarDagen    = Number(body.backupBewaarDagen);
  if (body.backupMinBewaard     !== undefined) update.backupMinBewaard     = Number(body.backupMinBewaard);
  if (body.backupExternPad      !== undefined) update.backupExternPad      = body.backupExternPad as string | null;

  try {
    updateInstellingen(update);
    triggerBackup();
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 400 });
  }
}
