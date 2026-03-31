// FILE: page.tsx
// AANGEMAAKT: 25-03-2026 14:00
// VERSIE: 1
// GEWIJZIGD: 31-03-2026 23:59
//
// WIJZIGINGEN (31-03-2026 21:00):
// - Volledige herbouw: periodenavigatie, BLS-tabel, categorieoverzicht
// WIJZIGINGEN (31-03-2026 22:00):
// - BlsRegel interface aangepast aan nieuw endpoint formaat (bedrag, gedaanOpRekening, hoortOpRekening)
// - BLS tabel: categorie kolom toont [categorie] · [gedaanOpRekening] → [hoortOpRekening]
// WIJZIGINGEN (31-03-2026 23:00):
// - Totaalrij verwijderd uit BLS-tabel
// - Cumulatief toggle vervangen door Alle knop; layout gelijkgetrokken met TransactiesTabel
// - Alle modus: BLS laadt over heel geselecteerd jaar ipv één maand
// - Categorieoverzicht sectie verwijderd (niet meer beschikbaar in nieuw formaat)
// WIJZIGINGEN (31-03-2026 23:59):
// - BLS tabel: twee-laags rijen (categorienaam + badge-pijlvisualisatie)
// - Saldo kleur: groen >0, rood <0, grijs =0
// - Linkerborder per rij: groen bij saldo=0, rood bij saldo≠0
// - Totaalrij terug met dezelfde saldo-kleurlogica

'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Periode } from '@/lib/maandperiodes';

const MAAND_NAMEN = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];
const MAAND_KORT  = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

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
  const laadBls = useCallback((periode: Periode | null, jaar: number, allesPeriodes: Periode[]) => {
    setLaadtBls(true);
    setFout('');

    let datumVan: string, datumTot: string;
    if (periode) {
      datumVan = periode.start;
      datumTot = periode.eind;
    } else {
      // Alle modus: heel jaar
      const jaarPeriodes = allesPeriodes.filter(p => p.jaar === jaar && p.status !== 'toekomstig');
      if (jaarPeriodes.length === 0) { setLaadtBls(false); return; }
      datumVan = jaarPeriodes[0].start;
      datumTot = jaarPeriodes[jaarPeriodes.length - 1].eind;
    }

    fetch(`/api/dashboard/bls?datum_van=${datumVan}&datum_tot=${datumTot}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setBlsData)
      .catch(() => setFout('Kon BLS-data niet ophalen.'))
      .finally(() => setLaadtBls(false));
  }, []);

  useEffect(() => {
    laadBls(geselecteerdePeriode, geselecteerdJaar, periodes);
  }, [geselecteerdePeriode, geselecteerdJaar, periodes, laadBls]);

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

  const tdNum: React.CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

  const totaalBedrag       = blsData.reduce((s, r) => s + r.bedrag, 0);
  const totaalGecorrigeerd = blsData.reduce((s, r) => s + r.gecorrigeerd, 0);
  const totaalSaldo        = blsData.reduce((s, r) => s + r.saldo, 0);

  function saldoKleur(saldo: number) {
    return saldo > 0 ? 'var(--green)' : saldo < 0 ? 'var(--red)' : 'var(--text-dim)';
  }
  function borderKleur(saldo: number) {
    return saldo === 0 ? 'var(--green)' : 'var(--red)';
  }

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>
          {geselecteerdePeriode
            ? `${MAAND_NAMEN[geselecteerdePeriode.maand - 1].toLowerCase()} ${geselecteerdePeriode.jaar}`
            : `${geselecteerdJaar} — alle maanden`}
        </p>
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

          {/* Maandknoppen */}
          {periodesVoorJaar.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(12, 1fr)', gap: 6, marginBottom: 0 }}>
              <button
                onClick={() => setGeselecteerdePeriode(null)}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 12, textAlign: 'center',
                  fontWeight: !geselecteerdePeriode ? 600 : 400,
                  background: !geselecteerdePeriode ? 'var(--accent)' : 'var(--bg-card)',
                  color: !geselecteerdePeriode ? '#fff' : 'var(--text-dim)',
                  border: !geselecteerdePeriode ? '1px solid transparent' : '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                Alle
              </button>
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
                    <span className="maand-vol">{MAAND_NAMEN[p.maand - 1]}</span>
                    <span className="maand-kort">{MAAND_KORT[p.maand - 1]}</span>
                  </button>
                );
              })}
            </div>
          )}
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
                const badgeBase: React.CSSProperties = { fontSize: 11, borderRadius: 4, padding: '1px 6px', fontWeight: 500 };
                return (
                  <tr key={sleutel}>
                    <td style={{ borderLeft: `2px solid ${borderKleur(rij.saldo)}`, paddingLeft: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-h)' }}>{rij.categorie}</div>
                      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ ...badgeBase, background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>{rij.gedaanOpRekening}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>──→</span>
                        <span style={{ ...badgeBase, background: 'var(--bg-base)', border: '1px solid var(--accent)', color: 'var(--accent)' }}>{rij.hoortOpRekening}</span>
                      </div>
                    </td>
                    <td style={tdNum}>{formatBedrag(rij.bedrag)}</td>
                    <td style={tdNum}>{rij.gecorrigeerd !== 0 ? formatBedrag(rij.gecorrigeerd) : <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
                    <td style={{ ...tdNum, color: saldoKleur(rij.saldo), fontWeight: 600 }}>{formatBedrag(rij.saldo)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                <td style={{ borderLeft: `2px solid ${borderKleur(totaalSaldo)}`, paddingLeft: 10 }}>Totaal</td>
                <td style={tdNum}>{formatBedrag(totaalBedrag)}</td>
                <td style={tdNum}>{formatBedrag(totaalGecorrigeerd)}</td>
                <td style={{ ...tdNum, color: saldoKleur(totaalSaldo), fontWeight: 700 }}>{formatBedrag(totaalSaldo)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
