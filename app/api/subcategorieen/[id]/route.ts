import { NextRequest, NextResponse } from 'next/server';
import { updateSubcategorie, deleteSubcategorie } from '@/lib/subcategorieen';
import { triggerBackup } from '@/lib/backup';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: 'Ongeldig ID.' }, { status: 400 });

  let body: { naam?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 });
  }
  if (!body.naam?.trim()) return NextResponse.json({ error: 'Naam is verplicht.' }, { status: 400 });

  try {
    updateSubcategorie(id, body.naam);
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
    deleteSubcategorie(id);
    triggerBackup();
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 400 });
  }
}
