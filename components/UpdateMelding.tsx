// FILE: UpdateMelding.tsx
// AANGEMAAKT: 05-04-2026 01:15
// VERSIE: 1
// GEWIJZIGD: 05-04-2026 01:15
//
// WIJZIGINGEN (05-04-2026 01:15):
// - Initieel: update-check banner met 24-uur cache

'use client';

import { useEffect, useState } from 'react';

interface UpdateInfo {
  huidig: string;
  nieuwste: string;
  updateBeschikbaar: boolean;
  releaseUrl: string | null;
}

const CACHE_KEY = 'fbs-update-check';
const CACHE_DUUR_MS = 24 * 60 * 60 * 1000; // 24 uur

export default function UpdateMelding() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [installing, setInstalling] = useState(false);
  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

  useEffect(() => {
    // Check localStorage cache
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DUUR_MS) {
          if (data.updateBeschikbaar) setInfo(data);
          return;
        }
      }
    } catch { /* cache corrupt, opnieuw ophalen */ }

    fetch('/api/updates/check')
      .then(r => r.ok ? r.json() : null)
      .then((data: UpdateInfo | null) => {
        if (!data) return;
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
        } catch { /* localStorage vol */ }
        if (data.updateBeschikbaar) setInfo(data);
      })
      .catch(() => {});
  }, []);

  if (!info) return null;

  return (
    <div style={{
      background: 'var(--accent-dim)',
      border: '1px solid var(--accent)',
      borderRadius: 6,
      padding: '6px 16px',
      margin: '0 0 12px',
      fontSize: 12,
      color: 'var(--text)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <span>Nieuwe versie beschikbaar: <strong>{info.nieuwste}</strong></span>
      {isTauri ? (
        <button
          disabled={installing}
          onClick={async () => {
            setInstalling(true);
            try {
              const { invoke } = await import('@tauri-apps/api/core');
              await invoke('install_update');
            } catch {
              setInstalling(false);
            }
          }}
          style={{
            background: 'none', border: 'none', padding: 0,
            color: 'var(--accent)', fontWeight: 600, cursor: installing ? 'wait' : 'pointer',
            fontSize: 'inherit', opacity: installing ? 0.6 : 1,
          }}
        >
          {installing ? 'Installeren...' : 'Nu installeren'}
        </button>
      ) : info.releaseUrl && (
        <a
          href={info.releaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
        >
          Download
        </a>
      )}
    </div>
  );
}
