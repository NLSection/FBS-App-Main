import { NextRequest, NextResponse } from 'next/server';
import { getVpGroepen, createVpGroep } from '@/lib/vpGroepen';
import { triggerBackup } from '@/lib/backup';

export function GET() {
  return NextResponse.json(getVpGroepen());
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 }); }
  if (typeof body.naam !== 'string' || !body.naam.trim()) return NextResponse.json({ error: 'naam is verplicht.' }, { status: 400 });
  try {
    const id = createVpGroep(body.naam as string);
    triggerBackup();
    return NextResponse.json({ id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Databasefout.' }, { status: 500 });
  }
}
