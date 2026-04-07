// FILE: RekeningenBeheer.tsx
// AANGEMAAKT: 25-03-2026 11:30
// VERSIE: 1
// GEWIJZIGD: 04-04-2026 21:45
//
// WIJZIGINGEN (04-04-2026 21:45):
// - Filter op Aangepast/Omboekingen verwijderd uit categoriechips
// WIJZIGINGEN (03-04-2026 10:30):
// - Categorie selectie vervangen door klikbare chips (add + bewerk formulier)
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
import { kiesAutomatischeKleur, kiesRandomKleur } from '@/lib/kleuren';
import InfoTooltip from '@/components/InfoTooltip';

interface GenegeerdeRekening { id: number; iban: string; datum_toegevoegd: string; }
interface Categorie { id: number; naam: string; rekening_ids: number[]; kleur: string | null; beschermd: number; }
interface RekeningGroep { id: number; naam: string; volgorde: number; rekening_ids: number[]; }

const inputCls = 'w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1.5 text-sm text-[var(--text-h)] focus:outline-none focus:border-[var(--accent)]';
const labelCls = 'block text-xs text-[var(--text-dim)] mb-1';
const btnVerwijder = { background: 'none', border: '1px solid var(--red)',  color: 'var(--red)',    fontSize: 12, padding: '3px 10px', borderRadius: 4, cursor: 'pointer', width: 76 } as const;
const btnOpslaan = { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600 as const, cursor: 'pointer' };

