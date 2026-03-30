// FILE: ImportForm.tsx
// AANGEMAAKT: 25-03-2026 10:30
// VERSIE: 1
// GEWIJZIGD: 30-03-2026 16:30
//
// WIJZIGINGEN (25-03-2026 17:30):
// - Initiële aanmaak: formulier voor CSV-import met resultaatweergave
// - overgeslagen-teller toegevoegd aan resultaatweergave
// - gecategoriseerd + ongecategoriseerd toegevoegd aan resultaatweergave
// WIJZIGINGEN (25-03-2026 18:30):
// - ImportResultaat bijgewerkt naar nieuw type systeem
// WIJZIGINGEN (30-03-2026):
// - Modal voor onbekende rekeningen: toevoegen / negeren / permanent negeren per IBAN
// - Herhaalde aanroep met bevestigde keuzes na modal-bevestiging
// WIJZIGINGEN (30-03-2026 16:30):
// - categorie_id dropdown → categorie_ids checkboxes (many-to-many)
// - "Koppel aan budget" → "Koppel aan categorieën"

'use client';

import { useEffect, useRef, useState } from 'react';

interface ImportResultaat {
  importId: number;
  aantalNormaalAf: number;
  aantalNormaalBij: number;
  aantalOmboekingAf: number;
  aantalOmboekingBij: number;
  totaal: number;
  overgeslagen: number;
  gecategoriseerd: number;
  ongecategoriseerd: number;
}

interface OnbekendeRekening {
  iban: string;
  eersteTransactie: string | null;
}

interface RekeningKeuze {
  iban: string;
  eersteTransactie: string | null;
  actie: 'toevoegen' | 'negeren' | 'permanent';
  naam: string;
  type: 'betaal' | 'spaar';
  beheerd: boolean;
  categorie_ids: number[];
}

interface Categorie { id: number; naam: string; }

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-base)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '6px 8px',
  fontSize: 13,
  color: 'var(--text-h)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: 'var(--text-dim)',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

