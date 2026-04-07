// FILE: VastePostenConfigBeheer.tsx
// AANGEMAAKT: 25-03-2026 11:30
// VERSIE: 1
// GEWIJZIGD: 31-03-2026 12:00
//
// WIJZIGINGEN (31-03-2026 12:00):
// - Annuleer-knop toegevoegd naast Opslaan in bewerk-formulier
// WIJZIGINGEN (25-03-2026 11:30):
// - Initiële aanmaak: tabel + formulier voor vaste posten definities
// WIJZIGINGEN (25-03-2026 20:00):
// - Bewerk-knop per rij met inline formulier (incl. verwachte_dag en verwacht_bedrag)
// WIJZIGINGEN (25-03-2026 20:30):
// - Layout geüniformeerd: section-title, table-wrapper, outline knoppen, card add-form

'use client';

import { Fragment, useEffect, useState } from 'react';
import type { VastePostDefinitie } from '@/lib/vastePostenConfig';

const inputCls = 'w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1.5 text-sm text-[var(--text-h)] focus:outline-none focus:border-[var(--accent)]';
const labelCls = 'block text-xs text-[var(--text-dim)] mb-1';
const btnBewerk  = { background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)',  fontSize: 12, padding: '3px 10px', borderRadius: 4, cursor: 'pointer', width: 70 } as const;
const btnVerwijder = { background: 'none', border: '1px solid var(--red)',  color: 'var(--red)',    fontSize: 12, padding: '3px 10px', borderRadius: 4, cursor: 'pointer', width: 76 } as const;
const btnOpslaan = { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600 as const, cursor: 'pointer' };

