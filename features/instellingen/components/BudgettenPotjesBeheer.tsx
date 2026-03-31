// FILE: BudgettenPotjesBeheer.tsx
// AANGEMAAKT: 25-03-2026 19:30
// VERSIE: 1
// GEWIJZIGD: 31-03-2026 12:00
//
// WIJZIGINGEN (31-03-2026 12:00):
// - Annuleer-knop toegevoegd naast Opslaan in bewerk-formulier
// - Automatisch-checkbox toegevoegd bij kleur; picker+hex uitgegrijsd als aangevinkt
// - kiesAutomatischeKleur: maximale hoekafstand t.o.v. bestaande hues in HSL-ruimte
// WIJZIGINGEN (31-03-2026 11:00):
// - Hex-invoerveld toegevoegd naast kleurpicker; bidirectionele sync
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
  rekening_ids: number[];
  beschermd: number;
  kleur: string | null;
}

interface Rekening {
  id: number;
  iban: string;
  naam: string;
}

function hexNaarHue(hex: string): number | null {
  const m = hex.match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else                h = ((r - g) / d + 4) / 6;
  return h * 360;
}

function hslNaarHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)))
      .toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function kiesAutomatischeKleur(gebruikteKleuren: string[]): string {
  const hues = gebruikteKleuren.map(hexNaarHue).filter((h): h is number => h !== null);
  let bestHue = 0, bestDist = -1;
  for (let h = 0; h < 360; h += 15) {
    const minDist = hues.length === 0
      ? 360
      : Math.min(...hues.map(eh => { const d = Math.abs(h - eh); return Math.min(d, 360 - d); }));
    if (minDist > bestDist) { bestDist = minDist; bestHue = h; }
  }
  return hslNaarHex(bestHue, 65, 60);
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
  const [bewerkForm, setBewerkForm]     = useState({ naam: '', rekening_id: null as number | null, kleur: '', kleurAutomatisch: true });
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
    const kleurAutomatisch = !item.kleur;
    const kleur = item.kleur ?? kiesAutomatischeKleur(items.filter(i => i.id !== item.id).map(i => i.kleur).filter((k): k is string => !!k));
    setBewerkForm({ naam: item.naam, rekening_id: item.rekening_ids[0] ?? null, kleur, kleurAutomatisch });
    setBewerkFout(null);
  }

  async function handleBewerkOpslaan(item: BudgetPotje) {
    setBewerkBezig(true); setBewerkFout(null);
    const res = await fetch(`/api/budgetten-potjes/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        naam:         item.beschermd ? undefined : bewerkForm.naam.trim(),
        rekening_ids: bewerkForm.rekening_id ? [bewerkForm.rekening_id] : [],
        kleur:        bewerkForm.kleur || null,
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
              {[...items].sort((a, b) => {
                if (a.beschermd !== b.beschermd) return b.beschermd - a.beschermd;
                return a.naam.localeCompare(b.naam, 'nl');
              }).map(item => (
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
                    <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                      {item.rekening_ids.length === 0
                        ? '—'
                        : item.rekening_ids.map(rid => rekeningen.find(r => r.id === rid)?.naam ?? `#${rid}`).join(', ')}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <input
                                type="color"
                                value={bewerkForm.kleur || '#748ffc'}
                                disabled={bewerkForm.kleurAutomatisch}
                                onChange={e => setBewerkForm(f => ({ ...f, kleur: e.target.value }))}
                                style={{ width: 40, height: 34, padding: 2, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-base)', cursor: bewerkForm.kleurAutomatisch ? 'not-allowed' : 'pointer', opacity: bewerkForm.kleurAutomatisch ? 0.4 : 1 }}
                              />
                              <input
                                type="text"
                                value={bewerkForm.kleur}
                                disabled={bewerkForm.kleurAutomatisch}
                                onChange={e => {
                                  const val = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
                                  setBewerkForm(f => ({ ...f, kleur: val }));
                                }}
                                onBlur={() => {
                                  if (!/^#[0-9a-fA-F]{6}$/.test(bewerkForm.kleur)) {
                                    setBewerkForm(f => ({ ...f, kleur: '' }));
                                  }
                                }}
                                placeholder="#748ffc"
                                maxLength={7}
                                style={{ width: 80, background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 12, color: 'var(--text-h)', fontFamily: 'monospace', opacity: bewerkForm.kleurAutomatisch ? 0.4 : 1, cursor: bewerkForm.kleurAutomatisch ? 'not-allowed' : 'text' }}
                              />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim)', cursor: 'pointer', width: 'fit-content' }}>
                              <input
                                type="checkbox"
                                checked={bewerkForm.kleurAutomatisch}
                                onChange={e => {
                                  const auto = e.target.checked;
                                  const kleur = auto
                                    ? kiesAutomatischeKleur(items.filter(i => i.id !== bewerkId).map(i => i.kleur).filter((k): k is string => !!k))
                                    : bewerkForm.kleur;
                                  setBewerkForm(f => ({ ...f, kleurAutomatisch: auto, kleur }));
                                }}
                              />
                              Automatisch
                            </label>
                          </div>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <label className={labelCls}>Gekoppelde rekening</label>
                          <select
                            value={bewerkForm.rekening_id ?? ''}
                            onChange={e => setBewerkForm(f => ({ ...f, rekening_id: e.target.value ? parseInt(e.target.value, 10) : null }))}
                            style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 12, color: 'var(--text-h)' }}
                          >
                            <option value="">— Geen rekening —</option>
                            {rekeningen.map(r => (
                              <option key={r.id} value={r.id}>{r.naam}</option>
                            ))}
                          </select>
                        </div>
                        {bewerkFout && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{bewerkFout}</p>}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleBewerkOpslaan(item)} disabled={bewerkBezig}
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

    </section>
  );
}
