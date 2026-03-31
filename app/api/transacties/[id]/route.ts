// FILE: route.ts (api/transacties/[id])
// AANGEMAAKT: 25-03-2026 17:30
// VERSIE: 1
// GEWIJZIGD: 31-03-2026 20:00
//
// WIJZIGINGEN (31-03-2026 20:00):
// - PATCH schrijft naar transactie_aanpassingen (UPSERT) i.p.v. transacties
// - datum_aanpassing vervangt datum + originele_datum

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

  if (body.datum_aanpassing !== undefined) {
    setClauses.push('datum_aanpassing = ?');
    vals.push(body.datum_aanpassing !== null ? String(body.datum_aanpassing) : null);
  }
  if (body.categorie_id !== undefined) {
    setClauses.push('categorie_id = ?');
    vals.push(body.categorie_id !== null ? Number(body.categorie_id) : null);
    setClauses.push('categorie = NULL');
    setClauses.push('subcategorie = NULL');
  } else if (typeof body.categorie === 'string') {
    const subcat = typeof body.subcategorie === 'string' ? body.subcategorie : null;
    setClauses.push('categorie = ?');
    vals.push(body.categorie || null);
    setClauses.push('subcategorie = ?');
    vals.push(subcat || null);
    const row = getDb()
      .prepare('SELECT id FROM categorieen WHERE categorie = ? AND subcategorie IS ? LIMIT 1')
      .get(body.categorie, subcat) as { id: number } | undefined;
    setClauses.push('categorie_id = ?');
    vals.push(row ? row.id : null);
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

  if (setClauses.length === 0) {
    return NextResponse.json({ error: 'Geen velden opgegeven.' }, { status: 400 });
  }

  try {
    const db = getDb();
    // Zorg dat de aanpassingen-rij bestaat (INSERT OR IGNORE gebruikt tabel-defaults)
    db.prepare('INSERT OR IGNORE INTO transactie_aanpassingen (transactie_id) VALUES (?)').run(numId);
    db.prepare(`UPDATE transactie_aanpassingen SET ${setClauses.join(', ')} WHERE transactie_id = ?`)
      .run(...vals, numId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
