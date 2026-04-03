// FILE: DashboardInstellingen.tsx
// AANGEMAAKT: 03-04-2026 10:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 10:00
//
// WIJZIGINGEN (03-04-2026 10:00):
// - Initiële aanmaak: toggles voor BLS/CAT weergave en standaard open/dicht

'use client';

import { useEffect, useState } from 'react';

interface DashInst {
  dashboardBlsTonen:      boolean;
  dashboardCatTonen:      boolean;
  dashboardBlsUitgeklapt: boolean;
  dashboardCatUitgeklapt: boolean;
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

function Rij({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export default function DashboardInstellingen() {
  const [inst, setInst]   = useState<DashInst | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout]   = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/instellingen')
      .then(r => r.ok ? r.json() : null)
      .then((d: DashInst | null) => {
        if (d) setInst({ dashboardBlsTonen: d.dashboardBlsTonen, dashboardCatTonen: d.dashboardCatTonen, dashboardBlsUitgeklapt: d.dashboardBlsUitgeklapt, dashboardCatUitgeklapt: d.dashboardCatUitgeklapt });
      })
      .catch(() => {});
  }, []);

  async function opslaan(update: Partial<DashInst>) {
    if (!inst) return;
    const nieuw = { ...inst, ...update };
    setInst(nieuw);
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
      setInst(inst); // terugzetten bij fout
    }
  }

  if (!inst) return null;

  return (
    <section>
      <p className="section-title">Dashboard weergave</p>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 20px 12px' }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '10px 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tonen op dashboard</div>
        <Rij label="Balans Budgetten en Potjes" checked={inst.dashboardBlsTonen} onChange={v => opslaan({ dashboardBlsTonen: v })} disabled={bezig} />
        <Rij label="Samenvatting per Categorie" checked={inst.dashboardCatTonen} onChange={v => opslaan({ dashboardCatTonen: v })} disabled={bezig} />

        <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '14px 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Standaard uitgeklapt</div>
        <Rij label="Balans Budgetten en Potjes" checked={inst.dashboardBlsUitgeklapt} onChange={v => opslaan({ dashboardBlsUitgeklapt: v })} disabled={bezig} />
        <div style={{ borderBottom: 'none' }}>
          <Rij label="Samenvatting per Categorie" checked={inst.dashboardCatUitgeklapt} onChange={v => opslaan({ dashboardCatUitgeklapt: v })} disabled={bezig} />
        </div>

        {fout && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{fout}</p>}
      </div>
    </section>
  );
}
