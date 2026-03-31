// FILE: page.tsx
// AANGEMAAKT: 25-03-2026 14:00
// VERSIE: 1
// GEWIJZIGD: 31-03-2026 22:00
//
// WIJZIGINGEN (31-03-2026 21:00):
// - Volledige herbouw: periodenavigatie, BLS-tabel, categorieoverzicht
// WIJZIGINGEN (31-03-2026 22:00):
// - BlsRegel interface aangepast aan nieuw endpoint formaat (bedrag, gedaanOpRekening, hoortOpRekening)
// - BLS tabel: categorie kolom toont [categorie] · [gedaanOpRekening] → [hoortOpRekening]
// - Categorieoverzicht sectie verwijderd (niet meer beschikbaar in nieuw formaat)

'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Periode } from '@/lib/maandperiodes';

const MAAND_NAMEN = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

interface BlsRegel {
  categorie: string;
  gedaanOpRekening: string;
  hoortOpRekening: string;
  bedrag: number;
  gecorrigeerd: number;
  saldo: number;
}

function formatBedrag(bedrag: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag);
}

const filterKnop = (actief: boolean): React.CSSProperties => ({
  padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
  fontWeight: actief ? 600 : 400,
  background: actief ? 'var(--accent)' : 'var(--bg-card)',
  color: actief ? '#fff' : 'var(--text-dim)',
  border: actief ? '1px solid transparent' : '1px solid var(--border)',
});

