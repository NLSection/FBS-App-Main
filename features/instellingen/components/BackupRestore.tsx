// FILE: BackupRestore.tsx
// AANGEMAAKT: 29-03-2026 15:00
// VERSIE: 1
// GEWIJZIGD: 31-03-2026 12:00
//
// WIJZIGINGEN (31-03-2026 12:00):
// - Importeer backup flow vervangen door 2-staps popup: selectie + bevestiging
// WIJZIGINGEN (30-03-2026 13:00):
// - btnGrijs kleur gewijzigd van --text-dim naar --text-h (knoppen waren onleesbaar in modal)
// - btnGrijs gestyled als echte knop: solide achtergrond, zelfde padding/weight als btnPrimary
// - Fix: file picker via <label htmlFor> i.p.v. programmatische .click() (blokkeerde Chrome)
// WIJZIGINGEN (29-03-2026 15:00):
// - Initiële aanmaak: Backup & Restore sectie met download en importeer functionaliteit
// - Importeer backup knop altijd zichtbaar (disabled tot bestand geladen)
// - Knop opent bestandspicker; na selectie doet knop de import; hint tekst onder de knop
// - Alles Wissen functie toegevoegd: rode knop, waarschuwingsmodal (stap 2) en bevestigingsmodal (stap 3)

'use client';

import { useState, useRef } from 'react';

const TABEL_GROEPEN = [
  { label: 'Transacties',     tabellen: ['transacties', 'imports'] },
  { label: 'Categorieregels', tabellen: ['categorieen'] },
  { label: 'Categorieën',     tabellen: ['budgetten_potjes'] },
  { label: 'Rekeningen',      tabellen: ['rekeningen'] },
  { label: 'Instellingen',    tabellen: ['instellingen'] },
];

