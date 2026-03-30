// FILE: BudgettenPotjesBeheer.tsx
// AANGEMAAKT: 25-03-2026 19:30
// VERSIE: 1
// GEWIJZIGD: 30-03-2026 15:00
//
// WIJZIGINGEN (30-03-2026 00:00):
// - Categorie toevoegen sectie verwijderd (aanmaken via transactiescherm)
//
// WIJZIGINGEN (28-03-2026 00:00):
// - Sectietitel hernoemd naar "Categorieën"
// - Type kolom en type veld verwijderd uit tabel en formulieren
// - Toevoeg-formulier titel hernoemd naar "Categorie toevoegen"
// WIJZIGINGEN (30-03-2026 15:00):
// - Dropdown gekoppelde rekening vervangen door radio buttons
// - Lege state tekst aangepast naar "Geen categorieën gevonden."

'use client';

import { Fragment, useEffect, useState } from 'react';

interface BudgetPotje {
  id: number;
  naam: string;
  rekening_id: number | null;
  beschermd: number;
  kleur: string | null;
}

interface Rekening {
  id: number;
  iban: string;
  naam: string;
}

const inputCls = 'w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1.5 text-sm text-[var(--text-h)] focus:outline-none focus:border-[var(--accent)]';
const labelCls = 'block text-xs text-[var(--text-dim)] mb-1';
const btnBewerk    = { background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)',  fontSize: 12, padding: '3px 10px', borderRadius: 4, cursor: 'pointer', width: 70 } as const;
const btnVerwijder = { background: 'none', border: '1px solid var(--red)',    color: 'var(--red)',    fontSize: 12, padding: '3px 10px', borderRadius: 4, cursor: 'pointer', width: 76 } as const;
const btnOpslaan   = { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600 as const, cursor: 'pointer' };

export default function BudgettenPotjesBeheer() {
  const [items, setItems]           = useState<BudgetPotje[]>([]);
  const [rekeningen, setRekeningen] = useState<Rekening[]>([]);
  const [fout, setFout]             = useState<string | null>(null);

  const [bewerkId, setBewerkId]         = useState<number | null>(null);
  const [bewerkForm, setBewerkForm]     = useState({ naam: '', rekening_id: '', kleur: '' });
  const [bewerkBezig, setBewerkBezig]   = useState(false);
  const [bewerkFout, setBewerkFout]     = useState<string | null>(null);

  async function laad() {
    const [r1, r2] = await Promise.all([
      fetch('/api/budgetten-potjes'),
      fetch('/api/rekeningen'),
    ]);
    if (r1.ok) setItems(await r1.json());
    if (r2.ok) setRekeningen(await r2.json());
  }

  useEffect(() => { laad(); }, []);

  function openBewerk(item: BudgetPotje) {
    if (bewerkId === item.id) { setBewerkId(null); return; }
    setBewerkId(item.id);
    setBewerkForm({
      naam:        item.naam,
      rekening_id: item.rekening_id ? String(item.rekening_id) : '',
      kleur:       item.kleur ?? '',
    });
    setBewerkFout(null);
  }

  async function handleBewerkOpslaan(item: BudgetPotje) {
    setBewerkBezig(true); setBewerkFout(null);
    const res = await fetch(`/api/budgetten-potjes/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        naam:        item.beschermd ? undefined : bewerkForm.naam.trim(),
        rekening_id: bewerkForm.rekening_id ? parseInt(bewerkForm.rekening_id, 10) : null,
        kleur:       bewerkForm.kleur || null,
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

  async function handleDelete(id: number) {
    const res = await fetch(`/api/budgetten-potjes/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) {
      const d = await res.json();
      setFout(d.error ?? 'Verwijderen mislukt.');
    } else {
      laad();
    }
  }

  return (
    <section>
      <p className="section-title">Categorieën</p>

      {items.length === 0 ? (
        <p className="empty">Geen categorieën gevonden.</p>
      ) : (
        <div className="table-wrapper" style={{ marginBottom: 20 }}>
          <table>
            <thead>
              <tr>
                <th>Naam</th>
                <th>Kleur</th>
                <th>Rekening</th>
                <th style={{ width: 164 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <Fragment key={item.id}>
                  <tr>
                    <td style={{ color: 'var(--text-h)', fontWeight: 500 }}>
                      {item.beschermd
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13 }}>🔒</span>{item.naam}
                          </span>
                        : item.naam}
                    </td>
                    <td>
                      {item.kleur
                        ? <span style={{ display: 'inline-block', width: 20, height: 20, borderRadius: 4, background: item.kleur, border: '1px solid var(--border)', verticalAlign: 'middle' }} />
                        : <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ color: 'var(--text-dim)' }}>
                      {item.rekening_id
                        ? (rekeningen.find(r => r.id === item.rekening_id)?.naam ?? `#${item.rekening_id}`)
                        : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => openBewerk(item)} style={btnBewerk}>
                          {bewerkId === item.id ? 'Annuleer' : 'Bewerk'}
                        </button>
                        {!item.beschermd
                          ? <button onClick={() => handleDelete(item.id)} style={btnVerwijder}>Verwijder</button>
                          : <span style={{ display: 'inline-block', width: 76 }} />
                        }
                      </div>
                    </td>
                  </tr>
                  {bewerkId === item.id && (
                    <tr>
                      <td colSpan={4} style={{ padding: '16px 20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                          <div>
                            <label className={labelCls}>Naam</label>
                            <input className={inputCls} value={bewerkForm.naam}
                              onChange={e => setBewerkForm(f => ({ ...f, naam: e.target.value }))}
                              readOnly={!!item.beschermd}
                              style={item.beschermd ? { opacity: 0.4, cursor: 'default' } : {}} />
                          </div>
                          <div>
                            <label className={labelCls}>Kleur</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input
                                type="color"
                                value={bewerkForm.kleur || '#748ffc'}
                                onChange={e => setBewerkForm(f => ({ ...f, kleur: e.target.value }))}
                                style={{ width: 40, height: 34, padding: 2, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-base)', cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{bewerkForm.kleur || '—'}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <label className={labelCls} style={{ marginBottom: 8 }}>Gekoppelde rekening</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-h)', cursor: 'pointer' }}>
                              <input type="radio" name={`rekening-${item.id}`} value="" checked={bewerkForm.rekening_id === ''} onChange={() => setBewerkForm(f => ({ ...f, rekening_id: '' }))} />
                              Geen
                            </label>
                            {rekeningen.map(r => (
                              <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-h)', cursor: 'pointer' }}>
                                <input type="radio" name={`rekening-${item.id}`} value={r.id} checked={bewerkForm.rekening_id === String(r.id)} onChange={() => setBewerkForm(f => ({ ...f, rekening_id: String(r.id) }))} />
                                {r.naam}
                              </label>
                            ))}
                          </div>
                        </div>
                        {bewerkFout && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{bewerkFout}</p>}
                        <button onClick={() => handleBewerkOpslaan(item)} disabled={bewerkBezig}
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
