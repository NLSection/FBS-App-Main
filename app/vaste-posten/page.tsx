// FILE: page.tsx (vaste-lasten)
// AANGEMAAKT: 03-04-2026 19:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 19:00
//
// WIJZIGINGEN (03-04-2026 19:00):
// - Initiële aanmaak: vaste posten overzicht pagina met kaarten per subcategorie

'use client';

import { useEffect, useState } from 'react';

interface PeriodeData {
  bedrag: number | null;
  afwijking: number | null;
  afwezig: boolean;
}

interface VastePostenItem {
  naam: string;
  periodes: Record<string, PeriodeData>;
}

interface VastePostenGroep {
  subcategorie: string;
  items: VastePostenItem[];
}

interface VastePostenData {
  periodes: string[];
  afwijkingDrempel: number;
  groepen: VastePostenGroep[];
}

function formatBedrag(bedrag: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag);
}

function celAchtergrond(data: PeriodeData, drempel: number): string {
  if (data.afwezig) return 'rgba(240, 82, 82, 0.2)';
  if (data.afwijking !== null && data.afwijking > drempel) return 'rgba(240, 82, 82, 0.1)';
  if (data.afwijking !== null && data.afwijking < -drempel) return 'rgba(64, 201, 110, 0.1)';
  return 'transparent';
}

export default function VastePostenPage() {
  const [data, setData] = useState<VastePostenData | null>(null);
  const [laadt, setLaadt] = useState(true);
  const [fout, setFout] = useState('');

  useEffect(() => {
    fetch('/api/vaste-posten-overzicht')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((d: VastePostenData) => setData(d))
      .catch(() => setFout('Kon vaste posten data niet ophalen.'))
      .finally(() => setLaadt(false));
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <h1 className="text-xl font-semibold" style={{ marginBottom: 8 }}>Vaste Posten</h1>

      {laadt ? (
        <div className="loading">Vaste lasten worden geladen…</div>
      ) : fout ? (
        <div className="empty" style={{ color: 'var(--red)' }}>{fout}</div>
      ) : !data || data.groepen.length === 0 ? (
        <div className="empty">Geen vaste posten data beschikbaar.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {data.groepen.map(groep => (
            <div key={groep.subcategorie} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-h)' }}>{groep.subcategorie}</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-dim)', fontWeight: 500, whiteSpace: 'nowrap' }}>Naam</th>
                      {data.periodes.map(p => (
                        <th key={p} style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-dim)', fontWeight: 500, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{p}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groep.items.map(item => (
                      <tr key={item.naam} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 12px', color: 'var(--text)', whiteSpace: 'nowrap' }}>{item.naam}</td>
                        {data.periodes.map((p, idx) => {
                          const cel = item.periodes[p] ?? { bedrag: null, afwijking: null, afwezig: true };
                          const bg = celAchtergrond(cel, data.afwijkingDrempel);
                          const isEerste = idx === 0;
                          return (
                            <td key={p} style={{ padding: '6px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', background: bg }}>
                              {cel.afwezig ? (
                                <span style={{ color: 'var(--red)' }}>–</span>
                              ) : (
                                <span style={{ color: 'var(--text)' }}>
                                  {formatBedrag(cel.bedrag!)}
                                  {!isEerste && cel.afwijking !== null && Math.abs(cel.afwijking) > data.afwijkingDrempel && (
                                    <span style={{ marginLeft: 4, fontSize: 10, color: cel.afwijking > 0 ? 'var(--red)' : 'var(--green)' }}>
                                      {cel.afwijking > 0 ? '↑' : '↓'}
                                    </span>
                                  )}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
