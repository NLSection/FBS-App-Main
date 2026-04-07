import { NextRequest, NextResponse } from 'next/server';
import { updateRekeningGroepenVolgorde } from '@/lib/rekeningGroepen';
import { triggerBackup } from '@/lib/backup';

export async function PUT(request: NextRequest) {
  let body: { id: number; volgorde: number }[];
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 });
  }

  if (!Array.isArray(body) || body.some(item => typeof item.id !== 'number' || typeof item.volgorde !== 'number')) {
    return NextResponse.json({ error: 'Verwacht array van {id, volgorde} objecten.' }, { status: 400 });
  }

  try {
    updateRekeningGroepenVolgorde(body);
    triggerBackup();
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 400 });
  }
}