export default function RekeningenBeheer() {
  const [rekeningen, setRekeningen] = useState<Rekening[]>([]);
  const [categorieen, setCategorieen] = useState<Categorie[]>([]);
  const [groepen, setGroepen] = useState<RekeningGroep[]>([]);
  const [form, setForm] = useState({ iban: '', naam: '', type: 'betaal' as 'betaal' | 'spaar', kleur: '', kleurAutomatisch: true });
  const [formCats, setFormCats] = useState<Set<number>>(new Set());
  const [bezig, setBezig] = useState(false);
  const [fout, setFout]   = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [toonToevoegen, setToonToevoegen] = useState(false);

  const [genegeerd, setGenegeerd] = useState<GenegeerdeRekening[]>([]);

  const [bewerkId, setBewerkId]     = useState<number | null>(null);
  const [bewerkForm, setBewerkForm] = useState({ iban: '', naam: '', type: 'betaal' as 'betaal' | 'spaar', kleur: '', kleurAutomatisch: true });
  const [bewerkCats, setBewerkCats] = useState<Set<number>>(new Set());
  const [bewerkBezig, setBewerkBezig] = useState(false);
  const [bewerkFout, setBewerkFout] = useState<string | null>(null);

  async function laad() {
    const [r1, r2, r3] = await Promise.all([
      fetch('/api/rekeningen'),
      fetch('/api/budgetten-potjes'),
      fetch('/api/rekening-groepen'),
    ]);
    if (r1.ok) setRekeningen(await r1.json());
    if (r2.ok) setCategorieen(await r2.json());
    if (r3.ok) setGroepen(await r3.json());
  }

  async function laadGenegeerd() {
    const res = await fetch('/api/genegeerde-rekeningen');
    if (res.ok) setGenegeerd(await res.json());
  }

  useEffect(() => { laad(); laadGenegeerd(); }, []);

  useEffect(() => {
    const handler = () => { console.log('RekeningenBeheer: instellingen-refresh ontvangen'); laad(); };
    window.addEventListener('instellingen-refresh', handler);
    return () => window.removeEventListener('instellingen-refresh', handler);
  }, []);

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
      body: JSON.stringify({ iban: form.iban, naam: form.naam, type: form.type, kleur: form.kleur || null }),
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
    setForm({ iban: '', naam: '', type: 'betaal', kleur: '', kleurAutomatisch: true });
    setFormCats(new Set());
    setToonToevoegen(false);
    laad();
  }

  function openBewerk(r: Rekening) {
    if (bewerkId === r.id) { setBewerkId(null); return; }
    setBewerkId(r.id);
    const kleurAutomatisch = !r.kleur;
    const kleur = r.kleur ?? kiesAutomatischeKleur(alleGebruikteKleuren(r.id));
    setBewerkForm({ iban: r.iban, naam: r.naam, type: r.type, kleur, kleurAutomatisch });
    setBewerkCats(new Set(categorieen.filter(c => c.rekening_ids.includes(r.id)).map(c => c.id)));
    setBewerkFout(null);
  }

  async function handleBewerkOpslaan(id: number) {
    setBewerkBezig(true); setBewerkFout(null);
    const res = await fetch(`/api/rekeningen/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ iban: bewerkForm.iban, naam: bewerkForm.naam, type: bewerkForm.type, kleur: bewerkForm.kleur || null }),
    });
    if (!res.ok && res.status !== 204) {
      const d = await res.json();
      setBewerkBezig(false);
      setBewerkFout(d.error ?? 'Opslaan mislukt.');
      return;
    }
    await koppelCategorieen(id, bewerkCats);
    window.dispatchEvent(new CustomEvent('instellingen-refresh'));
    setBewerkBezig(false);
    setBewerkId(null);
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

  function alleGebruikteKleuren(excludeId?: number): string[] {
    const rekKleuren = rekeningen.filter(r => r.id !== excludeId).map(r => r.kleur).filter((k): k is string => !!k);
    const catKleuren = categorieen.map(c => c.kleur).filter((k): k is string => !!k);
    return [...rekKleuren, ...catKleuren];
  }

  // Bereken effectieve kleuren: voor rekeningen zonder kleur een automatische kleur toewijzen,
  // rekening houdend met alle eerder toegewezen kleuren (categorieën + eerdere rekeningen)
  const effectieveRekKleuren = (() => {
    const catKleuren = categorieen.map(c => c.kleur).filter((k): k is string => !!k);
    const map = new Map<number, string>();
    const gebruikt = [...catKleuren];
    for (const r of [...rekeningen].sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))) {
      if (r.kleur) {
        map.set(r.id, r.kleur);
        gebruikt.push(r.kleur);
      } else {
        const auto = kiesAutomatischeKleur(gebruikt);
        map.set(r.id, auto);
        gebruikt.push(auto);
      }
    }
    return map;
  })();

  const typeLabel = (t: string) => t === 'betaal' ? 'Betaalrekening' : 'Spaarrekening';

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <p className="section-title" style={{ margin: 0 }}>Rekeningen</p>
        <InfoTooltip volledigeBreedte tekst="Beheer hier je bankrekeningen. Registreer al je eigen rekeningen — ook rekeningen die niet in een rekeninggroep zitten. Overboekingen tussen eigen rekeningen worden automatisch herkend als omboeking en verschijnen niet in de overzichtstabellen op het Dashboard. Als je bijvoorbeeld een spaarrekening niet registreert, wordt een overboeking naar die rekening gezien als een uitgave in plaats van als omboeking. De kolom Rekeninggroepen toont in welke groepen een rekening zit. Gekoppelde Categorieën geeft aan welke categorieën aan de rekening zijn toegewezen." />
      </div>

      {/* Toevoeg-formulier */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => setToonToevoegen(v => !v)}
          style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', marginBottom: toonToevoegen ? 12 : 0 }}>
          {toonToevoegen ? 'Annuleer' : '+ Rekening toevoegen'}
        </button>
        {toonToevoegen && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <label className={labelCls} style={{ margin: 0 }}>Kleur</label>
            <input type="color"
              value={form.kleur || kiesAutomatischeKleur(alleGebruikteKleuren())}
              disabled={form.kleurAutomatisch}
              onChange={e => setForm(f => ({ ...f, kleur: e.target.value }))}
              style={{ width: 40, height: 34, padding: 2, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-base)', cursor: form.kleurAutomatisch ? 'default' : 'pointer', pointerEvents: form.kleurAutomatisch ? 'none' : 'auto' }}
            />
            <button type="button" title="Andere kleur"
              onClick={() => setForm(f => ({ ...f, kleur: kiesRandomKleur(alleGebruikteKleuren(), f.kleur) }))}
              disabled={!form.kleurAutomatisch}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', cursor: form.kleurAutomatisch ? 'pointer' : 'not-allowed', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', opacity: form.kleurAutomatisch ? 1 : 0.3 }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1v5h5" /><path d="M3.5 10a5 5 0 1 0 1-7L1 6" /></svg>
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-dim)', cursor: 'pointer' }}>
              <input type="checkbox"
                checked={form.kleurAutomatisch}
                onChange={e => {
                  const auto = e.target.checked;
                  const kleur = auto ? kiesAutomatischeKleur(alleGebruikteKleuren()) : form.kleur;
                  setForm(f => ({ ...f, kleurAutomatisch: auto, kleur }));
                }}
              /> Automatisch
            </label>
          </div>
          {categorieen.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p className={labelCls} style={{ marginBottom: 8 }}>Gekoppelde categorieën</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {categorieen.filter(c => !c.beschermd).map(c => (
                  <button key={c.id} type="button" onClick={() => toggleFormCat(c.id)}
                    style={(() => { const actief = formCats.has(c.id); const kleur = c.kleur ?? '#748ffc'; return { padding: '3px 10px', fontSize: 12, borderRadius: 12, cursor: 'pointer', border: actief ? `1.5px solid color-mix(in srgb, ${kleur} 30%, transparent)` : '1px solid var(--border)', background: actief ? `color-mix(in srgb, ${kleur} 15%, transparent)` : 'var(--bg-base)', color: actief ? kleur : 'var(--text-dim)', fontWeight: actief ? 600 : 400, transition: 'all 0.15s' }; })()}>
                    {c.naam}
                  </button>
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
        )}
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
                <th style={{ width: 40 }}>Kleur</th>
                <th>Type</th>
                <th>Rekeninggroepen</th>
                <th>Gekoppelde Categorieën</th>
              </tr>
            </thead>
            <tbody>
              {[...rekeningen].sort((a, b) => {
                const typeVolgorde: Record<string, number> = { betaal: 0, spaar: 1 };
                const typeVerschil = (typeVolgorde[a.type] ?? 99) - (typeVolgorde[b.type] ?? 99);
                if (typeVerschil !== 0) return typeVerschil;
                return a.naam.localeCompare(b.naam, 'nl');
              }).map(r => (
                <Fragment key={r.id}>
                  <tr onClick={() => openBewerk(r)}
                    onMouseEnter={() => setHoverId(r.id)} onMouseLeave={() => setHoverId(null)}
                    style={{ cursor: 'pointer', background: hoverId === r.id ? 'var(--bg-hover)' : undefined }}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.iban}</td>
                    <td style={{ color: 'var(--text-h)', fontWeight: 500 }}>{r.naam}</td>
                    <td>
                      <span style={{ display: 'inline-block', width: 20, height: 20, borderRadius: 4, background: effectieveRekKleuren.get(r.id) ?? '#748ffc', border: '1px solid var(--border)', verticalAlign: 'middle' }} />
                    </td>
                    <td>{typeLabel(r.type)}</td>
                    <td style={{ color: 'var(--text-dim)', fontSize: 12, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {groepen.filter(g => g.rekening_ids.includes(r.id)).map(g => (
                        <span key={g.id} style={{ display: 'inline-block', padding: '1px 8px', fontSize: 11, borderRadius: 10, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)', marginRight: 4, marginBottom: 2 }}>
                          {g.naam}
                        </span>
                      ))}
                      {groepen.filter(g => g.rekening_ids.includes(r.id)).length === 0 && '—'}
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: 'normal', lineHeight: 1.6 }}>
                      {(() => {
                        const gekoppeld = categorieen.filter(c => c.rekening_ids.includes(r.id));
                        if (gekoppeld.length === 0) return <span style={{ color: 'var(--text-dim)' }}>—</span>;
                        return gekoppeld.map(c => {
                          const kleur = c.kleur ?? '#748ffc';
                          return (
                            <span key={c.id} style={{ display: 'inline-block', padding: '1px 8px', fontSize: 11, borderRadius: 10, background: `color-mix(in srgb, ${kleur} 15%, transparent)`, color: kleur, border: `1px solid color-mix(in srgb, ${kleur} 30%, transparent)`, marginRight: 4, marginBottom: 2, fontWeight: 500 }}>
                              {c.naam}
                            </span>
                          );
                        });
                      })()}
                    </td>
                  </tr>
                  {bewerkId === r.id && (
                    <tr>
                      <td colSpan={6} style={{ padding: '16px 20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                          <label className={labelCls} style={{ margin: 0 }}>Kleur</label>
                          <input type="color"
                            value={bewerkForm.kleur || '#748ffc'}
                            disabled={bewerkForm.kleurAutomatisch}
                            onChange={e => setBewerkForm(f => ({ ...f, kleur: e.target.value }))}
                            style={{ width: 40, height: 34, padding: 2, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-base)', cursor: bewerkForm.kleurAutomatisch ? 'default' : 'pointer', pointerEvents: bewerkForm.kleurAutomatisch ? 'none' : 'auto' }}
                          />
                          <button type="button" title="Andere kleur"
                            onClick={() => setBewerkForm(f => ({ ...f, kleur: kiesRandomKleur(alleGebruikteKleuren(r.id), f.kleur) }))}
                            disabled={!bewerkForm.kleurAutomatisch}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', cursor: bewerkForm.kleurAutomatisch ? 'pointer' : 'not-allowed', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', opacity: bewerkForm.kleurAutomatisch ? 1 : 0.3 }}
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1v5h5" /><path d="M3.5 10a5 5 0 1 0 1-7L1 6" /></svg>
                          </button>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-dim)', cursor: 'pointer' }}>
                            <input type="checkbox"
                              checked={bewerkForm.kleurAutomatisch}
                              onChange={e => {
                                const auto = e.target.checked;
                                const kleur = auto ? kiesAutomatischeKleur(alleGebruikteKleuren(r.id)) : bewerkForm.kleur;
                                setBewerkForm(f => ({ ...f, kleurAutomatisch: auto, kleur }));
                              }}
                            /> Automatisch
                          </label>
                        </div>
                        {categorieen.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <p className={labelCls} style={{ marginBottom: 8 }}>Gekoppelde categorieën</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {categorieen.filter(c => !c.beschermd).map(c => (
                                <button key={c.id} type="button" onClick={() => toggleBewerkCat(c.id)}
                                  style={(() => { const actief = bewerkCats.has(c.id); const kleur = c.kleur ?? '#748ffc'; return { padding: '3px 10px', fontSize: 12, borderRadius: 12, cursor: 'pointer', border: actief ? `1.5px solid color-mix(in srgb, ${kleur} 30%, transparent)` : '1px solid var(--border)', background: actief ? `color-mix(in srgb, ${kleur} 15%, transparent)` : 'var(--bg-base)', color: actief ? kleur : 'var(--text-dim)', fontWeight: actief ? 600 : 400, transition: 'all 0.15s' }; })()}>
                                  {c.naam}
                                </button>
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
                          <div style={{ flex: 1 }} />
                          <button onClick={() => { handleVerwijder(r.id); setBewerkId(null); }} disabled={bewerkBezig} title="Verwijder"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 4, display: 'flex', alignItems: 'center' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
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
      {/* Genegeerde Rekeningen — alleen tonen als er genegeerde rekeningen zijn */}
      {genegeerd.length > 0 && (<>
      <p className="section-title" style={{ marginTop: 32 }}>Genegeerde Rekeningen</p>
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
                      <button onClick={() => handleVerwijderGenegeerd(g.id)} title="Verwijder" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 4, display: 'flex', alignItems: 'center' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}
    </section>
  );
}
