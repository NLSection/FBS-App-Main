// FILE: CategorieenBeheer.tsx
// AANGEMAAKT: 25-03-2026 17:30
// VERSIE: 1
// GEWIJZIGD: 28-03-2026 23:45
//
// WIJZIGINGEN (28-03-2026 23:45):
// - Kolom "Naam zoekwoord" terug toegevoegd aan tabel, na "Naam tegenpartij"
// - Verwijderknop stijl gelijkgetrokken met RekeningenBeheer (border, padding, borderRadius)

'use client';

import { useEffect, useState, useCallback } from 'react';
import type { CategorieType } from '@/lib/categorisatie';
import { formatType } from '@/lib/formatType';

interface CategorieRegel {
  id: number;
  iban: string | null;
  naam_zoekwoord: string | null;
  naam_origineel: string | null;
  omschrijving_zoekwoord: string | null;
  categorie: string;
  subcategorie: string | null;
  type: CategorieType;
  laatste_gebruik: string | null;
}

type SortCol = Exclude<keyof CategorieRegel, 'id'>;
type EditState = { regelId: number; veld: string; waarde: string } | null;

const CATEGORIE_TYPES: CategorieType[] = ['alle', 'normaal-af', 'normaal-bij', 'omboeking-af', 'omboeking-bij'];
function typeLabel(t: string) { return t === 'alle' ? 'Alle' : formatType(t as CategorieType); }

function formatDatum(d: string | null): string {
  if (!d) return '—';
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d;
}

