// FILE: RekeningenBeheer.tsx
// AANGEMAAKT: 25-03-2026 11:30
// VERSIE: 1
// GEWIJZIGD: 31-03-2026 12:00
//
// WIJZIGINGEN (31-03-2026 12:00):
// - Annuleer-knop toegevoegd naast Opslaan in bewerk-formulier
// WIJZIGINGEN (30-03-2026 00:15):
// - Toevoeg-formulier boven de tabel geplaatst
// - Type labels voluit: Betaalrekening / Spaarrekening
// WIJZIGINGEN (30-03-2026):
// - Checkbox "Samenvoegen onder Beheerde Rekeningen" per rij toegevoegd
// - Sectie "Genegeerde Rekeningen" toegevoegd met tabel en verwijderknop
// WIJZIGINGEN (30-03-2026 15:00):
// - Checkboxes gekoppelde categorieën in toevoeg- én bewerk-formulier
// - Na opslaan: rekening_id op geselecteerde categorieën bijgewerkt via PUT
//
// WIJZIGINGEN (25-03-2026 11:30):
// - Initiële aanmaak: tabel + formulier voor rekeningen beheer
// WIJZIGINGEN (25-03-2026 20:00):
// - Bewerk-knop per rij met inline formulier
// WIJZIGINGEN (25-03-2026 20:30):
// - Layout geüniformeerd: section-title, table-wrapper, outline knoppen, card add-form

'use client';

import { Fragment, useEffect, useState } from 'react';
import type { Rekening } from '@/lib/rekeningen';

interface GenegeerdeRekening { id: number; iban: string; datum_toegevoegd: string; }
interface Categorie { id: number; naam: string; rekening_ids: number[]; }

const inputCls = 'w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1.5 text-sm text-[var(--text-h)] focus:outline-none focus:border-[var(--accent)]';
const labelCls = 'block text-xs text-[var(--text-dim)] mb-1';
const btnBewerk    = { background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)',  fontSize: 12, padding: '3px 10px', borderRadius: 4, cursor: 'pointer', width: 70 } as const;
const btnVerwijder = { background: 'none', border: '1px solid var(--red)',  color: 'var(--red)',    fontSize: 12, padding: '3px 10px', borderRadius: 4, cursor: 'pointer', width: 76 } as const;
const btnOpslaan = { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600 as const, cursor: 'pointer' };

