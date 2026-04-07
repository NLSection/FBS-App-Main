'use client';

import { useEffect, useState, useCallback } from 'react';
import type { VastePostenOverzicht, VastePostItem, VastePostStatus } from '@/app/api/vaste-posten-overzicht/route';

const fmt = (n: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);

const fmtDatum = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'][m - 1]}`;
};

const STATUS: Record<VastePostStatus, { icoon: string; kleur: string }> = {
  ontvangen: { icoon: '✓',  kleur: 'var(--green)'  },
  'te-gaan': { icoon: '⏳', kleur: 'var(--yellow)' },
  afwezig:   { icoon: '!',  kleur: 'var(--red)'    },
};

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

interface NieuwePost { label: string; naam: string; iban: string; dag: string; bedrag: string; }

export default function VastePostenPage() {
  const [data, setData]   = useState<VastePostenOverzicht | null>(null);
  const [laadt, setLaadt] = useState(true);
  const [fout, setFout]   = useState('');
  // dag-bewerkstatus per sleutel
  const [dagEdit, setDagEdit] = useState<Record<string, string>>({});
  // buffer inline
  const [bufferEdit, setBufferEdit] = useState<string | null>(null);
  // nieuwe post form
  const [nieuw, setNieuw] = useState<NieuwePost>({ label: '', naam: '', iban: '', dag: '', bedrag: '' });

  const laden = useCallback(() => {
    setLaadt(true);
    fetch('/api/vaste-posten-overzicht')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((d: VastePostenOverzicht) => { setData(d); setLaadt(false); })
      .catch(() => { setFout('Kon vaste posten niet ophalen.'); setLaadt(false); });
  }, []);

  useEffect(() => { laden(); }, [laden]);

  // ── dag opslaan ────────────────────────────────────────────────────────────
  const slaaDagOp = async (item: VastePostItem, dagStr: string) => {
    const dag = parseInt(dagStr);
    if (isNaN(dag) || dag < 1 || dag > 31) { laden(); return; }

    if (item.configId) {
      await fetch(`/api/vaste-posten-config/${item.configId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iban: item.iban ?? '', naam: item.naam, omschrijving: null,
          label: item.label, verwachte_dag: dag, verwacht_bedrag: item.verwachtBedrag,
        }),
      });
    } else {
      await fetch('/api/vaste-posten-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iban: item.iban ?? '', naam: item.naam, label: item.label, verwachte_dag: dag }),
      });
    }
    laden();
  };

  // ── config verwijderen ─────────────────────────────────────────────────────
  const verwijderConfig = async (item: VastePostItem) => {
    if (!item.configId) return;
    await fetch(`/api/vaste-posten-config/${item.configId}`, { method: 'DELETE' });
    laden();
  };

  // ── buffer opslaan ─────────────────────────────────────────────────────────
  const slaBufferOp = async (val: string) => {
    const n = parseFloat(val.replace(',', '.'));
    setBufferEdit(null);
    if (!isNaN(n) && n >= 0) {
      await fetch('/api/instellingen', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vastePostenBuffer: n }),
      });
      laden();
    }
  };

  // ── nieuwe post toevoegen ──────────────────────────────────────────────────
  const voegPostToe = async () => {
    const dag = parseInt(nieuw.dag);
    if (!nieuw.label.trim() || !nieuw.naam.trim() || isNaN(dag) || dag < 1 || dag > 31) return;
    await fetch('/api/vaste-posten-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        iban: nieuw.iban.trim().toUpperCase() || '',
        naam: nieuw.naam.trim(),
        label: nieuw.label.trim(),
        verwachte_dag: dag,
        verwacht_bedrag: nieuw.bedrag ? parseFloat(nieuw.bedrag.replace(',', '.')) : null,
      }),
    });
    setNieuw({ label: '', naam: '', iban: '', dag: '', bedrag: '' });
    laden();
  };

  if (laadt) return <div className="loading">Vaste posten worden geladen…</div>;
  if (fout)  return <div className="empty" style={{ color: 'var(--red)' }}>{fout}</div>;
  if (!data) return null;

  const { items, totaalInkomsten, totaalUitgaven, nogTeGaan, vrijTeBesteden, buffer, periodeLabel, afwijkingDrempel } = data;

  const inputStijl: React.CSSProperties = {
    padding: '2px 6px', fontSize: 12, borderRadius: 4, border: '1px solid var(--border)',
    background: 'var(--bg)', color: 'var(--text)', width: '100%',
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h1 className="text-xl font-semibold" style={{ margin: 0 }}>Vaste Posten</h1>
        <span style={{
          fontSize: 12, padding: '2px 10px', borderRadius: 20,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          color: 'var(--text-dim)', fontWeight: 500,
        }}>{periodeLabel}</span>
      </div>

      {/* Tabel */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                <th style={{ width: 28, padding: '8px 8px 8px 14px' }} />
                <th style={{ textAlign: 'left',  padding: '8px 12px', color: 'var(--text-dim)', fontWeight: 500 }}>Post</th>
                <th style={{ textAlign: 'center',padding: '8px 8px',  color: 'var(--text-dim)', fontWeight: 500, width: 52 }}>Dag</th>
                <th style={{ textAlign: 'left',  padding: '8px 12px', color: 'var(--text-dim)', fontWeight: 500 }}>Datum</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-dim)', fontWeight: 500 }}>Bedrag</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-dim)', fontWeight: 500 }}>Gem.</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-dim)', fontWeight: 500 }}>Δ</th>
                <th style={{ width: 32 }} />
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const st = STATUS[item.status];
                const dagVal = dagEdit[item.sleutel] ?? (item.verwachteDag ? String(item.verwachteDag) : '');
                const bedrag = item.werkelijkBedrag;
                const bedragKleur = bedrag !== null ? (bedrag > 0 ? 'var(--green)' : bedrag < 0 ? 'var(--red)' : 'var(--text)') : 'var(--text-dim)';
                const afwijking = item.afwijkingProcent;

                return (
                  <tr key={item.sleutel} style={{ borderTop: '1px solid var(--border)' }}>
                    {/* Status */}
                    <td style={{ padding: '7px 8px 7px 14px', textAlign: 'center' }}>
                      <span title={item.status} style={{ color: st.kleur, fontWeight: 700, fontSize: 12 }}>{st.icoon}</span>
                    </td>

                    {/* Label + naam */}
                    <td style={{ padding: '7px 12px' }}>
                      <span style={{ color: 'var(--text-h)', fontWeight: 500 }}>{item.label}</span>
                      {item.naam !== item.label && (
                        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{item.naam}</div>
                      )}
                    </td>

                    {/* Dag — inline bewerkbaar */}
                    <td style={{ padding: '7px 4px', textAlign: 'center' }}>
                      <input
                        type="number"
                        min={1} max={31}
                        placeholder="—"
                        value={dagVal}
                        onChange={e => setDagEdit(prev => ({ ...prev, [item.sleutel]: e.target.value }))}
                        onBlur={e => { if (e.target.value !== String(item.verwachteDag ?? '')) slaaDagOp(item, e.target.value); }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
                        style={{ ...inputStijl, width: 44, textAlign: 'center', padding: '2px 4px' }}
                      />
                    </td>

                    {/* Datum */}
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                      {item.werkelijkeDatum
                        ? <span style={{ color: 'var(--text)' }}>{fmtDatum(item.werkelijkeDatum)}</span>
                        : item.verwachteDatum
                          ? <span style={{ color: 'var(--text-dim)' }}>{fmtDatum(item.verwachteDatum)}</span>
                          : <span style={{ color: 'var(--text-dim)' }}>—</span>
                      }
                    </td>

                    {/* Bedrag */}
                    <td style={{ padding: '7px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {bedrag !== null
                        ? <span style={{ color: bedragKleur, fontWeight: 600 }}>{fmt(bedrag)}</span>
                        : item.verwachtBedrag !== null
                          ? <span style={{ color: 'var(--text-dim)' }}>{fmt(item.verwachtBedrag)}</span>
                          : <span style={{ color: 'var(--text-dim)' }}>—</span>
                      }
                    </td>

                    {/* Historisch gem. */}
                    <td style={{ padding: '7px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      {item.historischGemiddelde !== null ? fmt(item.historischGemiddelde) : '—'}
                    </td>

                    {/* Afwijking */}
                    <td style={{ padding: '7px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {afwijking !== null && Math.abs(afwijking) > afwijkingDrempel
                        ? <span style={{ color: afwijking > 0 ? 'var(--red)' : 'var(--green)', fontSize: 11, fontWeight: 600 }}>
                            {afwijking > 0 ? '↑' : '↓'}{Math.abs(afwijking)}%
                          </span>
                        : <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>
                      }
                    </td>

                    {/* Config verwijder-knop */}
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                      {item.configId && (
                        <button
                          onClick={() => verwijderConfig(item)}
                          title="Verwachting verwijderen"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 2, display: 'flex' }}
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* ── Nieuwe post rij ─────────────────────────────────────── */}
              <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg)' }}>
                <td style={{ padding: '8px 8px 8px 14px', color: 'var(--text-dim)', fontSize: 12 }}>+</td>
                <td style={{ padding: '6px 12px 6px 12px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      placeholder="Label"
                      value={nieuw.label}
                      onChange={e => setNieuw(p => ({ ...p, label: e.target.value }))}
                      style={{ ...inputStijl, width: 100 }}
                    />
                    <input
                      placeholder="Naam tegenpartij"
                      value={nieuw.naam}
                      onChange={e => setNieuw(p => ({ ...p, naam: e.target.value }))}
                      style={{ ...inputStijl, width: 160 }}
                    />
                    <input
                      placeholder="IBAN (opt.)"
                      value={nieuw.iban}
                      onChange={e => setNieuw(p => ({ ...p, iban: e.target.value }))}
                      style={{ ...inputStijl, width: 160 }}
                    />
                  </div>
                </td>
                <td style={{ padding: '6px 4px' }}>
                  <input
                    type="number" min={1} max={31} placeholder="dag"
                    value={nieuw.dag}
                    onChange={e => setNieuw(p => ({ ...p, dag: e.target.value }))}
                    style={{ ...inputStijl, width: 44, textAlign: 'center', padding: '2px 4px' }}
                  />
                </td>
                <td />
                <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                  <input
                    placeholder="bedrag"
                    value={nieuw.bedrag}
                    onChange={e => setNieuw(p => ({ ...p, bedrag: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') voegPostToe(); }}
                    style={{ ...inputStijl, width: 90, textAlign: 'right' }}
                  />
                </td>
                <td />
                <td />
                <td style={{ padding: '6px 10px' }}>
                  <button
                    onClick={voegPostToe}
                    style={{
                      padding: '3px 10px', borderRadius: 4, fontSize: 12,
                      background: 'var(--accent)', color: '#fff', border: 'none',
                      cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
                    }}
                  >
                    Toevoegen
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Samenvatting */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Totale inkomsten', bedrag: totaalInkomsten, kleur: 'var(--green)' },
          { label: 'Totale uitgaven',  bedrag: totaalUitgaven,  kleur: 'var(--red)'   },
          { label: 'Nog te gaan',      bedrag: nogTeGaan,       kleur: undefined       },
        ].map(({ label, bedrag, kleur }) => (
          <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: kleur ?? 'var(--text-h)', fontVariantNumeric: 'tabular-nums' }}>{fmt(bedrag)}</div>
          </div>
        ))}

        {/* Buffer — inline bewerkbaar */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Buffer</div>
          {bufferEdit !== null
            ? <input
                autoFocus
                value={bufferEdit}
                onChange={e => setBufferEdit(e.target.value)}
                onBlur={e => slaBufferOp(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') slaBufferOp(bufferEdit); if (e.key === 'Escape') setBufferEdit(null); }}
                style={{ fontSize: 16, fontWeight: 700, width: 100, ...inputStijl }}
              />
            : <div
                onClick={() => setBufferEdit(String(buffer))}
                style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-h)', cursor: 'pointer', fontVariantNumeric: 'tabular-nums' }}
                title="Klik om aan te passen"
              >
                {fmt(buffer)} <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>✎</span>
              </div>
          }
        </div>

        {/* Vrij te besteden */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 140,
          border: `1px solid ${vrijTeBesteden >= 0 ? 'var(--green)' : 'var(--red)'}`,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Vrij te besteden</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: vrijTeBesteden >= 0 ? 'var(--green)' : 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(vrijTeBesteden)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>inkomsten − uitgaven − buffer</div>
        </div>
      </div>
    </div>
  );
}