async function triggerReMatch(): Promise<void> {
  await fetch('/api/categoriseer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}

const leegFormulier = {
  iban: '', naam_origineel: '', naam_zoekwoord_raw: '', omschrijving_raw: '',
  categorie: '', subcategorie: '', type: 'alle' as CategorieType,
};

const KOLOMMEN: { col: SortCol; label: string }[] = [
  { col: 'iban',                    label: 'IBAN' },
  { col: 'naam_origineel',          label: 'Naam tegenpartij' },
  { col: 'naam_zoekwoord',          label: 'Naam zoekwoord' },
  { col: 'omschrijving_zoekwoord',  label: 'Omschrijving zoekwoord' },
  { col: 'categorie',               label: 'Categorie' },
  { col: 'subcategorie',            label: 'Subcategorie' },
  { col: 'type',                    label: 'Type' },
  { col: 'laatste_gebruik',         label: 'Laatste gebruik' },
];

export default function CategorieenBeheer() {
  const [regels, setRegels]   = useState<CategorieRegel[]>([]);
  const [bezig, setBezig]     = useState(false);
  const [fout, setFout]       = useState<string | null>(null);
  const [form, setForm]       = useState(leegFormulier);
  const [sortCol, setSortCol] = useState<SortCol>('naam_origineel');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [edit, setEdit]       = useState<EditState>(null);

  // Callback ref: focus zodra inline-edit input/select in DOM verschijnt
  const focusRef = useCallback((el: HTMLInputElement | HTMLSelectElement | null) => {
    el?.focus();
  }, []);

  async function laadRegels() {
    const res = await fetch('/api/categorieen');
    if (res.ok) setRegels(await res.json());
  }

  useEffect(() => { laadRegels(); }, []);

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  const gesorteerd = [...regels].sort((a, b) => {
    const va = String(a[sortCol] ?? '');
    const vb = String(b[sortCol] ?? '');
    const cmp = va.localeCompare(vb, 'nl');
    return sortDir === 'asc' ? cmp : -cmp;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.categorie.trim()) { setFout('Categorie is verplicht.'); return; }
    setBezig(true); setFout(null);

    const body: Record<string, unknown> = {
      iban:             form.iban.trim()             || null,
      naam_origineel:   form.naam_origineel.trim()   || null,
      omschrijving_raw: form.omschrijving_raw.trim() || null,
      categorie:        form.categorie.trim(),
      subcategorie:     form.subcategorie.trim()     || null,
      type:             form.type,
    };
    if (form.naam_zoekwoord_raw.trim()) {
      body.naam_zoekwoord_raw = form.naam_zoekwoord_raw.trim();
    }

    const res = await fetch('/api/categorieen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBezig(false);
    if (!res.ok) {
      const d = await res.json();
      setFout(d.error ?? 'Opslaan mislukt.');
    } else {
      setForm(leegFormulier);
      laadRegels();
    }
  }

  function startEdit(regelId: number, veld: string, waarde: string) {
    setEdit({ regelId, veld, waarde });
  }

  async function saveEdit() {
    if (!edit) return;
    const regel = regels.find(r => r.id === edit.regelId);
    if (!regel) { setEdit(null); return; }

    const body: Record<string, unknown> = {
      iban:               regel.iban,
      naam_origineel:     regel.naam_origineel,
      naam_zoekwoord_raw: regel.naam_zoekwoord,   // behoudt bestaand zoekwoord standaard
      omschrijving_raw:   regel.omschrijving_zoekwoord,
      categorie:          regel.categorie,
      subcategorie:       regel.subcategorie,
      type:               regel.type,
    };

    switch (edit.veld) {
      case 'iban':                    body.iban = edit.waarde || null; break;
      case 'naam_origineel':          body.naam_origineel = edit.waarde || null;
                                      delete body.naam_zoekwoord_raw; // her-afleiden uit naam_origineel
                                      break;
      case 'naam_zoekwoord':          body.naam_zoekwoord_raw = edit.waarde || null; break;
      case 'omschrijving_zoekwoord':  body.omschrijving_raw = edit.waarde || null; break;
      case 'categorie':               body.categorie = edit.waarde; break;
      case 'subcategorie':            body.subcategorie = edit.waarde || null; break;
      case 'type':                    body.type = edit.waarde; break;
    }

    setEdit(null);
    await fetch(`/api/categorieen/${edit.regelId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await triggerReMatch();
    laadRegels();
  }

  function onEditKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); setEdit(null); }
    else if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/categorieen/${id}`, { method: 'DELETE' });
    await triggerReMatch();
    laadRegels();
  }

  // Render helper voor bewerkbare tekstcel (geen React-component om remounts te vermijden)
  function textCell(r: CategorieRegel, veld: string, value: string | null, cellStyle?: React.CSSProperties) {
    if (edit?.regelId === r.id && edit?.veld === veld) {
      return (
        <td key={veld}>
          <input
            ref={focusRef as React.RefCallback<HTMLInputElement>}
            value={edit.waarde}
            onChange={ev => setEdit(e => e ? { ...e, waarde: ev.target.value } : e)}
            onBlur={saveEdit}
            onKeyDown={onEditKey}
            style={{
              fontSize: 12, border: '1px solid var(--accent)', borderRadius: 4,
              background: 'var(--bg-base)', color: 'var(--text-h)',
              padding: '2px 6px', width: '100%', minWidth: 80,
            }}
          />
        </td>
      );
    }
    return (
      <td key={veld} style={{ cursor: 'pointer', ...cellStyle }}
        onClick={() => startEdit(r.id, veld, value ?? '')}
        title="Klik om te bewerken">
        {value || <em style={{ color: 'var(--text-dim)' }}>—</em>}
      </td>
    );
  }

  const inputCls = 'w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1.5 text-sm text-[var(--text-h)] focus:outline-none focus:border-[var(--accent)]';
  const labelCls = 'block text-xs text-[var(--text-dim)] mb-1';

  return (
    <div>
      {/* Formulier */}
      <form onSubmit={handleSubmit} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '20px', marginBottom: 24,
      }}>
        <p className="section-title" style={{ marginBottom: 16 }}>Nieuwe categorieregel</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
          <div>
            <label className={labelCls}>IBAN tegenrekening (optioneel)</label>
            <input className={inputCls} value={form.iban}
              onChange={e => setForm(f => ({ ...f, iban: e.target.value }))}
              placeholder="NL00RABO0000000000" />
          </div>
          <div>
            <label className={labelCls}>Naam tegenpartij (optioneel)</label>
            <input className={inputCls} value={form.naam_origineel}
              onChange={e => setForm(f => ({ ...f, naam_origineel: e.target.value }))}
              placeholder="Albert Heijn" />
          </div>
          <div>
            <label className={labelCls}>Naam zoekwoord (optioneel)</label>
            <input className={inputCls} value={form.naam_zoekwoord_raw}
              onChange={e => setForm(f => ({ ...f, naam_zoekwoord_raw: e.target.value }))}
              placeholder="Leeg = auto afgeleid" />
          </div>
          <div>
            <label className={labelCls}>Omschrijving zoekwoord (optioneel)</label>
            <input className={inputCls} value={form.omschrijving_raw}
              onChange={e => setForm(f => ({ ...f, omschrijving_raw: e.target.value }))}
              placeholder="boodschappen" />
          </div>
          <div>
            <label className={labelCls}>Categorie *</label>
            <input className={inputCls} value={form.categorie}
              onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
              placeholder="Boodschappen" required />
          </div>
          <div>
            <label className={labelCls}>Subcategorie (optioneel)</label>
            <input className={inputCls} value={form.subcategorie}
              onChange={e => setForm(f => ({ ...f, subcategorie: e.target.value }))}
              placeholder="Supermarkt" />
          </div>
          <div>
            <label className={labelCls}>Type transactie</label>
            <select className={inputCls} value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as CategorieType }))}>
              {CATEGORIE_TYPES.map(v => (
                <option key={v} value={v}>{typeLabel(v)}</option>
              ))}
            </select>
          </div>
        </div>
        {fout && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{fout}</p>}
        <button type="submit" disabled={bezig} style={{
          background: 'var(--accent)', color: '#fff', border: 'none',
          borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600,
          cursor: bezig ? 'not-allowed' : 'pointer', opacity: bezig ? 0.6 : 1,
        }}>
          {bezig ? 'Opslaan…' : 'Regel toevoegen'}
        </button>
      </form>

      {/* Tabel */}
      {regels.length === 0 ? (
        <p className="empty">Geen categorieregels gevonden.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {KOLOMMEN.map(({ col, label }) => (
                  <th key={col} onClick={() => toggleSort(col)}
                    style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    {label}
                    <span style={{ marginLeft: 4, opacity: sortCol === col ? 1 : 0.3 }}>
                      {sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {gesorteerd.map(r => (
                <tr key={r.id}>
                  {textCell(r, 'iban', r.iban, { fontSize: 11, fontFamily: 'monospace' })}
                  {textCell(r, 'naam_origineel', r.naam_origineel, { color: 'var(--text-h)', fontWeight: 500 })}
                  {textCell(r, 'naam_zoekwoord', r.naam_zoekwoord, { fontSize: 11, fontFamily: 'monospace' })}
                  {textCell(r, 'omschrijving_zoekwoord', r.omschrijving_zoekwoord, { fontSize: 11 })}
                  {textCell(r, 'categorie', r.categorie, { color: 'var(--text-h)', fontWeight: 500 })}
                  {textCell(r, 'subcategorie', r.subcategorie)}

                  {/* Type cel: badge weergave, select bij bewerken */}
                  {edit?.regelId === r.id && edit?.veld === 'type' ? (
                    <td>
                      <select
                        ref={focusRef as React.RefCallback<HTMLSelectElement>}
                        value={edit.waarde}
                        onChange={ev => setEdit(e => e ? { ...e, waarde: ev.target.value } : e)}
                        onBlur={saveEdit}
                        onKeyDown={onEditKey}
                        style={{
                          fontSize: 12, border: '1px solid var(--accent)', borderRadius: 4,
                          background: 'var(--bg-base)', color: 'var(--text-h)', padding: '2px 4px',
                        }}
                      >
                        {CATEGORIE_TYPES.map(v => <option key={v} value={v}>{typeLabel(v)}</option>)}
                      </select>
                    </td>
                  ) : (
                    <td style={{ cursor: 'pointer' }}
                      onClick={() => startEdit(r.id, 'type', r.type)}
                      title="Klik om te bewerken">
                      <span className="badge">{typeLabel(r.type)}</span>
                    </td>
                  )}

                  {/* Laatste gebruik: niet bewerkbaar */}
                  <td style={{ color: 'var(--text-dim)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {formatDatum(r.laatste_gebruik)}
                  </td>

                  <td>
                    <button onClick={() => handleDelete(r.id)} style={{
                      background: 'none', border: '1px solid var(--red)', color: 'var(--red)',
                      fontSize: 12, cursor: 'pointer', padding: '3px 10px', borderRadius: 4,
                    }}>
                      Verwijder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
