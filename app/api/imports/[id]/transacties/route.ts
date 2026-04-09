import { NextRequest, NextResponse } from 'next/server';
import { getTransacties } from '@/lib/transacties';

type Params = Promise<{ id: string }>;

export function GET(_request: NextRequest, { params }: { params: Params }) {
  return params.then(({ id }) => {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return NextResponse.json({ error: 'Ongeldig id.' }, { status: 400 });
    try {
      const trx = getTransacties({ import_id: numId }).map(t => ({
        id: t.id,
        datum: t.datum,
        naam_tegenpartij: t.naam_tegenpartij,
        bedrag: t.bedrag,
        categorie: t.categorie,
        subcategorie: t.subcategorie,
        status: t.status,
      }));
      return NextResponse.json(trx);
    } catch (err) {
      const bericht = err instanceof Error ? err.message : 'Databasefout.';
      return NextResponse.json({ error: bericht }, { status: 500 });
    }
  });
}