export default function RekeningenBeheer() {
  const [rekeningen, setRekeningen] = useState<Rekening[]>([]);
  const [categorieen, setCategorieen] = useState<Categorie[]>([]);
  const [form, setForm] = useState({ iban: '', naam: '', type: 'betaal' as 'betaal' | 'spaar' });
  const [formCats, setFormCats] = useState<Set<number>>(new Set());
  const [bezig, setBezig] = useState(false);
  const [fout, setFout]   = useState<string | null>(null);

  const [genegeerd, setGenegeerd] = useState<GenegeerdeRekening[]>([]);

  const [bewerkId, setBewerkId]     = useState<number | null>(null);
  const [bewerkForm, setBewerkForm] = useState({ iban: '', naam: '', type: 'betaal' as 'betaal' | 'spaar' });
  const [bewerkCats, setBewerkCats] = useState<Set<number>>(new Set());
  const [bewerkBezig, setBewerkBezig] = useState(false);
  const [bewerkFout, setBewerkFout] = useState<string | null>(null);

  async function laad() {
    const [r1, r2] = await Promise.all([
      fetch('/api/rekeningen'),
      fetch('/api/budgetten-potjes'),
    ]);
    if (r1.ok) setRekeningen(await r1.json());
    if (r2.ok) setCategorieen(await r2.json());
  }

  async function laadGenegeerd() {
    const res = await fetch('/api/genegeerde-rekeningen');
    if (res.ok) setGenegeerd(await res.json());
  }

  useEffect(() => { laad(); laadGenegeerd(); }, []);

  function toggleFormCat(id: number) {
    setFormCats(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function toggleBewerkCat(id: number) {
    setBewerkCats(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  async function koppelCategorieen(rekeningId: number, geselecteerd: Set<number>) {
    const gewijzigd = categorieen.filter(c => {
      const was = c.rekening_ids.includes(rekeningId);
      const is  = geselecteerd.has(c.id);
      return was !== is;
    });
    await Promise.all(gewijzigd.map(c => {
      const nieuweIds = geselecteerd.has(c.id)
        ? [...c.rekening_ids, rekeningId]
        : c.rekening_ids.filter(id => id !== rekeningId);
      return fetch(`/api/budgetten-potjes/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rekening_ids: nieuweIds }),
      });
    }));
  }

  async function handleToevoegen(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true); setFout(null);
    const res = await fetch('/api/rekeningen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setBezig(false);
    if (!res.ok) {
      const d = await res.json();
      setFout(d.error ?? 'Toevoegen mislukt.');
      return;
    }
    const { id } = await res.json();
    if (formCats.size > 0) {
      await Promise.all([...formCats].map(catId => {
        const c = categorieen.find(x => x.id === catId);
        return fetch(`/api/budgetten-potjes/${catId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rekening_ids: [...(c?.rekening_ids ?? []), id] }),
        });
      }));
    }
    setForm({ iban: '', naam: '', type: 'betaal' });
    setFormCats(new Set());
    laad();
  }

  function openBewerk(r: Rekening) {
    if (bewerkId === r.id) { setBewerkId(null); return; }
    setBewerkId(r.id);
    setBewerkForm({ iban: r.iban, naam: r.naam, type: r.type });
    setBewerkCats(new Set(categorieen.filter(c => c.rekening_ids.includes(r.id)).map(c => c.id)));
    setBewerkFout(null);
  }

  async function handleBewerkOpslaan(id: number) {
    setBewerkBezig(true); setBewerkFout(null);
    const res = await fetch(`/api/rekeningen/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bewerkForm),
    });
    if (!res.ok && res.status !== 204) {
      const d = await res.json();
      setBewerkBezig(false);
      setBewerkFout(d.error ?? 'Opslaan mislukt.');
      return;
    }
    await koppelCategorieen(id, bewerkCats);
    setBewerkBezig(false);
    setBewerkId(null);
    laad();
  }

  async function handleBeheerd(id: number, beheerd: boolean) {
    await fetch(`/api/rekeningen/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beheerd: beheerd ? 1 : 0 }),
    });
    laad();
  }

  async function handleVerwijder(id: number) {
    setFout(null);
    const res = await fetch(`/api/rekeningen/${id}`, { method: 'DELETE' });
    if (!res.ok) { setFout('Verwijderen mislukt.'); return; }
    laad();
  }

  async function handleVerwijderGenegeerd(id: number) {
    await fetch(`/api/genegeerde-rekeningen/${id}`, { method: 'DELETE' });
    laadGenegeerd();
  }

  const typeLabel = (t: string) => t === 'betaal' ? 'Betaalrekening' : 'Spaarrekening';

  return (
    <section>
      <p className="section-title">Rekeningen</p>

      {/* Toevoeg-formulier */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>Rekening toevoegen</p>
        <form onSubmit={handleToevoegen}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <div>
              <label className={labelCls}>IBAN *</label>
              <input className={inputCls} value={form.iban}
                onChange={e => setForm(f => ({ ...f, iban: e.target.value }))}
                required placeholder="NLxxRABOxxxxxxxxxx" />
            </div>
            <div>
              <label className={labelCls}>Naam *</label>
              <input className={inputCls} value={form.naam}
                onChange={e => setForm(f => ({ ...f, naam: e.target.value }))}
                required placeholder="Eigen omschrijving" />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as 'betaal' | 'spaar' }))}>
                <option value="betaal">Betaalrekening</option>
                <option value="spaar">Spaarrekening</option>
              </select>
            </div>
          </div>
          {categorieen.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p className={labelCls} style={{ marginBottom: 8 }}>Gekoppelde categorieën</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
                {categorieen.map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-h)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formCats.has(c.id)} onChange={() => toggleFormCat(c.id)} />
                    {c.naam}
                  </label>
                ))}
              </div>
            </div>
          )}
          {fout && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{fout}</p>}
          <button type="submit" disabled={bezig}
            style={{ ...btnOpslaan, opacity: bezig ? 0.6 : 1, cursor: bezig ? 'not-allowed' : 'pointer' }}>
            {bezig ? 'Bezig…' : 'Toevoegen'}
          </button>
        </form>
      </div>

      {rekeningen.length === 0 ? (
        <p className="empty">Geen rekeningen geconfigureerd.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>IBAN</th>
                <th>Naam</th>
                <th>Type</th>
                <th>Samenvoegen</th>
                <th style={{ width: 164 }}></th>
              </tr>
            </thead>
            <tbody>
              {[...rekeningen].sort((a, b) => a.naam.localeCompare(b.naam, 'nl')).map(r => (
                <Fragment key={r.id}>
                  <tr>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.iban}</td>
                    <td style={{ color: 'var(--text-h)', fontWeight: 500 }}>{r.naam}</td>
                    <td>{typeLabel(r.type)}</td>
                    <td>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text-dim)' }}>
                        <input
                          type="checkbox"
                          checked={r.beheerd === 1}
                          onChange={e => handleBeheerd(r.id, e.target.checked)}
                        />
                        Beheerde Rekeningen
                      </label>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => openBewerk(r)} style={btnBewerk}>
                          {bewerkId === r.id ? 'Annuleer' : 'Bewerk'}
                        </button>
                        <button onClick={() => handleVerwijder(r.id)} style={btnVerwijder}>
                          Verwijder
                        </button>
                      </div>
                    </td>
                  </tr>
                  {bewerkId === r.id && (
                    <tr>
                      <td colSpan={5} style={{ padding: '16px 20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                          <div>
                            <label className={labelCls}>IBAN</label>
                            <input className={inputCls} value={bewerkForm.iban}
                              onChange={e => setBewerkForm(f => ({ ...f, iban: e.target.value }))} />
                          </div>
                          <div>
                            <label className={labelCls}>Naam</label>
                            <input className={inputCls} value={bewerkForm.naam}
                              onChange={e => setBewerkForm(f => ({ ...f, naam: e.target.value }))} />
                          </div>
                          <div>
                            <label className={labelCls}>Type</label>
                            <select className={inputCls} value={bewerkForm.type}
                              onChange={e => setBewerkForm(f => ({ ...f, type: e.target.value as 'betaal' | 'spaar' }))}>
                              <option value="betaal">Betaalrekening</option>
                              <option value="spaar">Spaarrekening</option>
                            </select>
                          </div>
                        </div>
                        {categorieen.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <p className={labelCls} style={{ marginBottom: 8 }}>Gekoppelde categorieën</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
                              {categorieen.map(c => (
                                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-h)', cursor: 'pointer' }}>
                                  <input type="checkbox" checked={bewerkCats.has(c.id)} onChange={() => toggleBewerkCat(c.id)} />
                                  {c.naam}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        {bewerkFout && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{bewerkFout}</p>}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleBewerkOpslaan(r.id)} disabled={bewerkBezig}
                            style={{ ...btnOpslaan, opacity: bewerkBezig ? 0.6 : 1, cursor: bewerkBezig ? 'not-allowed' : 'pointer' }}>
                            {bewerkBezig ? 'Opslaan…' : 'Opslaan'}
                          </button>
                          <button onClick={() => setBewerkId(null)} disabled={bewerkBezig}
                            style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '7px 16px', fontSize: 13, cursor: 'pointer' }}>
                            Annuleer
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Genegeerde Rekeningen */}
      <p className="section-title" style={{ marginTop: 32 }}>Genegeerde Rekeningen</p>
      {genegeerd.length === 0 ? (
        <p className="empty">Geen genegeerde rekeningen.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>IBAN</th>
                <th>Datum toegevoegd</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {genegeerd.map(g => (
                <tr key={g.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{g.iban}</td>
                  <td>{g.datum_toegevoegd}</td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleVerwijderGenegeerd(g.id)} style={btnVerwijder}>
                        Verwijder
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
