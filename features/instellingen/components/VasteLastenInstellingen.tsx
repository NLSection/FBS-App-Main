// FILE: VasteLastenInstellingen.tsx
// AANGEMAAKT: 03-04-2026 19:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 19:00
//
// WIJZIGINGEN (03-04-2026 19:00):
// - Initiële aanmaak: instellingen voor vaste lasten overzicht

'use client';

import { useEffect, useState } from 'react';

interface VLInst {
  vasteLastenOverzichtMaanden: number;
  vasteLastenAfwijkingProcent: number;
}

const inputCls = 'w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1.5 text-sm text-[var(--text-h)] focus:outline-none focus:border-[var(--accent)]';

export default function VasteLastenInstellingen() {
  const [inst, setInst] = useState<VLInst | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/instellingen')
      .then(r => r.ok ? r.json() : null)
      .then((d: VLInst | null) => {
        if (d) setInst({ vasteLastenOverzichtMaanden: d.vasteLastenOverzichtMaanden ?? 4, vasteLastenAfwijkingProcent: d.vasteLastenAfwijkingProcent ?? 5 });
      })
      .catch(() => {});
  }, []);

  async function opslaan(update: Partial<VLInst>) {
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
    }
  }

  if (!inst) return null;

  return (
    <section>
      <p className="section-title">Vaste Lasten Overzicht</p>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13, color: 'var(--text)' }}>
            Aantal maanden in overzicht
            <input
              type="number"
              min={1}
              max={12}
              value={inst.vasteLastenOverzichtMaanden}
              onChange={e => {
                const v = parseInt(e.target.value);
                if (v >= 1 && v <= 12) opslaan({ vasteLastenOverzichtMaanden: v });
              }}
              className={inputCls}
              style={{ width: 80, marginLeft: 8 }}
              disabled={bezig}
            />
          </label>
          <label style={{ fontSize: 13, color: 'var(--text)' }}>
            Afwijkingsdrempel (%)
            <input
              type="number"
              min={1}
              max={100}
              value={inst.vasteLastenAfwijkingProcent}
              onChange={e => {
                const v = parseInt(e.target.value);
                if (v >= 1 && v <= 100) opslaan({ vasteLastenAfwijkingProcent: v });
              }}
              className={inputCls}
              style={{ width: 80, marginLeft: 8 }}
              disabled={bezig}
            />
          </label>
        </div>
        {fout && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{fout}</p>}
      </div>
    </section>
  );
}
