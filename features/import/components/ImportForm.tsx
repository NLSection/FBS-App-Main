// FILE: ImportForm.tsx
// AANGEMAAKT: 25-03-2026 10:30
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 02:00
//
// WIJZIGINGEN (03-04-2026 02:00):
// - Herbouwd: drag & drop zone, automatische import, voortgangsindicator, importgeschiedenis
// WIJZIGINGEN (30-03-2026 16:30):
// - categorie_id dropdown → categorie_ids checkboxes (many-to-many)
// WIJZIGINGEN (30-03-2026):
// - Modal voor onbekende rekeningen: toevoegen / negeren / permanent negeren per IBAN
// WIJZIGINGEN (25-03-2026 17:30):
// - Initiële aanmaak: formulier voor CSV-import met resultaatweergave

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  categorie_ids: number[];
}

interface Categorie { id: number; naam: string; }

interface ImportGeschiedenis {
  id: number;
  bestandsnaam: string;
  geimporteerd_op: string;
  aantal_transacties: number;
}

interface BestandStatus {
  naam: string;
  status: 'wacht' | 'bezig' | 'klaar' | 'fout';
  resultaat?: ImportResultaat;
  fout?: string;
}

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
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [bezig, setBezig] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [bestandStatussen, setBestandStatussen] = useState<BestandStatus[]>([]);
  const [fout, setFout] = useState<string | null>(null);

  const [onbekend, setOnbekend]               = useState<OnbekendeRekening[] | null>(null);
  const [keuzes, setKeuzes]                   = useState<RekeningKeuze[]>([]);
  const [opgeslagenBestanden, setOpgeslagenBestanden] = useState<File[]>([]);
  const [categorieen, setCategorieen]         = useState<Categorie[]>([]);
  const [geschiedenis, setGeschiedenis]       = useState<ImportGeschiedenis[]>([]);

  useEffect(() => {
    fetch('/api/budgetten-potjes').then(r => r.ok ? r.json() : []).then(setCategorieen).catch(() => {});
    laadGeschiedenis();
  }, []);

  function laadGeschiedenis() {
    fetch('/api/imports').then(r => r.ok ? r.json() : []).then(setGeschiedenis).catch(() => {});
  }

  const startImport = useCallback(async (bestanden: File[]) => {
    if (bestanden.length === 0 || bezig) return;
    setOpgeslagenBestanden(bestanden);
    setBestandStatussen(bestanden.map(b => ({ naam: b.name, status: 'bezig' })));
    setFout(null);

    const formData = new FormData();
    for (const b of bestanden) formData.append('files', b);
    await verstuurFormData(formData, bestanden);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bezig]);

  async function verstuurFormData(formData: FormData, bestanden: File[]) {
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch('/api/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setFout(data.error ?? 'Import mislukt.');
        setBestandStatussen(bestanden.map(b => ({ naam: b.name, status: 'fout', fout: data.error })));
      } else if (data.onbekendeRekeningen) {
        setOnbekend(data.onbekendeRekeningen);
        setKeuzes((data.onbekendeRekeningen as OnbekendeRekening[]).map(r => ({
          iban: r.iban, eersteTransactie: r.eersteTransactie,
          actie: 'toevoegen', naam: '', type: 'betaal', categorie_ids: [],
        })));
        setBestandStatussen(bestanden.map(b => ({ naam: b.name, status: 'wacht' })));
      } else {
        setOnbekend(null);
        const resultaten = data.resultaten as ImportResultaat[];
        setBestandStatussen(bestanden.map((b, i) => ({
          naam: b.name, status: 'klaar', resultaat: resultaten[i],
        })));
        laadGeschiedenis();
        router.refresh();
        const vd = data.vroegsteDatum as string | null;
        if (vd) {
          const d = new Date(vd);
          router.push(`/transacties?maand=${d.getFullYear()}-${d.getMonth() + 1}`);
        } else {
          router.push('/transacties');
        }
      }
    } catch {
      setFout('Verbindingsfout — import niet voltooid.');
      setBestandStatussen(bestanden.map(b => ({ naam: b.name, status: 'fout' })));
    } finally {
      setBezig(false);
    }
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
      .map(k => ({ iban: k.iban, naam: k.naam.trim(), type: k.type, categorie_ids: k.categorie_ids }));
    const genegeerd  = keuzes.filter(k => k.actie === 'negeren').map(k => k.iban);
    const permanent  = keuzes.filter(k => k.actie === 'permanent').map(k => k.iban);

    const formData = new FormData();
    for (const b of opgeslagenBestanden) formData.append('files', b);
    formData.append('bevestigdeRekeningen',    JSON.stringify(bevestigde));
    formData.append('genegeerdeIbans',         JSON.stringify(genegeerd));
    formData.append('permanentGenegeerdeIbans', JSON.stringify(permanent));
    setBestandStatussen(opgeslagenBestanden.map(b => ({ naam: b.name, status: 'bezig' })));
    await verstuurFormData(formData, opgeslagenBestanden);
  }

  function updateKeuze(iban: string, patch: Partial<RekeningKeuze>) {
    setKeuzes(prev => prev.map(k => k.iban === iban ? { ...k, ...patch } : k));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const bestanden = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
    if (bestanden.length > 0) startImport(bestanden);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const bestanden = e.target.files ? Array.from(e.target.files) : [];
    if (bestanden.length > 0) startImport(bestanden);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <>
      {/* Drag & drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !bezig && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 12,
          padding: '48px 24px',
          textAlign: 'center',
          cursor: bezig ? 'not-allowed' : 'pointer',
          background: dragOver ? 'rgba(99,102,241,0.06)' : 'var(--bg-card)',
          transition: 'all 0.2s',
          marginBottom: 24,
        }}
      >
        <input ref={inputRef} type="file" accept=".csv" multiple onChange={handleFileChange} style={{ display: 'none' }} />
        <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>&#8593;</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-h)', marginBottom: 4 }}>
          Sleep CSV bestanden hierheen
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          of klik om te bladeren
        </p>
      </div>

      {/* Foutmelding */}
      {fout && !onbekend && (
        <div style={{ background: 'rgba(220,53,69,0.1)', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--red)', fontSize: 13 }}>
          {fout}
        </div>
      )}

      {/* Bestandstatussen */}
      {bestandStatussen.length > 0 && (
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bestandStatussen.map((bs, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: bs.resultaat ? 10 : 0 }}>
                {bs.status === 'bezig' && <span style={{ color: 'var(--accent)', fontSize: 14 }}>&#9696;</span>}
                {bs.status === 'klaar' && <span style={{ color: 'var(--green)', fontSize: 14, fontWeight: 700 }}>&#10003;</span>}
                {bs.status === 'fout' && <span style={{ color: 'var(--red)', fontSize: 14, fontWeight: 700 }}>&#10007;</span>}
                {bs.status === 'wacht' && <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>&#8987;</span>}
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>{bs.naam}</span>
                {bs.status === 'bezig' && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Importeren…</span>}
              </div>

              {bs.resultaat && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  <Stat label="Nieuw" waarde={bs.resultaat.totaal - bs.resultaat.overgeslagen} kleur="var(--green)" />
                  <Stat label="Duplicaten" waarde={bs.resultaat.overgeslagen} kleur="var(--text-dim)" />
                  <Stat label="Gecategoriseerd" waarde={bs.resultaat.gecategoriseerd} kleur="var(--accent)" />
                  <Stat label="Ongecategoriseerd" waarde={bs.resultaat.ongecategoriseerd} kleur="var(--text-dim)" />
                </div>
              )}

              {bs.fout && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{bs.fout}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Importgeschiedenis */}
      {geschiedenis.length > 0 && (
        <div>
          <p className="section-title" style={{ marginBottom: 10 }}>Eerdere imports</p>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Bestand</th>
                  <th style={{ textAlign: 'right' }}>Transacties</th>
                </tr>
              </thead>
              <tbody>
                {geschiedenis.slice(0, 10).map(imp => (
                  <tr key={imp.id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-dim)', fontSize: 12 }}>
                      {new Date(imp.geimporteerd_op).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ fontSize: 13 }}>{imp.bestandsnaam}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{imp.aantal_transacties}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

                  <div style={{ display: 'flex', gap: 18, marginBottom: 14, flexWrap: 'wrap' }}>
                    {(['toevoegen', 'negeren', 'permanent'] as const).map(actie => (
                      <label key={actie} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer', color: 'var(--text-h)' }}>
                        <input type="radio" name={`actie-${k.iban}`} value={actie} checked={k.actie === actie} onChange={() => updateKeuze(k.iban, { actie })} />
                        {actie === 'toevoegen' ? 'Toevoegen' : actie === 'negeren' ? 'Negeren (eenmalig)' : 'Permanent negeren'}
                      </label>
                    ))}
                  </div>

                  {k.actie === 'toevoegen' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={labelStyle}>Naam *</label>
                        <input style={fieldStyle} value={k.naam} onChange={e => updateKeuze(k.iban, { naam: e.target.value })} placeholder="Eigen omschrijving" />
                      </div>
                      <div>
                        <label style={labelStyle}>Type</label>
                        <select style={fieldStyle} value={k.type} onChange={e => updateKeuze(k.iban, { type: e.target.value as 'betaal' | 'spaar' })}>
                          <option value="betaal">Betaalrekening</option>
                          <option value="spaar">Spaarrekening</option>
                        </select>
                      </div>
                      {categorieen.length > 0 && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={labelStyle}>Koppel aan categorieën (optioneel)</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginTop: 4 }}>
                            {categorieen.filter(c => c.naam !== 'Aangepast' && c.naam !== 'Omboekingen').map(c => (
                              <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-h)', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={k.categorie_ids.includes(c.id)}
                                  onChange={e => updateKeuze(k.iban, {
                                    categorie_ids: e.target.checked ? [...k.categorie_ids, c.id] : k.categorie_ids.filter(id => id !== c.id),
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
                onClick={() => { setOnbekend(null); setFout(null); setBestandStatussen([]); }}
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

function Stat({ label, waarde, kleur }: { label: string; waarde: number; kleur: string }) {
  return (
    <div style={{ background: 'var(--bg-base)', borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: kleur, fontVariantNumeric: 'tabular-nums' }}>{waarde}</div>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  );
}
