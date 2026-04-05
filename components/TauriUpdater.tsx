'use client';

import { useEffect, useState } from 'react';

interface UpdateInfo {
  version: string;
  body: string | null;
}

export default function TauriUpdater() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const isTauri = !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;
    console.log('[TauriUpdater] gestart, isTauri:', isTauri);
    if (!isTauri) return;

    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke<UpdateInfo | null>('check_for_update')
        .then((result) => {
          console.log('[TauriUpdater] check_for_update resultaat:', result);
          if (result) setUpdate(result);
        })
        .catch((err) => console.error('[TauriUpdater] fout:', err));
    });
  }, []);

  if (!update) return null;

  const handleInstall = async () => {
    setInstalling(true);
    const { invoke } = await import('@tauri-apps/api/core');
    invoke('install_update').catch(() => setInstalling(false));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
    }}>
      <div style={{
        background: '#1e1e2e', color: '#cdd6f4', borderRadius: 12,
        padding: 24, maxWidth: 420, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <h3 style={{ margin: '0 0 8px' }}>Update beschikbaar</h3>
        <p style={{ margin: '0 0 12px', fontSize: 14, opacity: 0.8 }}>
          Versie {update.version} is beschikbaar.
        </p>
        {update.body && (
          <pre style={{
            fontSize: 13, whiteSpace: 'pre-wrap', margin: '0 0 16px',
            padding: 12, background: '#181825', borderRadius: 8, maxHeight: 200, overflow: 'auto',
          }}>
            {update.body}
          </pre>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={() => setUpdate(null)}
            disabled={installing}
            style={{
              padding: '8px 16px', borderRadius: 6, border: '1px solid #45475a',
              background: 'transparent', color: '#cdd6f4', cursor: 'pointer',
            }}
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            disabled={installing}
            style={{
              padding: '8px 16px', borderRadius: 6, border: 'none',
              background: '#89b4fa', color: '#1e1e2e', cursor: 'pointer', fontWeight: 600,
            }}
          >
            {installing ? 'Installeren...' : 'Nu installeren'}
          </button>
        </div>
      </div>
    </div>
  );
}