export default function VastePostenConfigBeheer() {
  const [definities, setDefinities] = useState<VastePostDefinitie[]>([]);
  const [form, setForm] = useState({ iban: '', naam: '', omschrijving: '', label: '' });
  const [bezig, setBezig] = useState(false);
  const [fout, setFout]   = useState<string | null>(null);

  const [bewerkId, setBewerkId]     = useState<number | null>(null);
  const [bewerkForm, setBewerkForm] = useState({
    iban: '', naam: '', omschrijving: '', label: '',
    verwachte_dag: '', verwacht_bedrag: '',
  });
  const [bewerkBezig, setBewerkBezig] = useState(false);
  const [bewerkFout, setBewerkFout] = useState<string | null>(null);

  async function laad() {
    const res = await fetch('/api/vaste-posten-config');
    if (!res.ok) { setFout('Laden mislukt.'); return; }
    setDefinities(await res.json());
  }

  useEffect(() => { laad(); }, []);

  async function handleToevoegen(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true); setFout(null);
    const res = await fetch('/api/vaste-posten-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, omschrijving: form.omschrijving || null }),
    });
    setBezig(false);
    if (!res.ok) {
      const d = await res.json();
      setFout(d.error ?? 'Toevoegen mislukt.');
      return;
    }
    setForm({ iban: '', naam: '', omschrijving: '', label: '' });
    laad();
  }

  function openBewerk(d: VastePostDefinitie) {
    if (bewerkId === d.id) { setBewerkId(null); return; }
    setBewerkId(d.id);
    setBewerkForm({
      iban:            d.iban,
      naam:            d.naam,
      omschrijving:    d.omschrijving ?? '',
      label:           d.label,
      verwachte_dag:   d.verwachte_dag !== null ? String(d.verwachte_dag) : '',
      verwacht_bedrag: d.verwacht_bedrag !== null ? String(d.verwacht_bedrag) : '',
    });
    setBewerkFout(null);
  }

  async function handleBewerkOpslaan(id: number) {
    setBewerkBezig(true); setBewerkFout(null);
    const res = await fetch(`/api/vaste-posten-config/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        iban:            bewerkForm.iban,
        naam:            bewerkForm.naam,
        omschrijving:    bewerkForm.omschrijving || null,
        label:           bewerkForm.label,
        verwachte_dag:   bewerkForm.verwachte_dag   ? parseInt(bewerkForm.verwachte_dag, 10)     : null,
        verwacht_bedrag: bewerkForm.verwacht_bedrag ? parseFloat(bewerkForm.verwacht_bedrag)     : null,
      }),
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

  async function handleVerwijder(id: number) {
    setFout(null);
    const res = await fetch(`/api/vaste-posten-config/${id}`, { method: 'DELETE' });
    if (!res.ok) { setFout('Verwijderen mislukt.'); return; }
    laad();
  }

  return (
    <section>
      <p className="section-title">Vaste posten</p>

      {definities.length === 0 ? (
        <p className="empty">Geen vaste posten definities geconfigureerd.</p>
      ) : (
        <div className="table-wrapper" style={{ marginBottom: 20 }}>
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>IBAN</th>
                <th>Naam</th>
                <th>Omschrijving</th>
                <th style={{ width: 164 }}></th>
              </tr>
            </thead>
            <tbody>
              {definities.map(d => (
                <Fragment key={d.id}>
                  <tr>
                    <td style={{ color: 'var(--text-h)', fontWeight: 500 }}>{d.label}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.iban}</td>
                    <td>{d.naam}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{d.omschrijving ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => openBewerk(d)} style={btnBewerk}>
                          {bewerkId === d.id ? 'Annuleer' : 'Bewerk'}
                        </button>
                        <button onClick={() => handleVerwijder(d.id)} title="Verwijder" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 4, display: 'flex', alignItems: 'center' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {bewerkId === d.id && (
                    <tr>
                      <td colSpan={5} style={{ padding: '16px 20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                          <div>
                            <label className={labelCls}>Label</label>
                            <input className={inputCls} value={bewerkForm.label}
                              onChange={e => setBewerkForm(f => ({ ...f, label: e.target.value }))} />
                          </div>
                          <div>
                            <label className={labelCls}>IBAN</label>
                            <input className={inputCls} value={bewerkForm.iban}
                              onChange={e => setBewerkForm(f => ({ ...f, iban: e.target.value }))} />
                          </div>
                          <div>
                            <label className={labelCls}>Naam tegenpartij</label>
                            <input className={inputCls} value={bewerkForm.naam}
                              onChange={e => setBewerkForm(f => ({ ...f, naam: e.target.value }))} />
                          </div>
                          <div>
                            <label className={labelCls}>Omschrijving (optioneel)</label>
                            <input className={inputCls} value={bewerkForm.omschrijving}
                              onChange={e => setBewerkForm(f => ({ ...f, omschrijving: e.target.value }))} />
                          </div>
                          <div>
                            <label className={labelCls}>Verwachte dag (1–31)</label>
                            <input className={inputCls} type="number" min={1} max={31}
                              value={bewerkForm.verwachte_dag}
                              onChange={e => setBewerkForm(f => ({ ...f, verwachte_dag: e.target.value }))} />
                          </div>
                          <div>
                            <label className={labelCls}>Verwacht bedrag (€)</label>
                            <input className={inputCls} type="number" step="0.01"
                              value={bewerkForm.verwacht_bedrag}
                              onChange={e => setBewerkForm(f => ({ ...f, verwacht_bedrag: e.target.value }))} />
                          </div>
                        </div>
                        {bewerkFout && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{bewerkFout}</p>}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleBewerkOpslaan(d.id)} disabled={bewerkBezig}
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

      {/* Toevoeg-formulier */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>Vaste post toevoegen</p>
        <form onSubmit={handleToevoegen}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
            <div>
              <label className={labelCls}>Label *</label>
              <input className={inputCls} value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                required placeholder="bijv. Huur" />
            </div>
            <div>
              <label className={labelCls}>IBAN *</label>
              <input className={inputCls} value={form.iban}
                onChange={e => setForm(f => ({ ...f, iban: e.target.value }))}
                required placeholder="NLxxRABOxxxxxxxxxx" />
            </div>
            <div>
              <label className={labelCls}>Naam tegenpartij *</label>
              <input className={inputCls} value={form.naam}
                onChange={e => setForm(f => ({ ...f, naam: e.target.value }))}
                required placeholder="bijv. Woningstichting X" />
            </div>
            <div>
              <label className={labelCls}>Omschrijving (optioneel)</label>
              <input className={inputCls} value={form.omschrijving}
                onChange={e => setForm(f => ({ ...f, omschrijving: e.target.value }))}
                placeholder="tekst in omschrijving" />
            </div>
          </div>
          {fout && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{fout}</p>}
          <button type="submit" disabled={bezig}
            style={{ ...btnOpslaan, opacity: bezig ? 0.6 : 1, cursor: bezig ? 'not-allowed' : 'pointer' }}>
            {bezig ? 'Bezig…' : 'Toevoegen'}
          </button>
        </form>
      </div>
    </section>
  );
}
