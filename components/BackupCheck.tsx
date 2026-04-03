// FILE: BackupCheck.tsx
// AANGEMAAKT: 02-04-2026 10:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 16:30
//
// WIJZIGINGEN (03-04-2026 16:30):
// - Polling elke 5 minuten i.p.v. eenmalige check bij mount (cross-device sync)

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
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      background: '#fff3cd', border: '1px solid #ffc107',
      borderRadius: 8, padding: '12px 16px', maxWidth: 420,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }}>
      <p style={{ margin: '0 0 8px', fontWeight: 500 }}>
        Er is een nieuwere backup beschikbaar van {datum}. Wil je deze importeren?
      </p>
      {fout && <p style={{ color: '#dc3545', margin: '0 0 8px', fontSize: 13 }}>{fout}</p>}
      <button onClick={herstel} disabled={bezig} style={{ marginRight: 8 }}>
        {bezig ? 'Bezig…' : 'Ja'}
      </button>
      <button onClick={() => setCheck(null)} disabled={bezig}>Nee</button>
    </div>
  );
}
