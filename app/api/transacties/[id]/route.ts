// FILE: route.ts (api/transacties/[id])
// AANGEMAAKT: 25-03-2026 17:30
// VERSIE: 1
// GEWIJZIGD: 31-03-2026 14:30
//
// WIJZIGINGEN (31-03-2026 14:30):
// - PATCH: datum en originele_datum velden toegevoegd
// WIJZIGINGEN (29-03-2026 05:30):
// - PATCH: categorie (string) → altijd categorie+subcategorie tekstvelden opslaan + categorie_id lookup
// WIJZIGINGEN (26-03-2026 19:00):
// - PATCH uitgebreid met fout_geboekt
// WIJZIGINGEN (26-03-2026 17:00):
// - PATCH dynamisch gemaakt: ondersteunt nu categorie_id, status én handmatig_gecategoriseerd

import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

type Params = Promise<{ id: string }>;

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: 'Ongeldig id.' }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ongeldig JSON.' }, { status: 400 });
  }

  const setClauses: string[] = [];
  const vals: unknown[] = [];

  if (body.categorie_id !== undefined) {
    setClauses.push('categorie_id = ?');
    vals.push(body.categorie_id !== null ? Number(body.categorie_id) : null);
  } else if (typeof body.categorie === 'string') {
    const subcat = typeof body.subcategorie === 'string' ? body.subcategorie : null;
    setClauses.push('categorie = ?');
    vals.push(body.categorie || null);
    setClauses.push('subcategorie = ?');
    vals.push(subcat || null);
    const row = getDb()
      .prepare('SELECT id FROM categorieen WHERE categorie = ? AND subcategorie IS ? LIMIT 1')
      .get(body.categorie, subcat) as { id: number } | undefined;
    if (row) {
      setClauses.push('categorie_id = ?');
      vals.push(row.id);
    }
  }
  if (body.status !== undefined) {
    setClauses.push('status = ?');
    vals.push(String(body.status));
  }
  if (body.handmatig_gecategoriseerd !== undefined) {
    setClauses.push('handmatig_gecategoriseerd = ?');
    vals.push(Number(body.handmatig_gecategoriseerd));
  }
  if (body.fout_geboekt !== undefined) {
    setClauses.push('fout_geboekt = ?');
    vals.push(Number(body.fout_geboekt));
  }
  if (body.toelichting !== undefined) {
    setClauses.push('toelichting = ?');
    vals.push(body.toelichting !== null && body.toelichting !== '' ? String(body.toelichting) : null);
  }
  if (body.datum !== undefined) {
    setClauses.push('datum = ?');
    vals.push(String(body.datum));
  }
  if (body.originele_datum !== undefined) {
    setClauses.push('originele_datum = ?');
    vals.push(body.originele_datum !== null ? String(body.originele_datum) : null);
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ error: 'Geen velden opgegeven.' }, { status: 400 });
  }

  vals.push(numId);

  try {
    getDb()
      .prepare(`UPDATE transacties SET ${setClauses.join(', ')} WHERE id = ?`)
      .run(...vals);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
