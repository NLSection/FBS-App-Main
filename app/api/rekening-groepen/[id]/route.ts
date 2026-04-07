import { NextRequest, NextResponse } from 'next/server';
import { updateRekeningGroep, deleteRekeningGroep } from '@/lib/rekeningGroepen';
import { triggerBackup } from '@/lib/backup';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: 'Ongeldig ID.' }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 });
  }

  try {
    updateRekeningGroep(
      id,
      body.naam as string | undefined,
      body.rekening_ids as number[] | undefined,
    );
    triggerBackup();
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: 'Ongeldig ID.' }, { status: 400 });

  try {
    deleteRekeningGroep(id);
    triggerBackup();
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 400 });
  }
}
