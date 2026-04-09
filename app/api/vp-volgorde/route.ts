import { NextRequest, NextResponse } from 'next/server';
import { saveVpVolgorde } from '@/lib/vpVolgorde';
import { triggerBackup } from '@/lib/backup';

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 }); }
  if (typeof body !== 'object' || body === null || !Array.isArray((body as Record<string, unknown>).items) || typeof (body as Record<string, unknown>).periode !== 'string') {
    return NextResponse.json({ error: '{ items: [...], periode: string } verwacht.' }, { status: 400 });
  }
  const { items, periode } = body as { items: { sleutel: string; volgorde: number }[]; periode: string };
  try {
    saveVpVolgorde(items, periode);
    triggerBackup();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Databasefout.' }, { status: 500 });
  }
}
