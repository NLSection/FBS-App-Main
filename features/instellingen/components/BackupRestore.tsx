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

import { useEffect, useState, useRef } from 'react';
import InfoTooltip from '@/components/InfoTooltip';

const TABEL_GROEPEN = [
  { label: 'Transacties',     tabellen: ['transacties', 'imports', 'transactie_aanpassingen'] },
  { label: 'Categorieregels', tabellen: ['categorieen'] },
  { label: 'Categorieën',     tabellen: ['budgetten_potjes', 'budgetten_potjes_rekeningen', 'subcategorieen'] },
  { label: 'Rekeningen',      tabellen: ['rekeningen', 'genegeerde_rekeningen', 'rekening_groepen', 'rekening_groep_rekeningen'] },
  { label: 'Vaste Posten',    tabellen: ['vaste_posten_config'] },
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
  const [bewaarDagen, setBewaarDagen] = useState(7);
  const [minBewaard, setMinBewaard]   = useState(3);
  const [externPad, setExternPad]     = useState('');
  const [externPadOpgeslagen, setExternPadOpgeslagen] = useState(false);

  // Encryptie state
  const [encryptieIngesteld, setEncryptieIngesteld] = useState(false);
  const [encryptieHint, setEncryptieHint]           = useState<string | null>(null);
  const [encWachtwoord, setEncWachtwoord]           = useState('');
  const [encHint, setEncHint]                       = useState('');
  const [encHuidig, setEncHuidig]                   = useState('');
  const [laatsteBackup, setLaatsteBackup]             = useState<{ naam: string; datum: string; grootte: number } | null>(null);
  const [encBezig, setEncBezig]                     = useState(false);
  const [encFout, setEncFout]                       = useState<string | null>(null);
  const [encSucces, setEncSucces]                   = useState(false);
  const [herstelsleutel, setHerstelsleutel]         = useState<string | null>(null);

  const [encryptieUitgeklapt, setEncryptieUitgeklapt] = useState(false);
  const [publicerenBezig, setPublicerenBezig] = useState(false);
  const [publicerenSucces, setPublicerenSucces] = useState(false);
  const [resetBezig, setResetBezig] = useState(false);
  const [resetBevestig, setResetBevestig] = useState(false);

  // Multi-device koppel state
  const [externConfigBestaat, setExternConfigBestaat] = useState(false);
  const [externConfigHint, setExternConfigHint]       = useState<string | null>(null);
  const [koppelWachtwoord, setKoppelWachtwoord]       = useState('');
  const [koppelBezig, setKoppelBezig]                 = useState(false);
  const [koppelFout, setKoppelFout]                   = useState<string | null>(null);
  const [koppelSucces, setKoppelSucces]               = useState(false);

  async function checkExternConfig() {
    try {
      const res = await fetch('/api/backup/extern-config');
      if (res.ok) {
        const d = await res.json() as { exists: boolean; hint: string | null };
        setExternConfigBestaat(d.exists);
        setExternConfigHint(d.hint);
      }
    } catch { /* extern niet bereikbaar */ }
  }

  function refreshLaatsteBackup() {
    fetch('/api/backup/lijst?bron=lokaal').then(r => r.ok ? r.json() : null).then((d: { bestanden: { naam: string; datum: string; grootte: number }[] } | null) => {
      if (d?.bestanden?.length) setLaatsteBackup(d.bestanden[0]);
    }).catch(() => {});
  }

  useEffect(() => {
    fetch('/api/instellingen').then(r => r.ok ? r.json() : null).then((d: { backupBewaarDagen?: number; backupMinBewaard?: number; backupExternPad?: string | null } | null) => {
      if (d) {
        setBewaarDagen(d.backupBewaarDagen ?? 7);
        setMinBewaard(d.backupMinBewaard ?? 3);
        setExternPad(d.backupExternPad ?? '');
        if (d.backupExternPad) checkExternConfig();
      }
    }).catch(() => {});
    fetch('/api/backup/encryptie').then(r => r.ok ? r.json() : null).then((d: { ingesteld: boolean; hint: string | null } | null) => {
      if (d) { setEncryptieIngesteld(d.ingesteld); setEncryptieHint(d.hint); }
    }).catch(() => {});
    refreshLaatsteBackup();

    const onVisible = () => { if (document.visibilityState === 'visible') refreshLaatsteBackup(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  async function opslaanBackupInst(update: { backupBewaarDagen?: number; backupMinBewaard?: number; backupExternPad?: string | null }) {
    await fetch('/api/instellingen', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
  }

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
  const [importModal,       setImportModal]       = useState<'bron' | 'bestanden' | 'bevestig' | null>(null);
  const [importBron,        setImportBron]         = useState<'lokaal' | 'extern' | null>(null);
  const [backupLijst,       setBackupLijst]        = useState<{ naam: string; grootte: number; datum: string; versleuteld: boolean }[]>([]);
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
    setBackupLijst([]);
    setImportBron(null);
    setImportModal('bron');
  }

  async function kiesBron(bron: 'lokaal' | 'extern') {
    setImportBron(bron);
    const res = await fetch(`/api/backup/lijst?bron=${bron}`);
    if (res.ok) {
      const data = await res.json();
      setBackupLijst(data.bestanden ?? []);
      setImportModal('bestanden');
    } else {
      const d = await res.json().catch(() => ({}));
      setRestoreFout((d as { error?: string }).error ?? 'Laden mislukt.');
    }
  }

  async function kiesBestand(naam: string) {
    setRestoreFout(null);
    const res = await fetch(`/api/backup/lees?bron=${importBron}&bestand=${encodeURIComponent(naam)}`);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setRestoreFout((d as { error?: string }).error ?? 'Bestand kon niet gelezen worden.');
      return;
    }
    const parsed = await res.json();
    setBackupData(parsed);
    setBackupBestandNaam(naam);
    setRestoreSelectie(new Set(
      TABEL_GROEPEN.filter(g => g.tabellen.some(t => t in parsed)).map(g => g.label)
    ));
    setImportModal('bevestig');
  }

  function openVrijePicker() {
    setImportModal(null);
    if (fileRef.current) { fileRef.current.value = ''; fileRef.current.click(); }
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
    const datum = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Amsterdam' }).replace(' ', '_').replace(/:/g, '-');
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
    reader.onload = async ev => {
      try {
        let json: string;
        const result = ev.target?.result;
        if (file.name.endsWith('.gz')) {
          // Decomprimeer gzip in de browser via DecompressionStream
          const ds = new DecompressionStream('gzip');
          const blob = new Blob([result as ArrayBuffer]);
          const stream = blob.stream().pipeThrough(ds);
          json = await new Response(stream).text();
        } else {
          json = result as string;
        }
        const parsed = JSON.parse(json);
        setBackupData(parsed);
        setRestoreSelectie(new Set(
          TABEL_GROEPEN.filter(g => g.tabellen.some(t => t in parsed)).map(g => g.label)
        ));
        setImportModal('bevestig');
      } catch {
        setRestoreFout('Ongeldig backup bestand.');
      }
    };
    if (file.name.endsWith('.gz')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
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
    const datum = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Amsterdam' }).replace(' ', '_').replace(/:/g, '-');
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
    // Maak eerst een automatische backup vóór import (veiligheidsnet)
    try { await fetch('/api/backup/trigger', { method: 'POST' }); } catch { /* ga toch door */ }
    const res = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setRestoreBezig(false);
    if (!res.ok) { const d = await res.json(); setRestoreFout(d.error ?? 'Import mislukt.'); return; }
    setRestoreResultaat(await res.json());
    sluitImportModal();
    window.location.reload();
  }

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <p className="section-title" style={{ margin: 0 }}>Backup &amp; Restore</p>
        <InfoTooltip volledigeBreedte tekst={<>
          <p style={{ margin: '0 0 8px' }}>De app slaat automatisch backups op van je data. Een backup is een momentopname van je database — transacties, categorieën, rekeningen en instellingen — die je later kunt herstellen als er iets misgaat.</p>
          <p style={{ margin: '0 0 8px' }}><strong>Lokale backup:</strong> wordt automatisch aangemaakt naast de database op dit apparaat. Altijd beschikbaar, ook zonder internetverbinding of extern opslagmedium.</p>
          <p style={{ margin: 0 }}><strong>Externe backup:</strong> een tweede kopie op een andere locatie, zoals een NAS of OneDrive-map. Gebruik dit voor extra veiligheid of om meerdere apparaten gesynchroniseerd te houden.</p>
        </>} />
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Laatste backup info */}
        {laatsteBackup && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-dim)' }}>
            <span style={{ color: 'var(--green)' }}>✓</span>
            Laatste backup: {new Date(laatsteBackup.datum).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })} ({(laatsteBackup.grootte / 1024).toFixed(0)} KB)
          </div>
        )}

        {/* Auto-backup instellingen */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', margin: 0 }}>Automatische backup</p>
            <InfoTooltip volledigeBreedte tekst="Na elke wijziging wordt automatisch een backup aangemaakt. Backups ouder dan de bewaartermijn worden verwijderd, maar het minimum aantal wordt altijd bewaard — zelfs als ze ouder zijn. Zo heb je altijd een recente én een oudere versie beschikbaar." />
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, color: 'var(--text)' }}>
              Bewaartermijn
              <select value={bewaarDagen} onChange={e => { const v = parseInt(e.target.value); setBewaarDagen(v); opslaanBackupInst({ backupBewaarDagen: v }); }}
                style={{ marginLeft: 8, background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 13, color: 'var(--text-h)' }}>
                {[1, 3, 7, 14, 30, 60, 90].map(d => (
                  <option key={d} value={d}>{d} {d === 1 ? 'dag' : 'dagen'}</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 13, color: 'var(--text)' }}>
              Minimum bewaard
              <select value={minBewaard} onChange={e => { const v = parseInt(e.target.value); setMinBewaard(v); opslaanBackupInst({ backupMinBewaard: v }); }}
                style={{ marginLeft: 8, background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 13, color: 'var(--text-h)' }}>
                {[1, 2, 3, 5, 10, 20].map(d => (
                  <option key={d} value={d}>{d} backups</option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>Externe backup locatie</label>
              <InfoTooltip volledigeBreedte tekst={<>
                <p style={{ margin: '0 0 8px' }}>Stel een tweede locatie in waar automatische backups naartoe gekopieerd worden — bijvoorbeeld een netwerkschijf (NAS), een USB-schijf of een map in OneDrive/Dropbox. Lokale backups naast de database blijven altijd bewaard.</p>
                <p style={{ margin: '0 0 8px' }}><strong>Eén apparaat:</strong> gebruik dit als extra beveiliging. Backups staan dan op twee plekken, zodat je data veilig is als je harde schijf uitvalt.</p>
                <p style={{ margin: '0 0 8px' }}><strong>Meerdere apparaten:</strong> stel op elk apparaat dezelfde externe locatie in. De app controleert bij elke start of er een nieuwere backup beschikbaar is en vraagt of je wilt bijwerken. Het eerste apparaat dat de locatie instelt is het primaire apparaat. Extra apparaten koppel je via de versleutelingsinstelling hieronder.</p>
                <p style={{ margin: 0 }}><strong>Synchronisatieconflict:</strong> als de externe locatie tijdelijk niet bereikbaar was en je op meerdere apparaten wijzigingen hebt gemaakt, detecteert de app dit automatisch. Je kunt dan kiezen welke versie je wilt behouden.</p>
              </>} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                value={externPad}
                onChange={e => { setExternPad(e.target.value); setExternPadOpgeslagen(false); }}
                placeholder={String.raw`\\NAS\Backup\FBS of C:\Users\Naam\OneDrive\FBS-Backup`}
                style={{ flex: 1, background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', fontSize: 13, color: 'var(--text-h)' }}
              />
              <button
                onClick={async () => {
                  try {
                    const { open } = await import('@tauri-apps/plugin-dialog');
                    const pad = await open({ directory: true, title: 'Kies externe backup locatie' });
                    if (pad && typeof pad === 'string') { setExternPad(pad); setExternPadOpgeslagen(false); }
                  } catch {
                    // Tauri niet beschikbaar — pad handmatig invoeren
                  }
                }}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Bladeren…
              </button>
              <button
                onClick={async () => {
                  await opslaanBackupInst({ backupExternPad: externPad.trim() || null });
                  setExternPadOpgeslagen(true);
                  setTimeout(() => setExternPadOpgeslagen(false), 3000);
                  if (externPad.trim()) { await checkExternConfig(); } else { setExternConfigBestaat(false); setExternConfigHint(null); }
                }}
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {externPadOpgeslagen ? '✓ Opgeslagen' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>

        {/* Encryptie — alleen tonen als externe locatie is ingesteld */}
        {externPad.trim() && <>
        <div style={{ borderTop: '1px solid var(--border)' }} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', margin: 0 }}>Versleuteling externe backups</p>
            <InfoTooltip volledigeBreedte tekst={<>
              <p style={{ margin: '0 0 8px' }}>Versleutelt de backups op de externe locatie met AES-256, zodat niemand zonder wachtwoord de inhoud kan lezen. Nuttig als de externe locatie gedeeld is of buiten je eigen netwerk staat. Lokale backups naast de database blijven altijd onversleuteld — zodat je altijd toegang hebt tot je data.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Wachtwoord:</strong> stel een sterk wachtwoord in en bewaar de geheugensteun op een veilige plek.</p>
              <p style={{ margin: '0 0 8px' }}><strong>Herstelsleutel:</strong> bij het instellen wordt eenmalig een herstelsleutel gegenereerd. Bewaar deze goed — je kunt hem gebruiken als vervanging voor het wachtwoord bij het ontsleutelen van backups of het koppelen van een extra apparaat. Als je zowel het wachtwoord als de herstelsleutel kwijtraakt zijn de versleutelde externe backups niet meer te openen.</p>
              <p style={{ margin: 0 }}><strong>Meerdere apparaten:</strong> het eerste apparaat stelt het wachtwoord in. Extra apparaten gebruiken de koppelfunctie — je voert daar het wachtwoord of de herstelsleutel in van het eerste apparaat, zodat alle apparaten dezelfde versleuteling gebruiken.</p>
            </>} />
            <span style={{ fontSize: 12, color: encryptieIngesteld ? 'var(--green)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {encryptieIngesteld
                ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Actief</>
                : 'Niet ingesteld'}
            </span>
            {encryptieIngesteld && !externConfigBestaat && (
              <button disabled={publicerenBezig} onClick={async () => {
                setPublicerenBezig(true); setPublicerenSucces(false);
                const res = await fetch('/api/backup/encryptie/publiceer', { method: 'POST' });
                setPublicerenBezig(false);
                if (res.ok) { setPublicerenSucces(true); setExternConfigBestaat(true); setTimeout(() => setPublicerenSucces(false), 3000); }
              }} style={{ background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 6, padding: '3px 10px', fontSize: 12, cursor: 'pointer' }}>
                {publicerenBezig ? 'Bezig…' : publicerenSucces ? '✓ Gepubliceerd' : 'Publiceren naar extern'}
              </button>
            )}
            <button onClick={() => setEncryptieUitgeklapt(v => !v)}
              style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>
              {encryptieUitgeklapt ? 'Inklappen' : 'Wijzigen'}
            </button>
          </div>
          {encryptieUitgeklapt && <div style={{ marginTop: 12 }}>
          {encryptieIngesteld ? (
            <div>
              <p style={{ fontSize: 12, color: 'var(--green)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Versleuteling is actief
              </p>
              {!resetBevestig ? (
                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
                  <button onClick={() => setResetBevestig(true)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                    Wachtwoord vergeten?
                  </button>
                </p>
              ) : (
                <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--bg-base)', border: '1px solid var(--red)', borderRadius: 6, fontSize: 12 }}>
                  {encryptieHint && (
                    <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 10, marginBottom: 12 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 11, color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.04em' }}>Geheugensteun</p>
                      <p style={{ margin: 0, color: 'var(--text-h)', fontStyle: 'italic', fontSize: 13 }}>{encryptieHint}</p>
                    </div>
                  )}
                  <p style={{ margin: '0 0 8px', color: 'var(--text)' }}>Bestaande versleutelde backups worden hierna onleesbaar. Lokale backups blijven beschikbaar.</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setResetBevestig(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--text)' }}>Annuleren</button>
                    <button disabled={resetBezig} onClick={async () => {
                      setResetBezig(true);
                      const res = await fetch('/api/backup/encryptie/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verwijderExternConfig: true }) });
                      setResetBezig(false);
                      if (res.ok) { setEncryptieIngesteld(false); setEncryptieHint(null); setExternConfigBestaat(false); setResetBevestig(false); setEncryptieUitgeklapt(false); }
                    }} style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', opacity: resetBezig ? 0.6 : 1 }}>
                      {resetBezig ? 'Bezig…' : 'Instellingen wissen'}
                    </button>
                  </div>
                </div>
              )}

              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Wachtwoord wijzigen:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 350 }}>
                <input type="password" placeholder="Huidig wachtwoord of herstelsleutel" value={encHuidig} onChange={e => setEncHuidig(e.target.value)}
                  style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', fontSize: 13, color: 'var(--text-h)' }} />
                <input type="password" placeholder="Nieuw wachtwoord" value={encWachtwoord} onChange={e => setEncWachtwoord(e.target.value)}
                  style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', fontSize: 13, color: 'var(--text-h)' }} />
                <input type="text" placeholder="Nieuwe geheugensteun" value={encHint} onChange={e => setEncHint(e.target.value)}
                  style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', fontSize: 13, color: 'var(--text-h)' }} />
                {encFout && <p style={{ color: 'var(--red)', fontSize: 12, margin: 0 }}>{encFout}</p>}
                {encSucces && <p style={{ color: 'var(--green)', fontSize: 12, margin: 0 }}>Wachtwoord gewijzigd.</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button disabled={encBezig || !encHuidig || !encWachtwoord || !encHint}
                    onClick={async () => {
                      setEncBezig(true); setEncFout(null); setEncSucces(false);
                      const res = await fetch('/api/backup/encryptie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wachtwoord: encWachtwoord, hint: encHint, huidigWachtwoord: encHuidig }) });
                      setEncBezig(false);
                      if (!res.ok) { const d = await res.json().catch(() => ({})); setEncFout((d as { error?: string }).error ?? 'Wijzigen mislukt.'); }
                      else { const d = await res.json(); setEncSucces(true); setEncHuidig(''); setEncWachtwoord(''); setEncHint(''); setEncryptieHint(encHint); if (d.herstelsleutel) setHerstelsleutel(d.herstelsleutel); }
                    }}
                    style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: !encHuidig || !encWachtwoord || !encHint ? 0.5 : 1 }}>
                    Wijzigen
                  </button>
                  <button disabled={encBezig || !encHuidig}
                    onClick={async () => {
                      setEncBezig(true); setEncFout(null);
                      const res = await fetch('/api/backup/encryptie', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wachtwoord: encHuidig }) });
                      setEncBezig(false);
                      if (!res.ok) { const d = await res.json().catch(() => ({})); setEncFout((d as { error?: string }).error ?? 'Uitschakelen mislukt.'); }
                      else { setEncryptieIngesteld(false); setEncryptieHint(null); setEncHuidig(''); }
                    }}
                    style={{ background: 'none', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', opacity: !encHuidig ? 0.5 : 1 }}>
                    Uitschakelen
                  </button>
                </div>
              </div>
            </div>
          ) : externConfigBestaat ? (
            /* Secondary device: koppelen aan bestaande configuratie */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>
                  Op de externe locatie is al een versleutelde configuratie gevonden van een ander apparaat. Voer het wachtwoord of de herstelsleutel in om dit apparaat te koppelen. Er wordt geen nieuwe herstelsleutel aangemaakt — die heb je al van het eerste apparaat.
                </p>
                <InfoTooltip volledigeBreedte tekst="Door te koppelen gebruik je dezelfde versleuteling als het eerste apparaat. Daarna kunnen backups van dat apparaat op dit apparaat gelezen worden en andersom. Gebruik het wachtwoord dat je hebt ingesteld op het eerste apparaat, of de herstelsleutel die je bij het instellen hebt gekregen." />
              </div>
              {externConfigHint && <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Hint: {externConfigHint}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 350 }}>
                <input type="password" placeholder="Wachtwoord of herstelsleutel" value={koppelWachtwoord} onChange={e => setKoppelWachtwoord(e.target.value)}
                  style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', fontSize: 13, color: 'var(--text-h)' }} />
                {koppelFout && <p style={{ color: 'var(--red)', fontSize: 12, margin: 0 }}>{koppelFout}</p>}
                {koppelSucces && <p style={{ color: 'var(--green)', fontSize: 12, margin: 0 }}>Gekoppeld — versleuteling is actief.</p>}
                <button disabled={koppelBezig || !koppelWachtwoord}
                  onClick={async () => {
                    setKoppelBezig(true); setKoppelFout(null); setKoppelSucces(false);
                    const res = await fetch('/api/backup/encryptie/koppel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wachtwoord: koppelWachtwoord }) });
                    setKoppelBezig(false);
                    if (!res.ok) { const d = await res.json().catch(() => ({})); setKoppelFout((d as { error?: string }).error ?? 'Koppelen mislukt.'); }
                    else { setKoppelSucces(true); setKoppelWachtwoord(''); setEncryptieIngesteld(true); setEncryptieHint(externConfigHint); }
                  }}
                  style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: !koppelWachtwoord ? 0.5 : 1, alignSelf: 'flex-start' }}>
                  {koppelBezig ? 'Koppelen…' : 'Koppelen'}
                </button>
              </div>
            </div>
          ) : (
            /* Primary device: nieuwe encryptie instellen */
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
                Stel een wachtwoord in om externe backups te versleutelen met AES-256. Lokale backups blijven onversleuteld. Het wachtwoord kan niet hersteld worden — bewaar de geheugensteun goed.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 350 }}>
                <input type="password" placeholder="Wachtwoord" value={encWachtwoord} onChange={e => setEncWachtwoord(e.target.value)}
                  style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', fontSize: 13, color: 'var(--text-h)' }} />
                <input type="text" placeholder="Geheugensteun (verplicht)" value={encHint} onChange={e => setEncHint(e.target.value)}
                  style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px', fontSize: 13, color: 'var(--text-h)' }} />
                {encFout && <p style={{ color: 'var(--red)', fontSize: 12, margin: 0 }}>{encFout}</p>}
                <button disabled={encBezig || !encWachtwoord || !encHint}
                  onClick={async () => {
                    setEncBezig(true); setEncFout(null);
                    const res = await fetch('/api/backup/encryptie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wachtwoord: encWachtwoord, hint: encHint }) });
                    setEncBezig(false);
                    if (!res.ok) { const d = await res.json().catch(() => ({})); setEncFout((d as { error?: string }).error ?? 'Instellen mislukt.'); }
                    else { const d = await res.json(); setEncryptieIngesteld(true); setEncryptieHint(encHint); setEncWachtwoord(''); setEncHint(''); setExternConfigBestaat(true); if (d.herstelsleutel) setHerstelsleutel(d.herstelsleutel); }
                  }}
                  style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: !encWachtwoord || !encHint ? 0.5 : 1, alignSelf: 'flex-start' }}>
                  Versleuteling inschakelen
                </button>
              </div>
            </div>
          )}
          </div>}
        </div>
        </>}

        <div style={{ borderTop: '1px solid var(--border)' }} />

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
          <input ref={fileRef} type="file" accept=".json,.json.gz,.gz" onChange={handleFileChange}
            style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />
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

      {/* IMPORT MODAL — Bron keuze */}
      {importModal === 'bron' && (
        <div style={overlayStyle} onClick={sluitImportModal}>
          <div style={modalBase} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>Importeer backup</p>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>Kies de locatie van het backup bestand:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => kiesBron('lokaal')}
                style={{ ...btnPrimary, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>💾</span> Lokale backups
              </button>
              {externPad.trim() && (
                <button onClick={() => kiesBron('extern')}
                  style={{ ...btnPrimary, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🌐</span> Externe locatie
                </button>
              )}
              <button onClick={openVrijePicker}
                style={{ ...btnGrijs, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>📂</span> Ander bestand kiezen…
              </button>
            </div>
            {restoreFout && <p style={{ color: 'var(--red)', fontSize: 12, margin: 0 }}>{restoreFout}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={sluitImportModal} style={btnGrijs}>Annuleer</button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT MODAL — Bestanden lijst */}
      {importModal === 'bestanden' && (
        <div style={overlayStyle} onClick={sluitImportModal}>
          <div style={{ ...modalBase, maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-h)', margin: 0 }}>
              {importBron === 'extern' ? 'Externe backups' : 'Lokale backups'}
            </p>
            {backupLijst.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Geen backups gevonden op deze locatie.</p>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {backupLijst.map(b => (
                  <button key={b.naam} onClick={() => kiesBestand(b.naam)}
                    style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-h)', fontWeight: 500 }}>
                        {new Date(b.datum).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        {b.naam} — {(b.grootte / 1024).toFixed(0)} KB
                        {b.versleuteld && <span style={{ marginLeft: 6, color: 'var(--accent)' }}>🔒</span>}
                      </div>
                    </div>
                    <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>→</span>
                  </button>
                ))}
              </div>
            )}
            {restoreFout && <p style={{ color: 'var(--red)', fontSize: 12, margin: 0 }}>{restoreFout}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <button onClick={() => setImportModal('bron')} style={btnGrijs}>← Terug</button>
              <button onClick={sluitImportModal} style={btnGrijs}>Annuleer</button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT MODAL — Bevestiging */}
      {importModal === 'bevestig' && backupData && (
        <div style={overlayStyle} onClick={sluitImportModal}>
          <div style={modalRood} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--red)', margin: 0 }}>⚠ Importeer backup</p>

            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>
              Bestand: <strong style={{ color: 'var(--text-h)' }}>{backupBestandNaam}</strong>
            </p>

            {beschikbareGroepen.length > 0 && (
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>Welke onderdelen wil je herstellen?</p>
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

            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid var(--red)', borderRadius: 8, padding: '12px 14px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-h)', margin: 0, lineHeight: 1.5 }}>
                Alle bestaande data in de geselecteerde onderdelen wordt <strong>permanent overschreven</strong> door de inhoud van het backup bestand. Er wordt automatisch een backup van de huidige staat gemaakt vóór de import.
              </p>
            </div>

            {restoreFout && <p style={{ color: 'var(--red)', fontSize: 12 }}>{restoreFout}</p>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <button onClick={sluitImportModal} disabled={restoreBezig} style={btnGrijs}>Annuleer</button>
              <button onClick={handleImportBevestigd} disabled={restoreBezig || restoreSelectie.size === 0}
                style={{ ...btnDanger, opacity: restoreBezig || restoreSelectie.size === 0 ? 0.4 : 1, cursor: restoreBezig || restoreSelectie.size === 0 ? 'not-allowed' : 'pointer' }}>
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

      {/* Herstelsleutel modal */}
      {herstelsleutel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', minWidth: 400, maxWidth: 520, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <div style={{ background: 'var(--accent)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
              <span style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>Herstelsleutel</span>
            </div>
            <div style={{ padding: '20px 24px 24px' }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                Bewaar deze herstelsleutel op een <strong>veilige plek buiten de app</strong> — bijvoorbeeld afgedrukt in een kluis of in een wachtwoordmanager.
                <strong style={{ color: 'var(--red)' }}> Deze sleutel wordt niet meer getoond.</strong>
              </p>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                Je hebt de herstelsleutel nodig als je je wachtwoord bent vergeten — als alternatief bij het uitschakelen van versleuteling of het koppelen van een extra apparaat. Zonder wachtwoord én herstelsleutel zijn versleutelde backups permanent onleesbaar.
              </p>
              <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', textAlign: 'center', marginBottom: 16 }}>
                <code style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2, color: 'var(--text-h)' }}>{herstelsleutel}</code>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => { navigator.clipboard.writeText(herstelsleutel); }}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                  Kopiëren
                </button>
                <button onClick={() => {
                  const w = window.open('', '_blank', 'width=500,height=300');
                  if (w) {
                    w.document.write(`<html><head><title>FBS Herstelsleutel</title><style>body{font-family:sans-serif;padding:40px;text-align:center}h2{margin-bottom:8px}code{font-size:24px;letter-spacing:2px;font-weight:bold}p{color:#666;font-size:13px}</style></head><body><h2>FBS Backup Herstelsleutel</h2><code>${herstelsleutel}</code><p>Bewaar deze sleutel op een veilige plek.</p><script>window.print();window.close();</script></body></html>`);
                    w.document.close();
                  }
                }}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
                  Afdrukken
                </button>
                <button onClick={() => setHerstelsleutel(null)}
                  style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Ik heb de sleutel bewaard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
