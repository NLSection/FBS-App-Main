'use client';
import { useEffect, useState } from 'react';

interface UpdateInfo {
  huidig: string;
  nieuwste: string;
  updateBeschikbaar: boolean;
  releaseUrl: string;
  changelog?: string;
}

export default function UpdateMelding() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [installing, setInstalling] = useState(false);
  const [uitgeklapt, setUitgeklapt] = useState(false);
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  useEffect(() => {
    const cached = localStorage.getItem('fbs-update-check');
    if (cached) {
      try {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < 3600000) {
          if (data.updateBeschikbaar) setUpdate(data);
          return;
        }
      } catch {}
    }
    fetch('/api/updates/check')
      .then(r => r.json())
      .then((data: UpdateInfo) => {
        localStorage.setItem('fbs-update-check', JSON.stringify({ data, ts: Date.now() }));
        if (data.updateBeschikbaar) setUpdate(data);
      })
      .catch(() => {});
  }, []);

  if (!update) return null;

  const handleInstall = async () => {
    if (!isTauri) return;
    setInstalling(true);
    try {
      const tauri = await import('@tauri-apps/api/core');
      await tauri.invoke('install_update');
    } catch (e) {
      console.error('Update mislukt:', e);
      alert('Update fout: ' + String(e));
      setInstalling(false);
    }
  };

  const regels = update.changelog?.split('\n').filter(r => r.trim()) || [];
  const heeftMeer = regels.length > 2;

  return (
    <div style={{
      background: '#1e1e2e',
      borderBottom: '1px solid #313244',
    }}>
      <div style={{
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ color: '#cdd6f4', fontSize: '13px' }}>
          Nieuwe versie beschikbaar: <strong>{update.nieuwste}</strong>
        </span>
        <button
          onClick={handleInstall}
          disabled={installing}
          style={{
            background: '#89b4fa',
            color: '#1e1e2e',
            border: 'none',
            borderRadius: '6px',
            padding: '4px 14px',
            cursor: installing ? 'wait' : 'pointer',
            fontWeight: 600,
            fontSize: '13px',
          }}
        >
          {installing ? 'Installeren...' : 'Nu installeren'}
        </button>
      </div>
      {regels.length > 0 && (
        <div style={{ padding: '0 20px 10px' }}>
          <div style={{
            color: '#a6adc8',
            fontSize: '12px',
            lineHeight: '1.5',
            ...(uitgeklapt ? { maxHeight: '40vh', overflowY: 'auto' as const } : {}),
          }}>
            {(uitgeklapt ? regels : regels.slice(0, 2)).map((r, i) => (
              <div key={i}>{r}</div>
            ))}
          </div>
          {heeftMeer && (
            <button
              onClick={() => setUitgeklapt(!uitgeklapt)}
              style={{
                background: 'none',
                border: 'none',
                color: '#89b4fa',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '4px 0 0',
                textDecoration: 'underline',
              }}
            >
              {uitgeklapt ? 'Toon minder' : 'Toon meer'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
