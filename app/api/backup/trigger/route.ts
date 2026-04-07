import { NextResponse } from 'next/server';
import { triggerBackup } from '@/lib/backup';

export function POST() {
  try {
    triggerBackup();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Backup mislukt.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
