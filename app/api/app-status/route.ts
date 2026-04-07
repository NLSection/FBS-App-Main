import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export function GET() {
  try {
    const db = getDb();
    const heeftImports = (db.prepare('SELECT COUNT(*) AS n FROM imports').get() as { n: number }).n > 0;
    const heeftGecategoriseerd = heeftImports && (db.prepare('SELECT COUNT(*) AS n FROM transactie_aanpassingen WHERE categorie IS NOT NULL').get() as { n: number }).n > 0;
    return NextResponse.json({ heeftImports, heeftGecategoriseerd });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
