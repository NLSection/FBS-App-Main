// FILE: VastePostenInstellingen.tsx
// AANGEMAAKT: 03-04-2026 19:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 19:00
//
// WIJZIGINGEN (03-04-2026 19:00):
// - Initiële aanmaak: instellingen voor vaste lasten overzicht

'use client';

import { useEffect, useState } from 'react';
import InfoTooltip from '@/components/InfoTooltip';

interface VLInst {
  vastePostenOverzichtMaanden: number;
  vastePostenAfwijkingProcent: number;
  vastePostenVergelijkMaanden: number;
}

const inputCls = 'w-full bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1.5 text-sm text-[var(--text-h)] focus:outline-none focus:border-[var(--accent)]';

export default function VastePostenInstellingen() {
  const [inst, setInst] = useState<VLInst | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/instellingen')
      .then(r => r.ok ? r.json() : null)
      .then((d: VLInst | null) => {
        if (d) setInst({ vastePostenOverzichtMaanden: d.vastePostenOverzichtMaanden ?? 4, vastePostenAfwijkingProcent: d.vastePostenAfwijkingProcent ?? 5, vastePostenVergelijkMaanden: d.vastePostenVergelijkMaanden ?? 3 });
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <p className="section-title" style={{ margin: 0 }}>Vaste Posten Overzicht</p>
        <InfoTooltip volledigeBreedte tekst="Bepaal hoeveel maandkolommen zichtbaar zijn op de Vaste Posten-pagina en vanaf welk percentage een bedrag als afwijkend wordt gemarkeerd. Afwijkende bedragen worden met een gekleurde achtergrond en een pijltje weergegeven." />
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13, color: 'var(--text)' }}>
            Aantal maanden in overzicht
            <select
              value={inst.vastePostenOverzichtMaanden}
              onChange={e => opslaan({ vastePostenOverzichtMaanden: parseInt(e.target.value) })}
              className={inputCls}
              style={{ width: 80, marginLeft: 8 }}
              disabled={bezig}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 13, color: 'var(--text)' }}>
            Vergelijkperiode bedrag (maanden)
            <select
              value={inst.vastePostenVergelijkMaanden}
              onChange={e => opslaan({ vastePostenVergelijkMaanden: parseInt(e.target.value) })}
              className={inputCls}
              style={{ width: 80, marginLeft: 8 }}
              disabled={bezig}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 13, color: 'var(--text)' }}>
            Afwijkingsdrempel (%)
            <select
              value={inst.vastePostenAfwijkingProcent}
              onChange={e => opslaan({ vastePostenAfwijkingProcent: parseInt(e.target.value) })}
              className={inputCls}
              style={{ width: 80, marginLeft: 8 }}
              disabled={bezig}
            >
              {[5, 10, 15, 20, 25, 30].map(d => (
                <option key={d} value={d}>{d}%</option>
              ))}
            </select>
          </label>
        </div>
        {fout && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{fout}</p>}
      </div>
    </section>
  );
}