export default function DashboardPage() {
  const [periodes, setPeriodes]                   = useState<Periode[]>([]);
  const [geselecteerdePeriode, setGeselecteerdePeriode] = useState<Periode | null>(null);
  const [geselecteerdJaar, setGeselecteerdJaar]   = useState<number>(new Date().getFullYear());
  const [cumulatief, setCumulatief]               = useState(false);
  const [blsData, setBlsData]                     = useState<BlsRegel[]>([]);
  const [laadtPeriodes, setLaadtPeriodes]         = useState(true);
  const [laadtBls, setLaadtBls]                   = useState(false);
  const [fout, setFout]                           = useState('');

  // Periodes laden
  useEffect(() => {
    fetch('/api/periodes')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data: Periode[]) => {
        setPeriodes(data);
        const actueel = data.find(p => p.status === 'actueel') ?? data[data.length - 1] ?? null;
        if (actueel) {
          setGeselecteerdePeriode(actueel);
          setGeselecteerdJaar(actueel.jaar);
        }
      })
      .catch(() => setFout('Kon periodes niet ophalen.'))
      .finally(() => setLaadtPeriodes(false));
  }, []);

  // BLS data laden
  const laadBls = useCallback((periode: Periode | null, cum: boolean, allesPeriodes: Periode[]) => {
    if (!periode) return;
    setLaadtBls(true);
    setFout('');

    let datumVan = periode.start;
    if (cum) {
      const janPeriode = allesPeriodes.find(p => p.jaar === periode.jaar && p.maand === 1);
      datumVan = janPeriode ? janPeriode.start : `${periode.jaar}-01-01`;
    }
    const datumTot = periode.eind;

    fetch(`/api/dashboard/bls?datum_van=${datumVan}&datum_tot=${datumTot}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setBlsData)
      .catch(() => setFout('Kon BLS-data niet ophalen.'))
      .finally(() => setLaadtBls(false));
  }, []);

  useEffect(() => {
    if (geselecteerdePeriode) laadBls(geselecteerdePeriode, cumulatief, periodes);
  }, [geselecteerdePeriode, cumulatief, periodes, laadBls]);

  function handleJaar(jaar: number) {
    setGeselecteerdJaar(jaar);
    const periodesVoorJaar = periodes.filter(p => p.jaar === jaar);
    // Probeer zelfde maand te behouden
    const huidigeMaand = geselecteerdePeriode?.maand;
    const gevonden = huidigeMaand ? periodesVoorJaar.find(p => p.maand === huidigeMaand) : null;
    const nieuw = gevonden
      ?? periodesVoorJaar.filter(p => p.status !== 'toekomstig').slice(-1)[0]
      ?? periodesVoorJaar[0]
      ?? null;
    setGeselecteerdePeriode(nieuw);
  }

  const jaarOpties = [...new Set(periodes.map(p => p.jaar))].sort((a, b) => a - b);
  const periodesVoorJaar = periodes.filter(p => p.jaar === geselecteerdJaar);

  const totaalBedrag       = blsData.reduce((s, r) => s + r.bedrag, 0);
  const totaalGecorrigeerd = blsData.reduce((s, r) => s + r.gecorrigeerd, 0);
  const totaalSaldo        = blsData.reduce((s, r) => s + r.saldo, 0);

  const tdNum: React.CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        {geselecteerdePeriode && (
          <p>{cumulatief ? `jan t/m ` : ''}{MAAND_NAMEN[geselecteerdePeriode.maand - 1]} {geselecteerdePeriode.jaar}</p>
        )}
      </div>

      {fout && <div className="error-melding">{fout}</div>}

      {/* Periodenavigatie */}
      {!laadtPeriodes && (
        <div style={{ marginBottom: 20 }}>
          {/* Jaarknoppen */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {jaarOpties.map(jaar => (
              <button key={jaar} onClick={() => handleJaar(jaar)} style={filterKnop(geselecteerdJaar === jaar)}>
                {jaar}
              </button>
            ))}
          </div>

          {/* Maandknoppen + cumulatief toggle */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 6, flex: 1, minWidth: 0 }}>
              {periodesVoorJaar.map(p => {
                const geselecteerd = geselecteerdePeriode?.jaar === p.jaar && geselecteerdePeriode?.maand === p.maand;
                const toekomstig   = p.status === 'toekomstig';
                const actueel      = p.status === 'actueel';

                let bg: string, kleur: string, border: string, cursor: string, opacity: number;
                if (geselecteerd) {
                  bg = 'var(--accent)'; kleur = '#fff';
                  border = '1px solid transparent'; cursor = 'pointer'; opacity = 1;
                } else if (toekomstig) {
                  bg = 'var(--bg-card)'; kleur = 'var(--text-dim)';
                  border = '1px solid var(--border)'; cursor = 'not-allowed'; opacity = 0.3;
                } else if (actueel) {
                  bg = 'transparent'; kleur = 'var(--accent)';
                  border = '1px solid var(--accent)'; cursor = 'pointer'; opacity = 1;
                } else {
                  bg = 'var(--bg-card)'; kleur = 'var(--text-dim)';
                  border = '1px solid var(--border)'; cursor = 'pointer'; opacity = 1;
                }

                return (
                  <button
                    key={`${p.jaar}-${p.maand}`}
                    onClick={() => !toekomstig && setGeselecteerdePeriode(p)}
                    style={{
                      padding: '4px 0', borderRadius: 6, fontSize: 12, textAlign: 'center',
                      fontWeight: geselecteerd ? 600 : 400,
                      background: bg, color: kleur, border, cursor, opacity,
                      pointerEvents: toekomstig ? 'none' : 'auto',
                    }}
                  >
                    {MAAND_NAMEN[p.maand - 1]}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCumulatief(v => !v)}
              style={{
                ...filterKnop(cumulatief),
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Cumulatief
            </button>
          </div>
        </div>
      )}

      {/* BLS Sectie */}
      <p className="section-title">Balans Budgetten en Potjes</p>
      {laadtBls ? (
        <div className="loading">BLS-data wordt geladen…</div>
      ) : blsData.length === 0 && !fout ? (
        <div className="empty">Geen data voor deze periode.</div>
      ) : (
        <div className="table-wrapper" style={{ marginBottom: 36 }}>
          <table>
            <thead>
              <tr>
                <th>Categorie</th>
                <th style={{ textAlign: 'right' }}>Bedrag</th>
                <th style={{ textAlign: 'right' }}>Gecorrigeerd</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {blsData.map(rij => {
                const sleutel = `${rij.categorie}::${rij.gedaanOpRekening}`;
                const saldoKleur = rij.saldo >= 0 ? 'var(--green)' : 'var(--red)';
                return (
                  <tr key={sleutel}>
                    <td>
                      <strong>{rij.categorie}</strong>
                      <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                        {' '}·{' '}{rij.gedaanOpRekening}{' → '}{rij.hoortOpRekening}
                      </span>
                    </td>
                    <td style={tdNum}>{formatBedrag(rij.bedrag)}</td>
                    <td style={tdNum}>{rij.gecorrigeerd !== 0 ? formatBedrag(rij.gecorrigeerd) : <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
                    <td style={{ ...tdNum, color: saldoKleur, fontWeight: 600 }}>{formatBedrag(rij.saldo)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                <td>Totaal</td>
                <td style={tdNum}>{formatBedrag(totaalBedrag)}</td>
                <td style={tdNum}>{formatBedrag(totaalGecorrigeerd)}</td>
                <td style={{ ...tdNum, color: totaalSaldo >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatBedrag(totaalSaldo)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