export default function ImportForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [bezig, setBezig] = useState(false);
  const [resultaten, setResultaten] = useState<ImportResultaat[] | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  const [onbekend, setOnbekend]               = useState<OnbekendeRekening[] | null>(null);
  const [keuzes, setKeuzes]                   = useState<RekeningKeuze[]>([]);
  const [opgeslagenBestanden, setOpgeslagenBestanden] = useState<File[]>([]);
  const [categorieen, setCategorieen] = useState<Categorie[]>([]);

  useEffect(() => {
    fetch('/api/budgetten-potjes')
      .then(r => r.ok ? r.json() : [])
      .then((data: Categorie[]) => setCategorieen(data))
      .catch(() => {});
  }, []);

  async function verstuurFormData(formData: FormData) {
    setBezig(true);
    setFout(null);
    setResultaten(null);
    try {
      const res = await fetch('/api/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setFout(data.error ?? 'Import mislukt.');
      } else if (data.onbekendeRekeningen) {
        setOnbekend(data.onbekendeRekeningen);
        setKeuzes((data.onbekendeRekeningen as OnbekendeRekening[]).map(r => ({
          iban: r.iban,
          eersteTransactie: r.eersteTransactie,
          actie: 'toevoegen',
          naam: '',
          type: 'betaal',
          beheerd: true,
          categorie_ids: [],
        })));
      } else {
        setOnbekend(null);
        setResultaten(data.resultaten);
      }
    } catch {
      setFout('Verbindingsfout — import niet voltooid.');
    } finally {
      setBezig(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const bestanden = inputRef.current?.files;
    if (!bestanden || bestanden.length === 0) {
      setFout('Selecteer minimaal één CSV-bestand.');
      return;
    }
    const files = Array.from(bestanden);
    setOpgeslagenBestanden(files);
    const formData = new FormData();
    for (const b of files) formData.append('files', b);
    await verstuurFormData(formData);
  }

  async function handleBevestig() {
    for (const k of keuzes) {
      if (k.actie === 'toevoegen' && !k.naam.trim()) {
        setFout(`Vul een naam in voor ${k.iban}.`);
        return;
      }
    }
    setFout(null);

    const bevestigde = keuzes
      .filter(k => k.actie === 'toevoegen')
      .map(k => ({ iban: k.iban, naam: k.naam.trim(), type: k.type, beheerd: k.beheerd ? 1 : 0, categorie_ids: k.categorie_ids }));
    const genegeerd  = keuzes.filter(k => k.actie === 'negeren').map(k => k.iban);
    const permanent  = keuzes.filter(k => k.actie === 'permanent').map(k => k.iban);

    const formData = new FormData();
    for (const b of opgeslagenBestanden) formData.append('files', b);
    formData.append('bevestigdeRekeningen',    JSON.stringify(bevestigde));
    formData.append('genegeerdeIbans',         JSON.stringify(genegeerd));
    formData.append('permanentGenegeerdeIbans', JSON.stringify(permanent));
    await verstuurFormData(formData);
  }

  function updateKeuze(iban: string, patch: Partial<RekeningKeuze>) {
    setKeuzes(prev => prev.map(k => k.iban === iban ? { ...k, ...patch } : k));
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">CSV-bestanden</label>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            multiple
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
          />
        </div>

        <button
          type="submit"
          disabled={bezig}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {bezig ? 'Importeren…' : 'Importeer'}
        </button>

        {fout && !onbekend && (
          <p role="alert" className="text-red-600 text-sm">{fout}</p>
        )}

        {resultaten && (
          <ul className="text-sm space-y-2">
            {resultaten.map((r) => (
              <li key={r.importId} className="border rounded p-3 bg-green-50">
                <p className="font-medium mb-1">
                  Import #{r.importId} — {r.totaal - r.overgeslagen} opgeslagen
                  {r.overgeslagen > 0 && (
                    <span className="ml-2 text-yellow-700 font-normal">({r.overgeslagen} overgeslagen)</span>
                  )}
                </p>
                <ul className="space-y-0.5 text-gray-600">
                  <li>Normaal AF: {r.aantalNormaalAf}</li>
                  <li>Normaal BIJ: {r.aantalNormaalBij}</li>
                  <li>Omboeking AF: {r.aantalOmboekingAf}</li>
                  <li>Omboeking BIJ: {r.aantalOmboekingBij}</li>
                </ul>
                <ul className="space-y-0.5 text-gray-500 text-xs mt-1 pt-1 border-t border-gray-200">
                  <li>Gecategoriseerd: {r.gecategoriseerd}</li>
                  <li>Ongecategoriseerd: {r.ongecategoriseerd}</li>
                </ul>
              </li>
            ))}
          </ul>
        )}
      </form>

      {/* Modal: onbekende rekeningen */}
      {onbekend && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
            padding: 28, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto',
          }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-h)', marginBottom: 4 }}>
              Onbekende rekeningen gevonden
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 20 }}>
              Maak per rekening een keuze voordat de import wordt doorgezet.
            </p>

            {fout && (
              <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{fout}</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {keuzes.map(k => (
                <div key={k.iban} style={{
                  background: 'var(--bg-base)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: 16,
                }}>
                  <p style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'var(--text-h)', marginBottom: 2 }}>
                    {k.iban}
                  </p>
                  {k.eersteTransactie && (
                    <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
                      {k.eersteTransactie}
                    </p>
                  )}

                  {/* Actie */}
                  <div style={{ display: 'flex', gap: 18, marginBottom: 14, flexWrap: 'wrap' }}>
                    {(['toevoegen', 'negeren', 'permanent'] as const).map(actie => (
                      <label key={actie} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer', color: 'var(--text-h)' }}>
                        <input
                          type="radio"
                          name={`actie-${k.iban}`}
                          value={actie}
                          checked={k.actie === actie}
                          onChange={() => updateKeuze(k.iban, { actie })}
                        />
                        {actie === 'toevoegen' ? 'Toevoegen' : actie === 'negeren' ? 'Negeren (eenmalig)' : 'Permanent negeren'}
                      </label>
                    ))}
                  </div>

                  {k.actie === 'toevoegen' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={labelStyle}>Naam *</label>
                        <input
                          style={fieldStyle}
                          value={k.naam}
                          onChange={e => updateKeuze(k.iban, { naam: e.target.value })}
                          placeholder="Eigen omschrijving"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Type</label>
                        <select
                          style={fieldStyle}
                          value={k.type}
                          onChange={e => updateKeuze(k.iban, { type: e.target.value as 'betaal' | 'spaar' })}
                        >
                          <option value="betaal">Betaalrekening</option>
                          <option value="spaar">Spaarrekening</option>
                        </select>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={k.beheerd}
                            onChange={e => updateKeuze(k.iban, { beheerd: e.target.checked })}
                          />
                          <span style={{ color: 'var(--text-dim)' }}>Samenvoegen onder Beheerde Rekeningen</span>
                        </label>
                      </div>
                      {categorieen.length > 0 && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={labelStyle}>Koppel aan categorieën (optioneel)</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginTop: 4 }}>
                            {categorieen.map(c => (
                              <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-h)', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={k.categorie_ids.includes(c.id)}
                                  onChange={e => updateKeuze(k.iban, {
                                    categorie_ids: e.target.checked
                                      ? [...k.categorie_ids, c.id]
                                      : k.categorie_ids.filter(id => id !== c.id),
                                  })}
                                />
                                {c.naam}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => { setOnbekend(null); setFout(null); }}
                disabled={bezig}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', borderRadius: 6, padding: '8px 18px', fontSize: 13, cursor: bezig ? 'not-allowed' : 'pointer' }}
              >
                Annuleer
              </button>
              <button
                onClick={handleBevestig}
                disabled={bezig}
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: bezig ? 'not-allowed' : 'pointer', opacity: bezig ? 0.6 : 1 }}
              >
                {bezig ? 'Bezig…' : 'Bevestigen en importeren'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