const btnPrimary: React.CSSProperties = { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const btnDanger: React.CSSProperties  = { background: 'var(--red)',    color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' };

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalBase: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
  padding: 28, maxWidth: 480, width: '90%', display: 'flex', flexDirection: 'column', gap: 16,
};
const modalRood: React.CSSProperties = { ...modalBase, borderColor: 'var(--red)' };
const btnGrijs: React.CSSProperties = {
  background: 'var(--bg)', color: 'var(--text-h)', border: '1px solid var(--border)',
  borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

export default function BackupRestore() {
  const [backupSelectie, setBackupSelectie] = useState<Set<string>>(
    new Set(TABEL_GROEPEN.map(g => g.label))
  );
  const [backupBezig, setBackupBezig] = useState(false);
  const [backupFout,  setBackupFout]  = useState<string | null>(null);

  // Alles Wissen state
  const [wissenModal,    setWissenModal]    = useState(false);
  const [bevestigenModal,setBevestigenModal]= useState(false);
  const [wissenSelectie, setWissenSelectie] = useState<Set<string>>(new Set(TABEL_GROEPEN.map(g => g.label)));
  const [wissenBackupBezig, setWissenBackupBezig] = useState(false);
  const [wissenTekst,    setWissenTekst]    = useState('');
  const [wissenBezig,    setWissenBezig]    = useState(false);
  const [wissenFout,     setWissenFout]     = useState<string | null>(null);

  // Import modal state
  const fileRef = useRef<HTMLInputElement>(null);
  const [importModal,       setImportModal]       = useState<'selectie' | 'bevestig' | null>(null);
  const [backupData,        setBackupData]        = useState<Record<string, unknown[]> | null>(null);
  const [backupBestandNaam, setBackupBestandNaam] = useState<string>('');
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

  function openImportModal() {
    setBackupData(null);
    setBackupBestandNaam('');
    setRestoreSelectie(new Set());
    setRestoreFout(null);
    setRestoreResultaat(null);
    if (fileRef.current) fileRef.current.value = '';
    setImportModal('selectie');
  }

  function sluitImportModal() {
    setImportModal(null);
    setBackupData(null);
    setBackupBestandNaam('');
    setRestoreSelectie(new Set());
    setRestoreFout(null);
    if (fileRef.current) fileRef.current.value = '';
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
    setRestoreFout(null); setBackupData(null);
    setBackupBestandNaam(file.name);
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

  function toggleWissen(label: string) {
    setWissenSelectie(prev => { const s = new Set(prev); s.has(label) ? s.delete(label) : s.add(label); return s; });
  }

  async function handleWissenBackup() {
    const tabellen = TABEL_GROEPEN.filter(g => wissenSelectie.has(g.label)).flatMap(g => g.tabellen).join(',');
    if (!tabellen) return;
    setWissenBackupBezig(true);
    const res = await fetch(`/api/backup?tabellen=${tabellen}`);
    setWissenBackupBezig(false);
    if (!res.ok) return;
    const blob = await res.blob();
    const datum = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `fbs-backup-${datum}.json`; a.click();
    URL.revokeObjectURL(url);
    setWissenModal(false); setBevestigenModal(true); setWissenTekst(''); setWissenFout(null);
  }

  function handleDoorgaanZonderBackup() {
    setWissenModal(false); setBevestigenModal(true); setWissenTekst(''); setWissenFout(null);
  }

  async function handleDefinitieWissen() {
    if (wissenTekst !== 'WISSEN') return;
    setWissenBezig(true); setWissenFout(null);
    const res = await fetch('/api/reset', { method: 'POST' });
    setWissenBezig(false);
    if (!res.ok) { const d = await res.json(); setWissenFout(d.error ?? 'Reset mislukt.'); return; }
    setBevestigenModal(false);
    window.location.reload();
  }

  async function handleImportBevestigd() {
    if (!backupData) return;
    const body: Record<string, unknown[]> = {};
    TABEL_GROEPEN
      .filter(g => restoreSelectie.has(g.label))
      .flatMap(g => g.tabellen)
      .filter(t => t in backupData)
      .forEach(t => { body[t] = backupData[t]; });
    setRestoreBezig(true); setRestoreFout(null);
    const res = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setRestoreBezig(false);
    if (!res.ok) { const d = await res.json(); setRestoreFout(d.error ?? 'Import mislukt.'); return; }
    setRestoreResultaat(await res.json());
    sluitImportModal();
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
              <label key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-h)', cursor: 'pointer', width: 'fit-content' }}>
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
          {restoreResultaat && (
            <p style={{ color: 'var(--green)', fontSize: 12, marginBottom: 12 }}>
              Import geslaagd:{' '}
              {Object.entries(restoreResultaat).map(([t, n]) => `${t} (${n} records)`).join(', ')}
            </p>
          )}
          <button onClick={openImportModal} style={btnDanger}>Importeer backup</button>
        </div>

        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* Alles Wissen */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', marginBottom: 10 }}>Gevaarzone</p>
          <button onClick={() => setWissenModal(true)} style={{ ...btnDanger, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>☠️</span> Alles Wissen
          </button>
        </div>

      </div>

      {/* IMPORT MODAL — Stap 1: Selectie */}
      {importModal === 'selectie' && (
        <div style={overlayStyle} onClick={sluitImportModal}>
          <div style={modalBase} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>Importeer backup</p>

            {/* Bestandspicker */}
            <div>
              <input id="backup-file-input" ref={fileRef} type="file" accept=".json" onChange={handleFileChange}
                style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />
              <label htmlFor="backup-file-input" style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                border: `1px dashed ${backupData ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 8, cursor: 'pointer', background: backupData ? 'var(--accent-dim)' : 'var(--bg-base)',
              }}>
                <span style={{ fontSize: 18 }}>📂</span>
                <span style={{ fontSize: 13, color: backupData ? 'var(--accent)' : 'var(--text-dim)' }}>
                  {backupBestandNaam || 'Kies een backup bestand (.json)…'}
                </span>
              </label>
              {restoreFout && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>{restoreFout}</p>}
            </div>

            {/* Onderdelen selectie */}
            {backupData && beschikbareGroepen.length > 0 && (
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Welke onderdelen wil je herstellen?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {beschikbareGroepen.map(g => (
                    <label key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-h)', cursor: 'pointer', width: 'fit-content' }}>
                      <input type="checkbox" checked={restoreSelectie.has(g.label)} onChange={() => toggleRestore(g.label)} />
                      {g.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <button onClick={sluitImportModal} style={btnGrijs}>Annuleer</button>
              <button
                onClick={() => setImportModal('bevestig')}
                disabled={!backupData || restoreSelectie.size === 0}
                style={{ ...btnDanger, opacity: !backupData || restoreSelectie.size === 0 ? 0.4 : 1, cursor: !backupData || restoreSelectie.size === 0 ? 'not-allowed' : 'pointer' }}>
                Volgende →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT MODAL — Stap 2: Bevestiging */}
      {importModal === 'bevestig' && (
        <div style={overlayStyle}>
          <div style={modalRood} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--red)', margin: 0 }}>⚠ Bevestig import</p>

            <div>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>De volgende onderdelen worden overschreven:</p>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {TABEL_GROEPEN.filter(g => restoreSelectie.has(g.label)).map(g => (
                  <li key={g.label} style={{ fontSize: 13, color: 'var(--text-h)', fontWeight: 500 }}>{g.label}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid var(--red)', borderRadius: 8, padding: '12px 14px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-h)', margin: 0, lineHeight: 1.5 }}>
                Alle bestaande data in de geselecteerde onderdelen wordt <strong>permanent overschreven</strong> door de inhoud van het backup bestand. Dit kan niet ongedaan worden gemaakt.
              </p>
            </div>

            {restoreFout && <p style={{ color: 'var(--red)', fontSize: 12 }}>{restoreFout}</p>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <button onClick={() => { setImportModal('selectie'); setRestoreFout(null); }} disabled={restoreBezig} style={btnGrijs}>← Terug</button>
              <button onClick={handleImportBevestigd} disabled={restoreBezig}
                style={{ ...btnDanger, opacity: restoreBezig ? 0.6 : 1, cursor: restoreBezig ? 'not-allowed' : 'pointer' }}>
                {restoreBezig ? 'Importeren…' : 'Importeer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAP 2 — Waarschuwingsmodal (Alles Wissen) */}
      {wissenModal && (
        <div style={overlayStyle} onClick={() => setWissenModal(false)}>
          <div style={modalRood} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--red)' }}>⚠️ Alle data wordt gewist</p>

            <div style={{ fontSize: 13, color: 'var(--text-h)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>Dit verdwijnt:</p>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <li>Alle transacties en imports</li>
                  <li>Alle categorieregels</li>
                  <li>Alle categorieën en rekeningen</li>
                  <li>Alle instellingen</li>
                </ul>
              </div>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>Daarna opnieuw nodig:</p>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <li>Rekeningen opnieuw instellen</li>
                  <li>Categorieën opnieuw aanmaken</li>
                  <li>CSV opnieuw importeren</li>
                </ul>
              </div>
            </div>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-h)' }}>Download backup eerst (aanbevolen)</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                {TABEL_GROEPEN.map(g => (
                  <label key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-h)', cursor: 'pointer', width: 'fit-content' }}>
                    <input type="checkbox" checked={wissenSelectie.has(g.label)} onChange={() => toggleWissen(g.label)} />
                    {g.label}
                  </label>
                ))}
              </div>
              <button onClick={handleWissenBackup} disabled={wissenBackupBezig || wissenSelectie.size === 0}
                style={{ ...btnPrimary, fontSize: 12, padding: '6px 14px', opacity: wissenBackupBezig || wissenSelectie.size === 0 ? 0.6 : 1, cursor: wissenBackupBezig || wissenSelectie.size === 0 ? 'not-allowed' : 'pointer', alignSelf: 'flex-start' }}>
                {wissenBackupBezig ? 'Downloaden…' : 'Download backup'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <button onClick={() => setWissenModal(false)} style={btnGrijs}>Annuleren</button>
              <button onClick={handleDoorgaanZonderBackup} style={btnGrijs}>Doorgaan zonder backup</button>
            </div>
          </div>
        </div>
      )}

      {/* STAP 3 — Bevestigingsmodal (Alles Wissen) */}
      {bevestigenModal && (
        <div style={overlayStyle}>
          <div style={modalRood}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--red)' }}>Definitief wissen</p>
            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              Dit kan niet ongedaan worden gemaakt. Typ <strong style={{ color: 'var(--text-h)' }}>WISSEN</strong> om te bevestigen.
            </p>
            <input
              type="text"
              value={wissenTekst}
              onChange={e => setWissenTekst(e.target.value)}
              placeholder="WISSEN"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-h)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
            {wissenFout && <p style={{ color: 'var(--red)', fontSize: 12 }}>{wissenFout}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <button onClick={() => { setBevestigenModal(false); setWissenTekst(''); setWissenFout(null); }} style={btnGrijs} disabled={wissenBezig}>Annuleren</button>
              <button
                onClick={handleDefinitieWissen}
                disabled={wissenTekst !== 'WISSEN' || wissenBezig}
                style={{ ...btnDanger, opacity: wissenTekst !== 'WISSEN' || wissenBezig ? 0.4 : 1, cursor: wissenTekst !== 'WISSEN' || wissenBezig ? 'not-allowed' : 'pointer' }}>
                {wissenBezig ? 'Wissen…' : 'Definitief wissen'}
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
