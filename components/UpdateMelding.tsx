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

  return (
    <div style={{
      background: '#1e1e2e',
      borderBottom: '1px solid #313244',
      padding: '10px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#cdd6f4', fontSize: '13px' }}>
          Nieuwe versie beschikbaar: <strong>{update.nieuwste}</strong>
        </span>
        {isTauri ? (
          <button
            onClick={() => { console.log('install clicked, isTauri:', isTauri); handleInstall(); }}
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
        ) : (
          <a href={update.releaseUrl} target="_blank" rel="noreferrer"
            style={{ color: '#89b4fa', fontSize: '13px' }}>
            Naar download
          </a>
        )}
      </div>
      {update.changelog && (
        <div style={{ color: '#a6adc8', fontSize: '12px' }}>
          {update.changelog.split('\n').map((r, i) => <div key={i}>{r}</div>)}
        </div>
      )}
    </div>
  );
}
