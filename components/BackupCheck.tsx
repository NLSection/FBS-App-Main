// FILE: BackupCheck.tsx
// AANGEMAAKT: 02-04-2026 10:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 17:00
//
// WIJZIGINGEN (03-04-2026 17:00):
// - Restyled naar centered modal met overlay, in lijn met app-design (dark theme)

'use client';

import { useEffect, useState } from 'react';

interface CheckData {
  backupIsNieuwer: boolean;
  backupDatum: string | null;
  backupBestand: string | null;
}

export default function BackupCheck() {
  const [check, setCheck] = useState<CheckData | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    function doCheck() {
      fetch('/api/backup/check')
        .then(r => r.json())
        .then((data: CheckData) => {
          if (data.backupIsNieuwer) setCheck(data);
        })
        .catch(() => {});
    }

    doCheck();
    const interval = setInterval(doCheck, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!check) return null;

  async function herstel() {
    setBezig(true);
    setFout(null);
    try {
      const restoreRes = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!restoreRes.ok) {
        const err = await restoreRes.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Herstel mislukt.');
      }
      window.location.reload();
    } catch (err) {
      setFout(err instanceof Error ? err.message : 'Onbekende fout.');
      setBezig(false);
    }
  }

  const datum = check.backupDatum
    ? new Date(check.backupDatum).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })
    : 'onbekend';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 28, minWidth: 340, maxWidth: 440,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        textAlign: 'center',
      }}>
        <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 16, color: 'var(--text-h)' }}>
          Nieuwe backup beschikbaar
        </p>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>
          Er is een backup van <strong style={{ color: 'var(--text-h)' }}>{datum}</strong> gesynchroniseerd.
          <br />Wil je de database bijwerken?
        </p>
        {fout && <p style={{ color: '#ef4444', margin: '0 0 12px', fontSize: 13 }}>{fout}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={herstel}
            disabled={bezig}
            style={{
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 6, padding: '8px 24px', fontSize: 14,
              fontWeight: 500, cursor: bezig ? 'wait' : 'pointer',
              opacity: bezig ? 0.6 : 1,
            }}
          >
            {bezig ? 'Bezig…' : 'Importeren'}
          </button>
          <button
            onClick={() => setCheck(null)}
            disabled={bezig}
            style={{
              background: 'transparent', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 6,
              padding: '8px 24px', fontSize: 14, cursor: 'pointer',
            }}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
