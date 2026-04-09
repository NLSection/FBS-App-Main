'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

/* ── Types ──────────────────────────────────────────────────────── */

interface TrendPanel {
  id: number;
  titel: string;
  databron: 'saldo' | 'uitgaven' | 'inkomsten';
  grafiek_type: 'lijn' | 'staaf';
  weergave: 'per_maand' | 'cumulatief';
  toon_jaarknoppen: boolean;
  toon_maandknoppen: boolean;
  toon_alle_jaren: boolean;
  volgorde: number;
  items: { id: number; panel_id: number; item_type: string; item_id: number }[];
}

interface Serie { id: number; naam: string; kleur: string | null; data: (number | null)[] }
interface TrendData { series: Serie[]; maanden: string[] }

interface Rekening { id: number; naam: string; kleur: string | null; type: string }
interface Subcategorie { id: number; categorie: string; naam: string }

/* ── Constanten ─────────────────────────────────────────────────── */

const MAAND_KORT = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
const FALLBACK_KLEUREN = ['#5c7cfa', '#9b6ffa', '#4caf50', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6'];

function fmt(val: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
}

/* ── PanelChart component ───────────────────────────────────────── */

function PanelChart({ panel, trendData, geselecteerdJaar, geselecteerdeMaand }: {
  panel: TrendPanel;
  trendData: TrendData | null;
  geselecteerdJaar: number | null;
  geselecteerdeMaand: number | null;
}) {
  const chartData = useMemo(() => {
    if (!trendData || trendData.series.length === 0) return [];

    let maanden = trendData.maanden;
    let serieData = trendData.series;

    // Filter op jaar
    if (geselecteerdJaar !== null) {
      const prefix = `${geselecteerdJaar}-`;
      const indices = maanden.map((m, i) => m.startsWith(prefix) ? i : -1).filter(i => i >= 0);
      maanden = indices.map(i => maanden[i]);
      serieData = serieData.map(s => ({ ...s, data: indices.map(i => s.data[i]) }));
    }

    // Filter op maand
    if (geselecteerdeMaand !== null) {
      const suffix = `-${String(geselecteerdeMaand).padStart(2, '0')}`;
      const indices = maanden.map((m, i) => m.endsWith(suffix) ? i : -1).filter(i => i >= 0);
      maanden = indices.map(i => maanden[i]);
      serieData = serieData.map(s => ({ ...s, data: indices.map(i => s.data[i]) }));
    }

    // Cumulatief
    if (panel.weergave === 'cumulatief') {
      serieData = serieData.map(s => {
        let cum = 0;
        const data = s.data.map(v => {
          if (v !== null) cum += v;
          return v !== null ? cum : null;
        });
        return { ...s, data };
      });
    }

    return maanden.map((m, i) => {
      const [y, mo] = m.split('-');
      const label = geselecteerdJaar !== null
        ? MAAND_KORT[parseInt(mo) - 1]
        : `${MAAND_KORT[parseInt(mo) - 1]} '${y.slice(2)}`;
      const punt: Record<string, string | number | null> = { maand: label };
      for (const s of serieData) {
        punt[s.naam] = s.data[i];
      }
      return punt;
    });
  }, [trendData, geselecteerdJaar, geselecteerdeMaand, panel.weergave]);

  if (!trendData || trendData.series.length === 0) {
    return <div style={{ padding: 24, color: 'var(--text-dim)', fontSize: 13 }}>Geen data beschikbaar.</div>;
  }

  if (chartData.length === 0) {
    return <div style={{ padding: 24, color: 'var(--text-dim)', fontSize: 13 }}>Geen data voor deze selectie.</div>;
  }

  const series = trendData.series;
  const isStaaf = panel.grafiek_type === 'staaf';

  const sharedAxes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
      <XAxis dataKey="maand" tick={{ fontSize: 12, fill: 'var(--text-dim)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
      <YAxis tickFormatter={val => fmt(val)} tick={{ fontSize: 11, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} width={90} />
      <Tooltip
        formatter={(val) => [fmt(val as number), '']}
        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)' }}
        labelStyle={{ color: 'var(--text-dim)', marginBottom: 4 }}
      />
      {series.length > 1 && <Legend wrapperStyle={{ fontSize: 13, color: 'var(--text)', paddingTop: 16 }} />}
    </>
  );

  return (
    <ResponsiveContainer width="100%" height={300}>
      {isStaaf ? (
        <BarChart data={chartData} margin={{ top: 8, right: 24, left: 16, bottom: 0 }}>
          {sharedAxes}
          {series.map((s, idx) => (
            <Bar key={s.id} dataKey={s.naam} fill={s.kleur ?? FALLBACK_KLEUREN[idx % FALLBACK_KLEUREN.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      ) : (
        <LineChart data={chartData} margin={{ top: 8, right: 24, left: 16, bottom: 0 }}>
          {sharedAxes}
          {series.map((s, idx) => (
            <Line key={s.id} type="monotone" dataKey={s.naam} stroke={s.kleur ?? FALLBACK_KLEUREN[idx % FALLBACK_KLEUREN.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} />
          ))}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

/* ── PanelCard component ────────────────────────────────────────── */

function PanelCard({ panel, trendData, onEdit, onDuplicate, onDelete, onDragStart, onDragOver, onDrop }: {
  panel: TrendPanel;
  trendData: TrendData | null;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [geselecteerdJaar, setGeselecteerdJaar] = useState<number | null>(null);
  const [geselecteerdeMaand, setGeselecteerdeMaand] = useState<number | null>(null);

  // Bepaal beschikbare jaren uit data
  const jaren = useMemo(() => {
    if (!trendData) return [];
    return [...new Set(trendData.maanden.map(m => parseInt(m.slice(0, 4))))].sort();
  }, [trendData]);

  // Stel standaard jaar in op meest recente (alleen bij eerste load)
  const initRef = useRef(false);
  useEffect(() => {
    if (!initRef.current && jaren.length > 0) {
      setGeselecteerdJaar(jaren.at(-1) ?? null);
      initRef.current = true;
    }
  }, [jaren]);

  // Beschikbare maanden voor geselecteerd jaar
  const maanden = useMemo(() => {
    if (!trendData || geselecteerdJaar === null) return [];
    const prefix = `${geselecteerdJaar}-`;
    return [...new Set(trendData.maanden.filter(m => m.startsWith(prefix)).map(m => parseInt(m.slice(5, 7))))].sort((a, b) => a - b);
  }, [trendData, geselecteerdJaar]);

  // Sluit menu bij klik buiten
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const databronLabel = panel.databron === 'saldo' ? 'Saldo' : panel.databron === 'uitgaven' ? 'Uitgaven' : 'Inkomsten';
  const typeLabel = panel.grafiek_type === 'lijn' ? 'Lijn' : 'Staaf';
  const weergaveLabel = panel.weergave === 'cumulatief' ? 'Cumulatief' : 'Per maand';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'grab',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-h)' }}>{panel.titel}</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
            {databronLabel} · {typeLabel} · {weergaveLabel}
          </div>
        </div>
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            onMouseDown={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: 18, color: 'var(--text-dim)' }}
          >⋮</button>
          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', zIndex: 50,
              background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)', minWidth: 160, overflow: 'hidden',
            }}>
              {[
                { label: 'Bewerken', actie: onEdit },
                { label: 'Dupliceren', actie: onDuplicate },
                { label: 'Verwijderen', actie: onDelete, kleur: 'var(--red)' },
              ].map(item => (
                <button
                  key={item.label}
                  onMouseDown={(e) => { e.stopPropagation(); setMenuOpen(false); item.actie(); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
                    color: item.kleur ?? 'var(--text)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tijdsknoppen */}
      <div style={{ padding: '12px 16px 0' }}>
        {panel.toon_jaarknoppen && jaren.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {panel.toon_alle_jaren && jaren.length > 1 && (
              <TijdKnop actief={geselecteerdJaar === null} onClick={() => { setGeselecteerdJaar(null); setGeselecteerdeMaand(null); }}>Alle jaren</TijdKnop>
            )}
            {jaren.map(j => (
              <TijdKnop key={j} actief={geselecteerdJaar === j} onClick={() => { setGeselecteerdJaar(j); setGeselecteerdeMaand(null); }}>{j}</TijdKnop>
            ))}
          </div>
        )}
        {panel.toon_maandknoppen && geselecteerdJaar !== null && maanden.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <TijdKnop actief={geselecteerdeMaand === null} onClick={() => setGeselecteerdeMaand(null)}>Alle maanden</TijdKnop>
            {maanden.map(m => (
              <TijdKnop key={m} actief={geselecteerdeMaand === m} onClick={() => setGeselecteerdeMaand(m)}>{MAAND_KORT[m - 1]}</TijdKnop>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ padding: '8px 16px 16px' }}>
        <PanelChart panel={panel} trendData={trendData} geselecteerdJaar={geselecteerdJaar} geselecteerdeMaand={geselecteerdeMaand} />
      </div>
    </div>
  );
}

function TijdKnop({ actief, onClick, children }: { actief: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
        border: actief ? 'none' : '1px solid var(--border)',
        background: actief ? 'var(--accent)' : 'none',
        color: actief ? '#fff' : 'var(--text)',
        fontWeight: actief ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}

/* ── PanelModal component ───────────────────────────────────────── */

function PanelModal({ panel, rekeningen, subcategorieen, onSave, onCancel }: {
  panel: Partial<TrendPanel> | null;
  rekeningen: Rekening[];
  subcategorieen: Subcategorie[];
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const isNieuw = !panel?.id;
  const [titel, setTitel] = useState(panel?.titel ?? 'Nieuwe trend');
  const [databron, setDatabron] = useState<string>(panel?.databron ?? 'saldo');
  const [grafiekType, setGrafiekType] = useState<string>(panel?.grafiek_type ?? 'lijn');
  const [weergave, setWeergave] = useState<string>(panel?.weergave ?? 'per_maand');
  const [toonJaar, setToonJaar] = useState(panel?.toon_jaarknoppen ?? true);
  const [toonMaand, setToonMaand] = useState(panel?.toon_maandknoppen ?? false);
  const [toonAlle, setToonAlle] = useState(panel?.toon_alle_jaren ?? true);
  const [geselecteerdeItems, setGeselecteerdeItems] = useState<{ item_type: string; item_id: number }[]>(
    panel?.items?.map(i => ({ item_type: i.item_type, item_id: i.item_id })) ?? []
  );

  const beschikbareItems = useMemo(() => {
    if (databron === 'saldo') return rekeningen.map(r => ({ item_type: 'rekening' as const, item_id: r.id, label: r.naam, groep: '' }));
    // Groepeer subcategorieën per categorie
    const result: { item_type: string; item_id: number; label: string; groep: string }[] = [];
    const gegroepeerd = new Map<string, typeof result>();
    for (const sub of subcategorieen) {
      if (!gegroepeerd.has(sub.categorie)) gegroepeerd.set(sub.categorie, []);
      gegroepeerd.get(sub.categorie)!.push({ item_type: 'subcategorie', item_id: sub.id, label: sub.naam, groep: sub.categorie });
    }
    for (const items of gegroepeerd.values()) {
      result.push(...items);
    }
    return result;
  }, [databron, rekeningen, subcategorieen]);

  const toggleItem = (itemType: string, itemId: number) => {
    setGeselecteerdeItems(prev => {
      const exists = prev.some(i => i.item_type === itemType && i.item_id === itemId);
      if (exists) return prev.filter(i => !(i.item_type === itemType && i.item_id === itemId));
      return [...prev, { item_type: itemType, item_id: itemId }];
    });
  };

  const handleSave = () => {
    onSave({
      titel,
      databron,
      grafiek_type: grafiekType,
      weergave,
      toon_jaarknoppen: toonJaar,
      toon_maandknoppen: toonMaand,
      toon_alle_jaren: toonAlle,
      items: geselecteerdeItems,
    });
  };

  // Reset items als databron verandert
  const prevDatabron = useRef(databron);
  useEffect(() => {
    if (prevDatabron.current !== databron) {
      setGeselecteerdeItems([]);
      prevDatabron.current = databron;
    }
  }, [databron]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
    onMouseDown={onCancel}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12,
          width: 520, maxHeight: '85vh', overflow: 'auto', padding: 24,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-h)', marginBottom: 20 }}>
          {isNieuw ? 'Nieuwe trend' : 'Trend bewerken'}
        </h2>

        {/* Titel */}
        <label style={labelStyle}>Titel</label>
        <input
          value={titel} onChange={e => setTitel(e.target.value)}
          style={inputStyle}
        />

        {/* Databron */}
        <label style={labelStyle}>Databron</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['saldo', 'uitgaven', 'inkomsten'] as const).map(d => (
            <ToggleKnop key={d} actief={databron === d} onClick={() => setDatabron(d)}>
              {d === 'saldo' ? 'Saldo' : d === 'uitgaven' ? 'Uitgaven' : 'Inkomsten'}
            </ToggleKnop>
          ))}
        </div>

        {/* Grafiektype */}
        <label style={labelStyle}>Grafiektype</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <ToggleKnop actief={grafiekType === 'lijn'} onClick={() => setGrafiekType('lijn')}>Lijn</ToggleKnop>
          <ToggleKnop actief={grafiekType === 'staaf'} onClick={() => setGrafiekType('staaf')}>Staaf</ToggleKnop>
        </div>

        {/* Weergave */}
        <label style={labelStyle}>Weergave</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <ToggleKnop actief={weergave === 'per_maand'} onClick={() => setWeergave('per_maand')}>Per maand</ToggleKnop>
          <ToggleKnop actief={weergave === 'cumulatief'} onClick={() => setWeergave('cumulatief')}>Cumulatief</ToggleKnop>
        </div>

        {/* Tijdsknoppen toggles */}
        <label style={labelStyle}>Tijdsnavigatie</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <CheckboxRij checked={toonJaar} onChange={setToonJaar}>Jaarknoppen tonen</CheckboxRij>
          <CheckboxRij checked={toonMaand} onChange={setToonMaand}>Maandknoppen tonen</CheckboxRij>
          <CheckboxRij checked={toonAlle} onChange={setToonAlle}>&ldquo;Alle jaren&rdquo; knop tonen</CheckboxRij>
        </div>

        {/* Item selectie */}
        <label style={labelStyle}>{databron === 'saldo' ? 'Rekeningen' : 'Subcategorieën'}</label>
        <div style={{
          maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8,
          background: 'var(--bg-card)', marginBottom: 20,
        }}>
          {beschikbareItems.length === 0 ? (
            <div style={{ padding: 12, color: 'var(--text-dim)', fontSize: 13 }}>Geen items beschikbaar.</div>
          ) : (
            (() => {
              let laatsteGroep = '';
              return beschikbareItems.map((item) => {
                const isGeselecteerd = geselecteerdeItems.some(g => g.item_type === item.item_type && g.item_id === item.item_id);
                const groepHeader = item.groep && item.groep !== laatsteGroep ? item.groep : null;
                if (item.groep) laatsteGroep = item.groep;
                return (
                  <div key={`${item.item_type}-${item.item_id}`}>
                    {groepHeader && (
                      <div style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {groepHeader}
                      </div>
                    )}
                    <div
                      onClick={() => toggleItem(item.item_type, item.item_id)}
                      style={{
                        padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                        display: 'flex', alignItems: 'center', gap: 8,
                        color: isGeselecteerd ? 'var(--text-h)' : 'var(--text)',
                        background: isGeselecteerd ? 'var(--accent-dim)' : 'transparent',
                      }}
                      onMouseEnter={e => { if (!isGeselecteerd) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { if (!isGeselecteerd) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        border: isGeselecteerd ? 'none' : '1px solid var(--border)',
                        background: isGeselecteerd ? 'var(--accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 11,
                      }}>
                        {isGeselecteerd ? '✓' : ''}
                      </span>
                      {item.label}
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>

        {/* Knoppen */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={cancelBtnStyle}>Annuleren</button>
          <button onClick={handleSave} disabled={geselecteerdeItems.length === 0} style={{
            ...saveBtnStyle,
            opacity: geselecteerdeItems.length === 0 ? 0.5 : 1,
            cursor: geselecteerdeItems.length === 0 ? 'not-allowed' : 'pointer',
          }}>
            {isNieuw ? 'Aanmaken' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleKnop({ actief, onClick, children }: { actief: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
      border: actief ? 'none' : '1px solid var(--border)',
      background: actief ? 'var(--accent)' : 'none',
      color: actief ? '#fff' : 'var(--text)',
      fontWeight: actief ? 600 : 400,
    }}>
      {children}
    </button>
  );
}

function CheckboxRij({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
      {children}
    </label>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-h)', fontSize: 14, marginBottom: 16, outline: 'none' };
const cancelBtnStyle: React.CSSProperties = { padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text)', fontSize: 13, cursor: 'pointer' };
const saveBtnStyle: React.CSSProperties = { padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600 };

/* ── Hoofdpagina ────────────────────────────────────────────────── */

export default function TrendsPage() {
  const [panels, setPanels] = useState<TrendPanel[]>([]);
  const [trendDataMap, setTrendDataMap] = useState<Map<number, TrendData>>(new Map());
  const [rekeningen, setRekeningen] = useState<Rekening[]>([]);
  const [subcategorieen, setSubcategorieen] = useState<Subcategorie[]>([]);
  const [laadt, setLaadt] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [modalPanel, setModalPanel] = useState<Partial<TrendPanel> | null | 'nieuw'>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const laadPanels = useCallback(async () => {
    try {
      const res = await fetch('/api/trend-panels');
      if (!res.ok) throw new Error('Laden mislukt');
      const data: TrendPanel[] = await res.json();
      setPanels(data);

      // Laad trend data voor elk panel
      const dataMap = new Map<number, TrendData>();
      await Promise.all(data.map(async (p) => {
        try {
          const r = await fetch(`/api/trend-data/${p.id}`);
          if (r.ok) dataMap.set(p.id, await r.json());
        } catch { /* skip */ }
      }));
      setTrendDataMap(dataMap);
    } catch {
      setFout('Kon trend-panels niet laden.');
    }
  }, []);

  const laadMetadata = useCallback(async () => {
    try {
      const [rekRes, subRes] = await Promise.all([
        fetch('/api/rekeningen'),
        fetch('/api/subcategorieen'),
      ]);
      if (rekRes.ok) setRekeningen(await rekRes.json());
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubcategorieen(Array.isArray(subData) ? subData : subData.subcategorieen ?? []);
      }
    } catch { /* niet kritiek */ }
  }, []);

  useEffect(() => {
    Promise.all([laadPanels(), laadMetadata()]).finally(() => setLaadt(false));
  }, [laadPanels, laadMetadata]);

  const handleSave = async (data: Record<string, unknown>) => {
    const isEdit = modalPanel && typeof modalPanel === 'object' && 'id' in modalPanel && modalPanel.id;
    const url = isEdit ? `/api/trend-panels/${modalPanel.id}` : '/api/trend-panels';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (res.ok) {
      setModalPanel(null);
      await laadPanels();
    }
  };

  const handleDuplicate = async (id: number) => {
    const res = await fetch(`/api/trend-panels/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actie: 'dupliceer' }),
    });
    if (res.ok) await laadPanels();
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/trend-panels/${id}`, { method: 'DELETE' });
    if (res.ok) await laadPanels();
  };

  const handleDrop = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const nieuw = [...panels];
    const [moved] = nieuw.splice(fromIdx, 1);
    nieuw.splice(toIdx, 0, moved);
    setPanels(nieuw);

    await fetch('/api/trend-panels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volgorde: nieuw.map(p => p.id) }),
    });
  };

  if (laadt) return <div style={{ padding: '28px 32px' }}><div className="loading">Data wordt geladen…</div></div>;
  if (fout) return <div style={{ padding: '28px 32px' }}><div className="empty" style={{ color: 'var(--red)' }}>{fout}</div></div>;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-h)' }}>Trends</h1>
        <button
          onClick={() => setModalPanel('nieuw')}
          style={{
            padding: '8px 20px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          + Nieuwe trend
        </button>
      </div>

      {panels.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
          padding: 48, textAlign: 'center',
        }}>
          <div style={{ fontSize: 15, color: 'var(--text-dim)', marginBottom: 16 }}>
            Nog geen trend-panels aangemaakt.
          </div>
          <button
            onClick={() => setModalPanel('nieuw')}
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Maak je eerste trend
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(520px, 1fr))',
          gap: 20,
        }}>
          {panels.map((panel, idx) => (
            <PanelCard
              key={panel.id}
              panel={panel}
              trendData={trendDataMap.get(panel.id) ?? null}
              onEdit={() => setModalPanel(panel)}
              onDuplicate={() => handleDuplicate(panel.id)}
              onDelete={() => handleDelete(panel.id)}
              onDragStart={(e) => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move'; }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onDrop={() => { if (dragIdx !== null && dragIdx !== idx) handleDrop(dragIdx, idx); setDragIdx(null); }}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalPanel !== null && (
        <PanelModal
          panel={modalPanel === 'nieuw' ? {} : modalPanel}
          rekeningen={rekeningen}
          subcategorieen={subcategorieen}
          onSave={handleSave}
          onCancel={() => setModalPanel(null)}
        />
      )}
    </div>
  );
}
