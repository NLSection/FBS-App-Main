import { NextRequest, NextResponse } from 'next/server';
import { addSubcategorieToGroep, removeSubcategorieFromGroep } from '@/lib/vpGroepen';
import { triggerBackup } from '@/lib/backup';

type Params = Promise<{ id: string }>;

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: 'Ongeldig id.' }, { status: 400 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 }); }
  if (typeof body.subcategorie !== 'string' || !body.subcategorie.trim()) return NextResponse.json({ error: 'subcategorie is verplicht.' }, { status: 400 });
  try {
    addSubcategorieToGroep(numId, body.subcategorie as string);
    triggerBackup();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Databasefout.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: 'Ongeldig id.' }, { status: 400 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 }); }
  if (typeof body.subcategorie !== 'string') return NextResponse.json({ error: 'subcategorie is verplicht.' }, { status: 400 });
  try {
    removeSubcategorieFromGroep(body.subcategorie as string);
    triggerBackup();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Databasefout.' }, { status: 500 });
  }
}
