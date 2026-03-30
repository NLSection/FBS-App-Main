// FILE: BackupRestore.tsx
// AANGEMAAKT: 29-03-2026 15:00
// VERSIE: 1
// GEWIJZIGD: 29-03-2026 15:30
//
// WIJZIGINGEN (29-03-2026 15:00):
// - Initiële aanmaak: Backup & Restore sectie met download en importeer functionaliteit
// - Importeer backup knop altijd zichtbaar (disabled tot bestand geladen)
// - Knop opent bestandspicker; na selectie doet knop de import; hint tekst onder de knop

'use client';

import { useState, useRef } from 'react';

const TABEL_GROEPEN = [
  { label: 'Transacties',     tabellen: ['transacties', 'imports'] },
  { label: 'Categorieregels', tabellen: ['categorieen'] },
  { label: 'Categorieën',     tabellen: ['budgetten_potjes'] },
  { label: 'Rekeningen',      tabellen: ['rekeningen'] },
  { label: 'Instellingen',    tabellen: ['instellingen'] },
];

const labelCls  = 'block text-xs text-[var(--text-dim)] mb-1';
const btnPrimary: React.CSSProperties = { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const btnDanger: React.CSSProperties  = { background: 'var(--red)',    color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' };

export default function BackupRestore() {
  const [backupSelectie, setBackupSelectie] = useState<Set<string>>(
    new Set(TABEL_GROEPEN.map(g => g.label))
  );
  const [backupBezig, setBackupBezig] = useState(false);
  const [backupFout,  setBackupFout]  = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [backupData,        setBackupData]        = useState<Record<string, unknown[]> | null>(null);
  const [restoreSelectie,   setRestoreSelectie]   = useState<Set<string>>(new Set());
  const [restoreBezig,      setRestoreBezig]      = useState(false);
  const [restoreFout,       setRestoreFout]       = useState<string | null>(null);
  const [restoreResultaat,  setRestoreResultaat]  = useState<Record<string, number> | null>(null);

  const beschikbareGroepen = TABEL_GROEPEN.filter(g =>
    backupData && g.tabellen.some(t => t in backupData)
  );

  function toggleBackup(label: string) {
    setBackupSelectie(prev => { const s = new Set(prev); s.has(label) ? s.delete(label) : s.add(label); return s; });
  }

  function toggleRestore(label: string) {
    setRestoreSelectie(prev => { const s = new Set(prev); s.has(label) ? s.delete(label) : s.add(label); return s; });
  }

  async function handleDownload() {
    const tabellen = TABEL_GROEPEN.filter(g => backupSelectie.has(g.label)).flatMap(g => g.tabellen).join(',');
    if (!tabellen) return;
    setBackupBezig(true); setBackupFout(null);
    const res = await fetch(`/api/backup?tabellen=${tabellen}`);
    setBackupBezig(false);
    if (!res.ok) { setBackupFout('Download mislukt.'); return; }
    const blob = await res.blob();
    const datum = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `fbs-backup-${datum}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFout(null); setRestoreResultaat(null); setBackupData(null);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        setBackupData(parsed);
        setRestoreSelectie(new Set(
          TABEL_GROEPEN.filter(g => g.tabellen.some(t => t in parsed)).map(g => g.label)
        ));
      } catch {
        setRestoreFout('Ongeldig JSON bestand.');
      }
    };
    reader.readAsText(file);
  }

  async function handleImporteerKnop() {
    if (!backupData) { fileRef.current?.click(); return; }
    const body: Record<string, unknown[]> = {};
    TABEL_GROEPEN
      .filter(g => restoreSelectie.has(g.label))
      .flatMap(g => g.tabellen)
      .filter(t => t in backupData)
      .forEach(t => { body[t] = backupData[t]; });
    setRestoreBezig(true); setRestoreFout(null); setRestoreResultaat(null);
    const res = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setRestoreBezig(false);
    if (!res.ok) { const d = await res.json(); setRestoreFout(d.error ?? 'Import mislukt.'); return; }
    setRestoreResultaat(await res.json());
    setBackupData(null); setRestoreSelectie(new Set());
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <section>
      <p className="section-title">Backup &amp; Restore</p>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Backup */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', marginBottom: 12 }}>Download backup</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginBottom: 14 }}>
            {TABEL_GROEPEN.map(g => (
              <label key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-h)', cursor: 'pointer' }}>
                <input type="checkbox" checked={backupSelectie.has(g.label)} onChange={() => toggleBackup(g.label)} />
                {g.label}
              </label>
            ))}
          </div>
          {backupFout && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{backupFout}</p>}
          <button onClick={handleDownload} disabled={backupBezig || backupSelectie.size === 0}
            style={{ ...btnPrimary, opacity: backupBezig || backupSelectie.size === 0 ? 0.6 : 1, cursor: backupBezig || backupSelectie.size === 0 ? 'not-allowed' : 'pointer' }}>
            {backupBezig ? 'Downloaden…' : 'Download backup'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* Restore */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', marginBottom: 12 }}>Importeer backup</p>
          <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />

          {backupData && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginBottom: 12 }}>
                {beschikbareGroepen.map(g => (
                  <label key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-h)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={restoreSelectie.has(g.label)} onChange={() => toggleRestore(g.label)} />
                    {g.label}
                  </label>
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#f59e0b', marginBottom: 12 }}>
                ⚠ Bestaande data wordt overschreven
              </p>
            </>
          )}

          {restoreFout && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{restoreFout}</p>}
          {restoreResultaat && (
            <p style={{ color: 'var(--green)', fontSize: 12, marginBottom: 8 }}>
              Import geslaagd:{' '}
              {Object.entries(restoreResultaat).map(([t, n]) => `${t} (${n} records)`).join(', ')}
            </p>
          )}

          <button onClick={handleImporteerKnop} disabled={restoreBezig || (!!backupData && restoreSelectie.size === 0)}
            style={{ ...btnDanger, opacity: restoreBezig || (!!backupData && restoreSelectie.size === 0) ? 0.4 : 1, cursor: restoreBezig || (!!backupData && restoreSelectie.size === 0) ? 'not-allowed' : 'pointer' }}>
            {restoreBezig ? 'Importeren…' : 'Importeer backup'}
          </button>
          {!backupData && <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>Selecteer een backup bestand (.json)</p>}
        </div>

      </div>
    </section>
  );
}
