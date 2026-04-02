// FILE: page.tsx
// AANGEMAAKT: 25-03-2026 14:00
// VERSIE: 1
// GEWIJZIGD: 02-04-2026 20:00
//
// WIJZIGINGEN (02-04-2026 20:00):
// - BLS-tabel rijen klikbaar: klapt uit met subtabel van onderliggende transacties
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
// WIJZIGINGEN (01-04-2026 00:30):
// - BLS: totaalrij verwijderd
// - BLS: badges compacter (font 10px, padding 0/4px), pijl → ipv ──→, rij minder hoog
// - BLS: groen ✓ naast categorienaam bij saldo = 0
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

interface BlsTransactie {
  id: number;
  datum: string | null;
  naam_tegenpartij: string | null;
  omschrijving: string | null;
  bedrag: number | null;
  rekening_naam: string | null;
}

interface BlsRegel {
  categorie: string;
  gedaanOpRekening: string;
  hoortOpRekening: string;
  bedrag: number;
  gecorrigeerd: number;
  saldo: number;
  transacties: BlsTransactie[];
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
  const [openRijen, setOpenRijen]                 = useState<Set<string>>(new Set());
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
      .then((data: BlsRegel[]) => { setBlsData(data); setOpenRijen(new Set()); })
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
                const isOpen = openRijen.has(sleutel);
                const badge: React.CSSProperties = { fontSize: 10, borderRadius: 3, padding: '0px 4px', fontWeight: 500 };
                const toggleRij = () => setOpenRijen(prev => {
                  const next = new Set(prev);
                  if (next.has(sleutel)) next.delete(sleutel); else next.add(sleutel);
                  return next;
                });
                return (
                  <tr key={sleutel} style={{ cursor: 'default' }}>
                    <td colSpan={4} style={{ padding: 0 }}>
                      {/* Hoofdrij */}
                      <div onClick={toggleRij} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', cursor: 'pointer', borderLeft: `2px solid ${borderKleur(rij.saldo)}`, paddingLeft: 10, paddingTop: 6, paddingBottom: 6 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, color: 'var(--text-dim)', transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>
                            {rij.categorie}
                            {rij.saldo === 0 && <span style={{ color: 'var(--green)', fontSize: 12, fontWeight: 700 }}>✓</span>}
                          </div>
                          <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 16 }}>
                            <span style={{ ...badge, background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>{rij.gedaanOpRekening}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>→</span>
                            <span style={{ ...badge, background: 'var(--bg-base)', border: '1px solid var(--accent)', color: 'var(--accent)' }}>{rij.hoortOpRekening}</span>
                          </div>
                        </div>
                        <span style={{ ...tdNum, padding: '0 12px' }}>{formatBedrag(rij.bedrag)}</span>
                        <span style={{ ...tdNum, padding: '0 12px' }}>{rij.gecorrigeerd !== 0 ? formatBedrag(rij.gecorrigeerd) : '—'}</span>
                        <span style={{ ...tdNum, padding: '0 12px', color: saldoKleur(rij.saldo), fontWeight: 600 }}>{formatBedrag(rij.saldo)}</span>
                      </div>
                      {/* Subtabel */}
                      {isOpen && rij.transacties && rij.transacties.length > 0 && (
                        <div style={{ paddingLeft: 28, paddingRight: 8, paddingBottom: 8 }}>
                          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500 }}>Datum</th>
                                <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500 }}>Naam</th>
                                <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500 }}>Omschrijving</th>
                                <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 500 }}>Bedrag</th>
                                <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500 }}>Rekening</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rij.transacties.map(trx => (
                                <tr key={trx.id} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>
                                  <td style={{ padding: '3px 6px', whiteSpace: 'nowrap' }}>{trx.datum ?? '—'}</td>
                                  <td style={{ padding: '3px 6px' }}>{trx.naam_tegenpartij ?? '—'}</td>
                                  <td style={{ padding: '3px 6px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trx.omschrijving ?? '—'}</td>
                                  <td style={{ padding: '3px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{trx.bedrag != null ? formatBedrag(trx.bedrag) : '—'}</td>
                                  <td style={{ padding: '3px 6px' }}>{trx.rekening_naam ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
