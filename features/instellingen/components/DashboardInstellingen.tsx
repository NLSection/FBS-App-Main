// FILE: DashboardInstellingen.tsx
// AANGEMAAKT: 03-04-2026 10:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 22:00
//
// WIJZIGINGEN (03-04-2026 22:00):
// - catUitklappen toggle toegevoegd: subcategorieën uitklappen in CAT tabel

'use client';

import { useEffect, useState } from 'react';

interface DashInst {
  dashboardBlsTonen:      boolean;
  dashboardCatTonen:      boolean;
  dashboardBlsUitgeklapt: boolean;
  dashboardCatUitgeklapt: boolean;
  catUitklappen:          boolean;
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label style={{ position: 'relative', display: 'inline-block', width: 36, height: 20, cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} disabled={disabled} style={{ opacity: 0, width: 0, height: 0 }} />
      <span style={{ position: 'absolute', inset: 0, borderRadius: 10, background: checked ? 'var(--accent)' : 'var(--border)', transition: 'background 0.2s', opacity: disabled ? 0.5 : 1 }} />
      <span style={{ position: 'absolute', top: 3, left: checked ? 19 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </label>
  );
}

const col1: React.CSSProperties = { flex: 1, fontSize: 13, color: 'var(--text)' };
const col2: React.CSSProperties = { width: 80, display: 'flex', justifyContent: 'center' };
const col3: React.CSSProperties = { width: 80, display: 'flex', justifyContent: 'center' };

export default function DashboardInstellingen() {
  const [inst, setInst]   = useState<DashInst | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout]   = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/instellingen')
      .then(r => r.ok ? r.json() : null)
      .then((d: DashInst | null) => {
        if (d) setInst({ dashboardBlsTonen: d.dashboardBlsTonen, dashboardCatTonen: d.dashboardCatTonen, dashboardBlsUitgeklapt: d.dashboardBlsUitgeklapt, dashboardCatUitgeklapt: d.dashboardCatUitgeklapt, catUitklappen: Boolean(d.catUitklappen) });
      })
      .catch(() => {});
  }, []);

  async function opslaan(update: Partial<DashInst>) {
    if (!inst) return;
    setInst({ ...inst, ...update });
    setBezig(true);
    setFout(null);
    const res = await fetch('/api/instellingen', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    setBezig(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string };
      setFout(d.error ?? 'Opslaan mislukt.');
      setInst(inst);
    }
  }

  if (!inst) return null;

  const dimStijl: React.CSSProperties = { fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' };
  const rijStijl: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' };

  return (
    <section>
      <p className="section-title">Dashboard weergave</p>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 20px 12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0 4px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ ...col1, ...dimStijl }}>Tabel</div>
          <div style={{ ...col2, ...dimStijl }}>Zichtbaar</div>
          <div style={{ ...col3, ...dimStijl }}>Uitgeklapt</div>
        </div>
        {/* BLS rij */}
        <div style={rijStijl}>
          <span style={col1}>Balans Budgetten en Potjes</span>
          <div style={col2}><Toggle checked={inst.dashboardBlsTonen}      onChange={v => opslaan({ dashboardBlsTonen: v })}      disabled={bezig} /></div>
          <div style={col3}><Toggle checked={inst.dashboardBlsUitgeklapt} onChange={v => opslaan({ dashboardBlsUitgeklapt: v })} disabled={bezig} /></div>
        </div>
        {/* CAT rij */}
        <div style={rijStijl}>
          <span style={col1}>Samenvatting per Categorie</span>
          <div style={col2}><Toggle checked={inst.dashboardCatTonen}      onChange={v => opslaan({ dashboardCatTonen: v })}      disabled={bezig} /></div>
          <div style={col3}><Toggle checked={inst.dashboardCatUitgeklapt} onChange={v => opslaan({ dashboardCatUitgeklapt: v })} disabled={bezig} /></div>
        </div>
        {/* CAT subcategorieën standaard uitgeklapt */}
        <div style={{ ...rijStijl, borderBottom: 'none' }}>
          <span style={{ ...col1, paddingLeft: 16, color: 'var(--text-dim)', fontSize: 12 }}>└ Transacties per subcategorie standaard uitgeklapt</span>
          <div style={col2} />
          <div style={col3}><Toggle checked={inst.catUitklappen} onChange={v => opslaan({ catUitklappen: v })} disabled={bezig || !inst.dashboardCatTonen} /></div>
        </div>
        {fout && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{fout}</p>}
      </div>
    </section>
  );
}
