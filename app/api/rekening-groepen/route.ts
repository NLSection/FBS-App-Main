import { NextRequest, NextResponse } from 'next/server';
import { getRekeningGroepen, insertRekeningGroep } from '@/lib/rekeningGroepen';
import { triggerBackup } from '@/lib/backup';

export function GET() {
  try {
    return NextResponse.json(getRekeningGroepen());
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 });
  }

  const naam = body.naam as string | undefined;
  const rekening_ids = (body.rekening_ids ?? []) as number[];

  if (!naam?.trim()) {
    return NextResponse.json({ error: 'Naam is verplicht.' }, { status: 400 });
  }

  try {
    const id = insertRekeningGroep(naam, rekening_ids);
    triggerBackup();
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 400 });
  }
}
