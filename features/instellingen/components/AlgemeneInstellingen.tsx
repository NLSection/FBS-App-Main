// FILE: AlgemeneInstellingen.tsx
// AANGEMAAKT: 25-03-2026 21:00
// VERSIE: 1
// GEWIJZIGD: 25-03-2026 21:00
//
// WIJZIGINGEN (25-03-2026 21:00):
// - Initiële aanmaak: MaandStartDag instelling (1–28)

'use client';

import { useEffect, useState } from 'react';

const inputCls = 'w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1.5 text-sm text-[var(--text-h)] focus:outline-none focus:border-[var(--accent)]';
const labelCls = 'block text-xs text-[var(--text-dim)] mb-1';
const btnOpslaan = { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600 as const, cursor: 'pointer' };

export default function AlgemeneInstellingen() {
  const [maandStartDag, setMaandStartDag] = useState<number>(27);
  const [bezig, setBezig]                 = useState(false);
  const [fout, setFout]                   = useState<string | null>(null);
  const [succes, setSucces]               = useState(false);

  useEffect(() => {
    fetch('/api/instellingen')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.maandStartDag) setMaandStartDag(d.maandStartDag); });
  }, []);

  async function handleOpslaan(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true); setFout(null); setSucces(false);
    const res = await fetch('/api/instellingen', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maandStartDag }),
    });
    setBezig(false);
    if (!res.ok) {
      const d = await res.json();
      setFout(d.error ?? 'Opslaan mislukt.');
    } else {
      setSucces(true);
    }
  }

  const eindDag = maandStartDag > 1 ? maandStartDag - 1 : 'laatste dag';

  return (
    <section>
      <p className="section-title">Algemene instellingen</p>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
        <form onSubmit={handleOpslaan}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
            <div>
              <label className={labelCls}>Maand start dag (1–28)</label>
              <input
                className={inputCls}
                type="number"
                min={1}
                max={28}
                value={maandStartDag}
                onChange={e => { setMaandStartDag(parseInt(e.target.value, 10)); setSucces(false); }}
                required
              />
              <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                Periode loopt van de {maandStartDag}e t/m de {eindDag}e van de volgende maand.
              </p>
            </div>
          </div>
          {fout   && <p style={{ color: 'var(--red)',   fontSize: 12, marginBottom: 8 }}>{fout}</p>}
          {succes && <p style={{ color: 'var(--green)', fontSize: 12, marginBottom: 8 }}>Instellingen opgeslagen.</p>}
          <button type="submit" disabled={bezig}
            style={{ ...btnOpslaan, opacity: bezig ? 0.6 : 1, cursor: bezig ? 'not-allowed' : 'pointer' }}>
            {bezig ? 'Opslaan…' : 'Opslaan'}
          </button>
        </form>
      </div>
    </section>
  );
}
