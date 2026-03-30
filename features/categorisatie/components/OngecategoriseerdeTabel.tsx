// FILE: OngecategoriseerdeTabel.tsx
// AANGEMAAKT: 25-03-2026 17:30
// VERSIE: 1
// GEWIJZIGD: 25-03-2026 21:00
//
// WIJZIGINGEN (25-03-2026 17:30):
// - Initiële aanmaak: tabel met ongecategoriseerde transacties + inline categorisatieformulier
// WIJZIGINGEN (25-03-2026 19:30):
// - Categorie invoerveld gebruikt datalist met budgetten_potjes als suggesties
// WIJZIGINGEN (25-03-2026 21:00):
// - Categorie en Subcategorie kolommen toegevoegd aan tabel
// - Subcategorie als .badge-outline; Ongecategoriseerd als .badge-outline-red

'use client';

import { Fragment, useEffect, useState, useCallback } from 'react';
import type { CategorieType } from '@/lib/categorisatie';

interface BudgetPotjeNaam { id: number; naam: string; beschermd: number; }

interface RijtjeTransactie {
  id: number;
  datum: string | null;
  naam_tegenpartij: string | null;
  bedrag: number | null;
  omschrijving_1: string | null;
  tegenrekening_iban_bban: string | null;
  type: string;
  categorie: string | null;
  subcategorie: string | null;
}

interface FormState {
  categorie: string;
  subcategorie: string;
  type: CategorieType;
  slaIbanOp: boolean;
  slaOmschrOp: boolean;
}

const leegForm = (): FormState => ({
  categorie: '', subcategorie: '', type: 'alle',
  slaIbanOp: true, slaOmschrOp: false,
});

function bedragKleur(b: number | null) {
  if (b == null) return 'var(--text-dim)';
  return b < 0 ? 'var(--red)' : 'var(--green)';
}

function formatBedrag(b: number | null) {
  if (b == null) return '—';
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(b);
}

