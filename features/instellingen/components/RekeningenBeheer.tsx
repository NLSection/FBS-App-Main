// FILE: RekeningenBeheer.tsx
// AANGEMAAKT: 25-03-2026 11:30
// VERSIE: 1
// GEWIJZIGD: 30-03-2026
//
// WIJZIGINGEN (30-03-2026 00:15):
// - Toevoeg-formulier boven de tabel geplaatst
// - Type labels voluit: Betaalrekening / Spaarrekening
// WIJZIGINGEN (30-03-2026):
// - Checkbox "Samenvoegen onder Beheerde Rekeningen" per rij toegevoegd
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

const inputCls = 'w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1.5 text-sm text-[var(--text-h)] focus:outline-none focus:border-[var(--accent)]';
const labelCls = 'block text-xs text-[var(--text-dim)] mb-1';
const btnBewerk  = { background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)',  fontSize: 12, padding: '3px 10px', borderRadius: 4, cursor: 'pointer', width: 70 } as const;
const btnVerwijder = { background: 'none', border: '1px solid var(--red)',  color: 'var(--red)',    fontSize: 12, padding: '3px 10px', borderRadius: 4, cursor: 'pointer', width: 76 } as const;
const btnOpslaan = { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600 as const, cursor: 'pointer' };

export default function RekeningenBeheer() {
  const [rekeningen, setRekeningen] = useState<Rekening[]>([]);
  const [form, setForm] = useState({ iban: '', naam: '', type: 'betaal' as 'betaal' | 'spaar' });
  const [bezig, setBezig] = useState(false);
  const [fout, setFout]   = useState<string | null>(null);

  const [bewerkId, setBewerkId]     = useState<number | null>(null);
  const [bewerkForm, setBewerkForm] = useState({ iban: '', naam: '', type: 'betaal' as 'betaal' | 'spaar' });
  const [bewerkBezig, setBewerkBezig] = useState(false);
  const [bewerkFout, setBewerkFout] = useState<string | null>(null);

  async function laad() {
    const res = await fetch('/api/rekeningen');
    if (!res.ok) { setFout('Laden mislukt.'); return; }
    setRekeningen(await res.json());
  }

  useEffect(() => { laad(); }, []);

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
    setForm({ iban: '', naam: '', type: 'betaal' });
    laad();
  }

  function openBewerk(r: Rekening) {
    if (bewerkId === r.id) { setBewerkId(null); return; }
    setBewerkId(r.id);
    setBewerkForm({ iban: r.iban, naam: r.naam, type: r.type });
    setBewerkFout(null);
  }

  async function handleBewerkOpslaan(id: number) {
    setBewerkBezig(true); setBewerkFout(null);
    const res = await fetch(`/api/rekeningen/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bewerkForm),
    });
    setBewerkBezig(false);
    if (!res.ok && res.status !== 204) {
      const d = await res.json();
      setBewerkFout(d.error ?? 'Opslaan mislukt.');
    } else {
      setBewerkId(null);
      laad();
    }
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

  const typeLabel = (t: string) => t === 'betaal' ? 'Betaalrekening' : 'Spaarrekening';

  return (
    <section>
      <p className="section-title">Rekeningen</p>

      {/* Toevoeg-formulier */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>Rekening toevoegen</p>
        <form onSubmit={handleToevoegen}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
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
              {rekeningen.map(r => (
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
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
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
                        {bewerkFout && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{bewerkFout}</p>}
                        <button onClick={() => handleBewerkOpslaan(r.id)} disabled={bewerkBezig}
                          style={{ ...btnOpslaan, opacity: bewerkBezig ? 0.6 : 1, cursor: bewerkBezig ? 'not-allowed' : 'pointer' }}>
                          {bewerkBezig ? 'Opslaan…' : 'Opslaan'}
                        </button>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
