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
import { kiesAutomatischeKleur, kiesRandomKleur } from '@/lib/kleuren';

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
  kleur: string | null;
}

function alleGebruikteKleuren(items: BudgetPotje[], rekeningen: Rekening[], excludeId?: number): string[] {
  const catKleuren = items.filter(i => i.id !== excludeId).map(i => i.kleur).filter((k): k is string => !!k);
  const rekKleuren = rekeningen.map(r => r.kleur).filter((k): k is string => !!k);
  return [...catKleuren, ...rekKleuren];
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

  // Bereken effectieve kleuren per categorie, rekening houdend met alle andere kleuren
  const effectieveCatKleuren = (() => {
    const rekKleuren = rekeningen.map(r => r.kleur).filter((k): k is string => !!k);
    const map = new Map<number, string>();
    const gebruikt = [...rekKleuren];
    for (const item of items) {
      if (item.kleur) {
        map.set(item.id, item.kleur);
        gebruikt.push(item.kleur);
      } else {
        const auto = kiesAutomatischeKleur(gebruikt);
        map.set(item.id, auto);
        gebruikt.push(auto);
      }
    }
    return map;
  })();

  function openBewerk(item: BudgetPotje) {
    if (bewerkId === item.id) { setBewerkId(null); return; }
    setBewerkId(item.id);
    const kleurAutomatisch = !item.kleur;
    const kleur = item.kleur ?? kiesAutomatischeKleur(alleGebruikteKleuren(items, rekeningen, item.id));
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
                      <span style={{ display: 'inline-block', width: 20, height: 20, borderRadius: 4, background: effectieveCatKleuren.get(item.id) ?? '#748ffc', border: '1px solid var(--border)', verticalAlign: 'middle' }} />
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
                                style={{ width: 40, height: 34, padding: 2, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-base)', cursor: bewerkForm.kleurAutomatisch ? 'default' : 'pointer', pointerEvents: bewerkForm.kleurAutomatisch ? 'none' : 'auto' }}
                              />
                              <button type="button" title="Andere kleur"
                                onClick={() => setBewerkForm(f => ({ ...f, kleur: kiesRandomKleur(alleGebruikteKleuren(items, rekeningen, bewerkId ?? undefined), f.kleur) }))}
                                disabled={!bewerkForm.kleurAutomatisch}
                                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', cursor: bewerkForm.kleurAutomatisch ? 'pointer' : 'not-allowed', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', opacity: bewerkForm.kleurAutomatisch ? 1 : 0.3 }}
                              >
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1v5h5" /><path d="M3.5 10a5 5 0 1 0 1-7L1 6" /></svg>
                              </button>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim)', cursor: 'pointer', width: 'fit-content' }}>
                              <input
                                type="checkbox"
                                checked={bewerkForm.kleurAutomatisch}
                                onChange={e => {
                                  const auto = e.target.checked;
                                  const kleur = auto
                                    ? kiesAutomatischeKleur(alleGebruikteKleuren(items, rekeningen, bewerkId ?? undefined))
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