export default function OngecategoriseerdeTabel() {
  const [rijen, setRijen] = useState<RijtjeTransactie[]>([]);
  const [budgettenPotjes, setBudgettenPotjes] = useState<BudgetPotjeNaam[]>([]);
  const [bezig, setBezig] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [forms, setForms] = useState<Record<number, FormState>>({});
  const [opslaanBezig, setOpslaanBezig] = useState<Record<number, boolean>>({});
  const [fouten, setFouten] = useState<Record<number, string>>({});

  const laadTransacties = useCallback(async () => {
    setBezig(true);
    const res = await fetch('/api/transacties?status=nieuw');
    if (res.ok) setRijen(await res.json());
    setBezig(false);
  }, []);

  useEffect(() => { laadTransacties(); }, [laadTransacties]);

  useEffect(() => {
    fetch('/api/budgetten-potjes')
      .then(r => r.ok ? r.json() : [])
      .then(setBudgettenPotjes);
  }, []);

  function toggleRij(id: number) {
    setExpandedId(prev => prev === id ? null : id);
    setForms(f => ({ ...f, [id]: f[id] ?? leegForm() }));
    setFouten(f => { const n = { ...f }; delete n[id]; return n; });
  }

  function setFormVeld<K extends keyof FormState>(id: number, veld: K, waarde: FormState[K]) {
    setForms(f => ({ ...f, [id]: { ...(f[id] ?? leegForm()), [veld]: waarde } }));
  }

  async function handleOpslaan(t: RijtjeTransactie) {
    const form = forms[t.id] ?? leegForm();
    if (!form.categorie.trim()) {
      setFouten(f => ({ ...f, [t.id]: 'Categorie is verplicht.' }));
      return;
    }

    setOpslaanBezig(b => ({ ...b, [t.id]: true }));
    setFouten(f => { const n = { ...f }; delete n[t.id]; return n; });

    // 1. Categorieregel aanmaken
    const regelRes = await fetch('/api/categorieen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        iban:            form.slaIbanOp  ? (t.tegenrekening_iban_bban ?? null) : null,
        naam_origineel:  t.naam_tegenpartij ?? null,
        omschrijving_raw:form.slaOmschrOp ? (t.omschrijving_1 ?? null) : null,
        categorie:       form.categorie.trim(),
        subcategorie:    form.subcategorie.trim() || null,
        type:            form.type,
      }),
    });

    if (!regelRes.ok) {
      const d = await regelRes.json();
      setFouten(f => ({ ...f, [t.id]: d.error ?? 'Categorieregel opslaan mislukt.' }));
      setOpslaanBezig(b => ({ ...b, [t.id]: false }));
      return;
    }

    const { id: categorieId } = await regelRes.json();

    // 2. Transactie bijwerken
    const trRes = await fetch(`/api/transacties/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categorie_id: categorieId, status: 'verwerkt' }),
    });

    setOpslaanBezig(b => ({ ...b, [t.id]: false }));

    if (!trRes.ok) {
      setFouten(f => ({ ...f, [t.id]: 'Transactie bijwerken mislukt.' }));
      return;
    }

    // Rij verwijderen uit tabel
    setRijen(r => r.filter(x => x.id !== t.id));
    setExpandedId(null);
  }

  const inputCls = 'w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1.5 text-sm text-[var(--text-h)] focus:outline-none focus:border-[var(--accent)]';

  if (bezig) return <p className="loading">Laden…</p>;
  if (rijen.length === 0) return (
    <p className="empty">Alle transacties zijn gecategoriseerd.</p>
  );

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th style={{ width: '8%' }}>Datum</th>
            <th style={{ width: '20%' }}>Naam tegenpartij</th>
            <th style={{ width: '8%' }}>Bedrag</th>
            <th style={{ width: '22%' }}>Omschrijving</th>
            <th style={{ width: '14%' }}>Categorie</th>
            <th style={{ width: '14%' }}>Subcategorie</th>
            <th style={{ width: '14%' }}></th>
          </tr>
        </thead>
        <tbody>
          {rijen.map(t => (
            <Fragment key={t.id}>
              <tr>
                <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{t.datum ?? '—'}</td>
                <td style={{ color: 'var(--text-h)', fontWeight: 500 }}>{t.naam_tegenpartij ?? '—'}</td>
                <td style={{ color: bedragKleur(t.bedrag), fontWeight: 600 }}>{formatBedrag(t.bedrag)}</td>
                <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{t.omschrijving_1 ?? '—'}</td>
                <td>
                  {t.categorie
                    ? <span className="badge">{t.categorie}</span>
                    : <span className="badge-outline-red">Ongecategoriseerd</span>}
                </td>
                <td>
                  {t.subcategorie
                    ? <span className="badge-outline">{t.subcategorie}</span>
                    : <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>}
                </td>
                <td>
                  <button onClick={() => toggleRij(t.id)} style={{
                    background: expandedId === t.id ? 'var(--accent-dim)' : 'none',
                    border: '1px solid var(--border)', borderRadius: 5,
                    color: 'var(--accent)', fontSize: 12, fontWeight: 600,
                    padding: '3px 10px', cursor: 'pointer',
                  }}>
                    {expandedId === t.id ? 'Sluiten' : 'Categoriseer'}
                  </button>
                </td>
              </tr>

              {expandedId === t.id && (
                <tr style={{ background: 'var(--bg-surface)' }}>
                  <td colSpan={7} style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Categorie *</label>
                        <input
                          className={inputCls}
                          list={`bp-lijst-${t.id}`}
                          value={forms[t.id]?.categorie ?? ''}
                          onChange={e => setFormVeld(t.id, 'categorie', e.target.value)}
                          placeholder="Kies of typ een categorie" />
                        <datalist id={`bp-lijst-${t.id}`}>
                          {budgettenPotjes.map(bp => (
                            <option key={bp.id} value={bp.naam} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Subcategorie</label>
                        <input className={inputCls}
                          value={forms[t.id]?.subcategorie ?? ''}
                          onChange={e => setFormVeld(t.id, 'subcategorie', e.target.value)}
                          placeholder="Supermarkt" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Type</label>
                        <select className={inputCls}
                          value={forms[t.id]?.type ?? 'alle'}
                          onChange={e => setFormVeld(t.id, 'type', e.target.value as CategorieType)}>
                          <option value="alle">Alle</option>
                          <option value="normaal-af">Normaal af</option>
                          <option value="normaal-bij">Normaal bij</option>
                          <option value="omboeking-af">Omboeking af</option>
                          <option value="omboeking-bij">Omboeking bij</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 18 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>
                          <input type="checkbox"
                            checked={forms[t.id]?.slaIbanOp ?? true}
                            onChange={e => setFormVeld(t.id, 'slaIbanOp', e.target.checked)} />
                          Sla IBAN op als matchregel
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>
                          <input type="checkbox"
                            checked={forms[t.id]?.slaOmschrOp ?? false}
                            onChange={e => setFormVeld(t.id, 'slaOmschrOp', e.target.checked)} />
                          Sla omschrijving op als matchregel
                        </label>
                      </div>
                    </div>
                    {fouten[t.id] && (
                      <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{fouten[t.id]}</p>
                    )}
                    <button
                      onClick={() => handleOpslaan(t)}
                      disabled={opslaanBezig[t.id]}
                      style={{
                        background: 'var(--accent)', color: '#fff', border: 'none',
                        borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600,
                        cursor: opslaanBezig[t.id] ? 'not-allowed' : 'pointer',
                        opacity: opslaanBezig[t.id] ? 0.6 : 1,
                      }}>
                      {opslaanBezig[t.id] ? 'Opslaan…' : 'Opslaan & volgende'}
                    </button>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
