// FILE: page.tsx
// AANGEMAAKT: 25-03-2026 14:00
// VERSIE: 1
// GEWIJZIGD: 03-04-2026 17:45
//
// WIJZIGINGEN (03-04-2026 17:45):
// - CAT subtabel: kolommen gelijkgetrokken met BLS subtabel (36px actiekolom + 28px padding)
// - Wrapper maxWidth ook bij openCatSubRows (CAT subtabel uitklap)
// - BLS categorienaam fontSize 14 (gelijk aan CAT)
// - BLS+CAT wrapper dynamisch: fit-content als ingeklapt, maxWidth 1150 als uitgeklapt
// - Omschrijving td: title attribuut voor volledige tekst op hover
// - BLS+CAT wrapper: overflowX auto; beide table-wrappers minWidth 760px; BLS table width 100%
// - Subtabel kolommen vaste breedtes; subtabel minWidth 900; BLS+CAT wrappers minWidth 966
// - Revert breedte-overrides; subtabel tableLayout fixed met auto Omschrijving kolom
// WIJZIGINGEN (03-04-2026 03:00):
// - CAT-tabel: Samenvatting per Categorie sectie onder BLS-tabel
// WIJZIGINGEN (03-04-2026 01:00):
// - Rekening-badges: hex-kleur via hash + kleurBg() achtergrond, zelfde stijl als categorie-badges
// - Volgorde omgedraaid: hoort-op links, gedaan-op rechts; indicator richting aangepast
// - Chevron-tekens: enkele chevrons (‹›) i.p.v. guillemets; ||| met zelfde spacing
// WIJZIGINGEN (03-04-2026 00:30):
// - Rekening-badges groter (13px, padding 4px 12px) en minder fel (hsl h,35%,45%)
// - Richtingsindicator groter (18px), ruimer (gap 2px, letter-spacing 1px) en trager (2.5s cycle)
// WIJZIGINGEN (03-04-2026 00:00):
// - Hover fix: hoofdrij als directe <tr> i.p.v. geneste tabel; subtabel in aparte <tr>.bls-expand
// WIJZIGINGEN (02-04-2026 23:30):
// - Subtabel colgroup voor uitlijning; Rekening-kolom met geanimeerde richtingsindicator
// - Hash-gebaseerde kleuren per rekeningnaam; badge-label uitgebreid bij meerdere voorkomens
// WIJZIGINGEN (02-04-2026 23:00):
// - Badge-stijl overgenomen van transactiepagina (kleurBg, potje-kleur, badge/badge-outline classes)
// - Hover: alleen actieve rij kleurt, niet de outer wrapper-rij (bls-outer class)
// - Bedragkleuren: rood <0, groen >0, blauw =0 — consistent in hoofd- en subtabel
// WIJZIGINGEN (02-04-2026 22:00):
// - Bedragen hoofdrij uitlijnen onder kolomkoppen; Rekening kolom verwijderd; Subcategorie kolom toegevoegd
// - Hele subtabel-rij klikbaar voor CategoriePopup; omboekingen zichtbaar in subtabel
// WIJZIGINGEN (02-04-2026 21:00):
// - Categorie-badge per subtabel-transactie: opent CategoriePopup, herlaadt BLS na opslaan
// WIJZIGINGEN (02-04-2026 20:00):
// - BLS-tabel rijen klikbaar: klapt uit met subtabel van onderliggende transacties
// WIJZIGINGEN (31-03-2026 21:00):
// - Volledige herbouw: periodenavigatie, BLS-tabel, categorieoverzicht
// WIJZIGINGEN (31-03-2026 22:00):
// - BlsRegel interface aangepast aan nieuw endpoint formaat (bedrag, gedaanOpRekening, hoortOpRekening)
// - BLS tabel: categorie kolom toont [categorie] · [gedaanOpRekening] → [hoortOpRekening]
// WIJZIGINGEN (31-03-2026 23:00):
// - Totaalrij verwijderd uit BLS-tabel
// - Cumulatief toggle vervangen door Alle knop; layout gelijkgetrokken met TransactiesTabel
// - Alle modus: BLS laadt over heel geselecteerd jaar ipv één maand
// - Categorieoverzicht sectie verwijderd (niet meer beschikbaar in nieuw formaat)
// WIJZIGINGEN (01-04-2026 00:30):
// - BLS: totaalrij verwijderd
// - BLS: badges compacter (font 10px, padding 0/4px), pijl → ipv ──→, rij minder hoog
// - BLS: groen ✓ naast categorienaam bij saldo = 0
// WIJZIGINGEN (31-03-2026 23:59):
// - BLS tabel: twee-laags rijen (categorienaam + badge-pijlvisualisatie)
// - Saldo kleur: groen >0, rood <0, grijs =0
// - Linkerborder per rij: groen bij saldo=0, rood bij saldo≠0
// - Totaalrij terug met dezelfde saldo-kleurlogica

'use client';

import { Fragment, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Periode } from '@/lib/maandperiodes';
import CategoriePopup from '@/features/shared/components/CategoriePopup';
import type { PatronModalData } from '@/features/shared/components/CategoriePopup';
import type { TransactieMetCategorie } from '@/lib/transacties';
import { kiesAutomatischeKleur } from '@/lib/kleuren';
import MaandFilter from '@/components/MaandFilter';
import { maakNaamChips, analyseerOmschrijvingen } from '@/features/shared/utils/naamChips';

const MAAND_NAMEN = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];
const MAAND_KORT  = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

interface BlsTransactie {
  id: number;
  datum: string | null;
  naam_tegenpartij: string | null;
  omschrijving: string | null;
  bedrag: number | null;
  rekening_naam: string | null;
  categorie_id: number | null;
  categorie: string | null;
  subcategorie: string | null;
  toelichting: string | null;
  type: string;
  tegenrekening_iban_bban: string | null;
  omschrijving_1: string | null;
  omschrijving_2: string | null;
  omschrijving_3: string | null;
  handmatig_gecategoriseerd: number;
}

interface BudgetPotjeNaam { id: number; naam: string; kleur: string | null; rekening_ids: number[]; }
interface Rekening { id: number; naam: string; iban: string; kleur: string | null; }
interface RekeningGroep { id: number; naam: string; volgorde: number; rekening_ids: number[]; }

interface BlsRegel {
  categorie: string;
  gedaanOpRekening: string;
  hoortOpRekening: string;
  bedrag: number;
  gecorrigeerd: number;
  saldo: number;
  transacties: BlsTransactie[];
}

interface CatSubrij { subcategorie: string; bedrag: number; }
interface CatRegel { categorie: string; totaal: number; subrijen: CatSubrij[]; }
interface CatSubTrx {
  id: number;
  datum: string | null;
  naam_tegenpartij: string | null;
  omschrijving: string | null;
  bedrag: number | null;
  rekening_naam: string | null;
  categorie_id: number | null;
  categorie: string | null;
  subcategorie: string | null;
  toelichting: string | null;
  type: string;
  tegenrekening_iban_bban: string | null;
  omschrijving_1: string | null;
  omschrijving_2: string | null;
  omschrijving_3: string | null;
  handmatig_gecategoriseerd: number;
}
type MenuState = { key: string; top: number; left: number; items: { label: string; url: string }[] };

function formatBedrag(bedrag: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag);
}

function kleurBg(hex: string): string {
  if (!hex.startsWith('#') || hex.length < 7) return 'var(--accent-dim)';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.15)`;
}

function bedragKleur(bedrag: number): string {
  return bedrag < 0 ? 'var(--red)' : bedrag > 0 ? 'var(--green)' : 'var(--accent)';
}

function hashKleur(naam: string): string {
  let hash = 0;
  for (let i = 0; i < naam.length; i++) {
    hash = naam.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = ((Math.abs(hash) % 360) + 360) % 360;
  const s = 0.45, l = 0.55;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// Volgorde: [gedaan-op] indicator [hoort-op]
// Saldo < 0: geld moet van gedaan-op (links) naar hoort-op (rechts) → ⟩⟩⟩ rood
// Saldo > 0: geld moet van hoort-op (rechts) naar gedaan-op (links) → ⟨⟨⟨ groen
// Saldo = 0: in balans → ||| blauw
function RichtingsIndicator({ saldo }: { saldo: number }) {
  if (saldo < 0) {
    return (
      <span className="bls-flow flow-left" style={{ color: 'var(--red)' }}>
        <span>⟨</span><span>⟨</span><span>⟨</span>
      </span>
    );
  }
  if (saldo > 0) {
    return (
      <span className="bls-flow flow-right" style={{ color: 'var(--green)' }}>
        <span>⟩</span><span>⟩</span><span>⟩</span>
      </span>
    );
  }
  return (
    <span className="bls-flow flow-zero" style={{ color: 'var(--accent)' }}>
      <span className="bar" /><span className="bar" /><span className="bar" />
    </span>
  );
}


const filterKnop = (actief: boolean): React.CSSProperties => ({
  padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
  fontWeight: actief ? 600 : 400,
  background: actief ? 'var(--accent)' : 'var(--bg-card)',
  color: actief ? '#fff' : 'var(--text-dim)',
  border: actief ? '1px solid transparent' : '1px solid var(--border)',
});

function MiniToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ position: 'relative', display: 'inline-block', width: 32, height: 18, cursor: 'pointer', flexShrink: 0 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
      <span style={{ position: 'absolute', inset: 0, borderRadius: 9, background: checked ? 'var(--accent)' : 'var(--border)', transition: 'background 0.2s' }} />
      <span style={{ position: 'absolute', top: 2, left: checked ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </label>
  );
}

function HamburgerBtn({ menuKey, items, onOpen }: { menuKey: string; items: { label: string; url: string }[]; onOpen: (e: React.MouseEvent, key: string, items: { label: string; url: string }[]) => void }) {
  return (
    <button
      onClick={e => onOpen(e, menuKey, items)}
      title="Opties"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', lineHeight: 1, padding: 0, borderRadius: 4, display: 'flex', alignItems: 'center' }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-h)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" /></svg>
    </button>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [redirecting, setRedirecting]             = useState(true);
  const [periodes, setPeriodes]                   = useState<Periode[]>([]);
  const [geselecteerdePeriode, setGeselecteerdePeriode] = useState<Periode | null>(null);
  const [geselecteerdJaar, setGeselecteerdJaar]   = useState<number>(new Date().getFullYear());
  const [blsData, setBlsData]                     = useState<BlsRegel[]>([]);
  const [laadtPeriodes, setLaadtPeriodes]         = useState(true);
  const [laadtBls, setLaadtBls]                   = useState(false);
  const [openRijen, setOpenRijen]                 = useState<Set<string>>(new Set());
  const [catData, setCatData]                     = useState<CatRegel[]>([]);
  const [laadtCat, setLaadtCat]                   = useState(false);
  const [openCatRijen, setOpenCatRijen]           = useState<Set<string>>(new Set());
  const [fout, setFout]                           = useState('');
  const [patronModal, setPatronModal]             = useState<PatronModalData | null>(null);
  const dashInstRef = useRef({ blsTonen: true, catTonen: true, blsTrxUitgeklapt: false, catUitklappen: true, catTrxUitgeklapt: false });
  const [dashInst, setDashInst]                   = useState(dashInstRef.current);
  const [budgettenPotjes, setBudgettenPotjes]     = useState<BudgetPotjeNaam[]>([]);
  const [rekeningen, setRekeningen]               = useState<Rekening[]>([]);
  const [uniekeCategorieenDropdown, setUniekeCategorieenDropdown] = useState<string[]>([]);
  const [menuState, setMenuState]                 = useState<MenuState | null>(null);
  const [openCatSubRows, setOpenCatSubRows]       = useState<Set<string>>(new Set());
  const [catSubTrx, setCatSubTrx]                 = useState<Map<string, CatSubTrx[]>>(new Map());
  const [catSubLaden, setCatSubLaden]             = useState<Set<string>>(new Set());
  const [settingsPanel, setSettingsPanel]         = useState<'bls' | 'cat' | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const [rekeningGroepen, setRekeningGroepen]     = useState<RekeningGroep[]>([]);
  const [actieveGroepId, setActieveGroepId]       = useState<number | null>(null);

  // Redirect als app nog niet klaar is voor dashboard
  useEffect(() => {
    fetch('/api/app-status').then(r => r.ok ? r.json() : null).then((s: { heeftImports: boolean; heeftGecategoriseerd: boolean } | null) => {
      if (!s || (!s.heeftImports)) { router.replace('/import'); return; }
      if (!s.heeftGecategoriseerd) { router.replace('/transacties'); return; }
      setRedirecting(false);
    }).catch(() => setRedirecting(false));
  }, [router]);

  // Periodes + dashboard-instellingen laden
  useEffect(() => {
    Promise.all([
      fetch('/api/periodes').then(r => r.ok ? r.json() : Promise.reject(r.statusText)),
      fetch('/api/instellingen').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/rekening-groepen').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([periodesData, instData, groepenData]: [Periode[], Record<string, unknown> | null, RekeningGroep[]]) => {
      setRekeningGroepen(groepenData);
      if (groepenData.length > 0) setActieveGroepId(groepenData[0].id);
      if (instData) {
        const inst = {
          blsTonen:         instData.dashboardBlsTonen      !== false,
          catTonen:         instData.dashboardCatTonen      !== false,
          blsTrxUitgeklapt: Boolean(instData.blsTrxUitgeklapt),
          catUitklappen:    Boolean(instData.catUitklappen),
          catTrxUitgeklapt: Boolean(instData.catTrxUitgeklapt),
        };
        dashInstRef.current = inst;
        setDashInst(inst);
      }
      setPeriodes(periodesData);
      const actueel = periodesData.find((p: Periode) => p.status === 'actueel') ?? periodesData[periodesData.length - 1] ?? null;
      if (actueel) {
        setGeselecteerdePeriode(actueel);
        setGeselecteerdJaar(actueel.jaar);
      }
    })
      .catch(() => setFout('Kon periodes niet ophalen.'))
      .finally(() => setLaadtPeriodes(false));
  }, []);

  // BLS data laden
  const laadBls = useCallback((periode: Periode | null, jaar: number, allesPeriodes: Periode[], groepId?: number | null) => {
    setLaadtBls(true);
    setFout('');
    setOpenCatSubRows(new Set());
    setCatSubTrx(new Map());
    setCatSubLaden(new Set());

    let datumVan: string, datumTot: string;
    if (periode) {
      datumVan = periode.start;
      datumTot = periode.eind;
    } else {
      // Alle modus: heel jaar
      const jaarPeriodes = allesPeriodes.filter(p => p.jaar === jaar && p.status !== 'toekomstig');
      if (jaarPeriodes.length === 0) { setLaadtBls(false); return; }
      datumVan = jaarPeriodes[0].start;
      datumTot = jaarPeriodes[jaarPeriodes.length - 1].eind;
    }

    const groepQs = groepId ? `&groep_id=${groepId}` : '';
    const qs = `datum_van=${datumVan}&datum_tot=${datumTot}${groepQs}`;

    fetch(`/api/dashboard/bls?${qs}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data: BlsRegel[]) => { setBlsData(data); setOpenRijen(dashInstRef.current.blsTrxUitgeklapt ? new Set(data.map(r => `${r.categorie}::${r.gedaanOpRekening}`)) : new Set()); })
      .catch(() => setFout('Kon BLS-data niet ophalen.'))
      .finally(() => setLaadtBls(false));

    setLaadtCat(true);
    fetch(`/api/dashboard/cat?${qs}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data: CatRegel[]) => {
        setCatData(data);
        setOpenCatRijen(dashInstRef.current.catUitklappen ? new Set(data.map(c => c.categorie)) : new Set());
        // Subcategorieën standaard uitklappen + transacties laden
        if (dashInstRef.current.catUitklappen && dashInstRef.current.catTrxUitgeklapt) {
          const subKeys = new Set<string>();
          for (const cat of data) {
            for (const sub of cat.subrijen) {
              if (sub.subcategorie.length > 0) subKeys.add(`${cat.categorie}::${sub.subcategorie}`);
            }
          }
          setOpenCatSubRows(subKeys);
          // Transacties laden met correcte periode
          const ladenSet = new Set<string>();
          setCatSubLaden(ladenSet);
          for (const key of subKeys) {
            const [catNaam, subNaam] = key.split('::');
            ladenSet.add(key);
            setCatSubLaden(new Set(ladenSet));
            fetch(`/api/dashboard/cat/transacties?categorie=${encodeURIComponent(catNaam)}&subcategorie=${encodeURIComponent(subNaam)}${datumVan ? `&van=${datumVan}&tot=${datumTot}` : ''}`)
              .then(r => r.ok ? r.json() : [])
              .then((trxData: CatSubTrx[]) => {
                setCatSubTrx(prev => { const next = new Map(prev); next.set(key, trxData); return next; });
              })
              .finally(() => {
                setCatSubLaden(prev => { const next = new Set(prev); next.delete(key); return next; });
              });
          }
        }
      })
      .catch(() => {})
      .finally(() => setLaadtCat(false));
  }, []);

  useEffect(() => {
    laadBls(geselecteerdePeriode, geselecteerdJaar, periodes, actieveGroepId);
  }, [geselecteerdePeriode, geselecteerdJaar, periodes, laadBls, actieveGroepId]);

  function handleJaar(jaar: number) {
    setGeselecteerdJaar(jaar);
    const periodesVoorJaar = periodes.filter(p => p.jaar === jaar);
    // Probeer zelfde maand te behouden
    const huidigeMaand = geselecteerdePeriode?.maand;
    const gevonden = huidigeMaand ? periodesVoorJaar.find(p => p.maand === huidigeMaand) : null;
    const nieuw = gevonden
      ?? periodesVoorJaar.filter(p => p.status !== 'toekomstig').slice(-1)[0]
      ?? periodesVoorJaar[0]
      ?? null;
    setGeselecteerdePeriode(nieuw);
  }

  const jaarOpties = [...new Set(periodes.map(p => p.jaar))].sort((a, b) => a - b);
  const periodesVoorJaar = periodes.filter(p => p.jaar === geselecteerdJaar);

  const tdNum: React.CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

  function saldoKleur(saldo: number) {
    return saldo > 0 ? 'var(--green)' : saldo < 0 ? 'var(--red)' : 'var(--text-dim)';
  }
  function borderKleur(saldo: number) {
    return saldo === 0 ? 'var(--green)' : 'var(--red)';
  }

  // Referentiedata laden voor CategoriePopup
  useEffect(() => {
    fetch('/api/budgetten-potjes').then(r => r.ok ? r.json() : []).then(setBudgettenPotjes).catch(() => {});
    fetch('/api/rekeningen').then(r => r.ok ? r.json() : []).then(setRekeningen).catch(() => {});
    fetch('/api/categorieen/uniek').then(r => r.ok ? r.json() : []).then(setUniekeCategorieenDropdown).catch(() => {});
  }, []);

  function herlaadBls() {
    laadBls(geselecteerdePeriode, geselecteerdJaar, periodes, actieveGroepId);
  }

  // Menu helpers
  function maandStr(): string {
    if (!geselecteerdePeriode) return '';
    return `${geselecteerdePeriode.jaar}-${String(geselecteerdePeriode.maand).padStart(2, '0')}`;
  }
  function openMenu(e: React.MouseEvent, key: string, items: { label: string; url: string }[]) {
    e.stopPropagation();
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const left = Math.max(10, Math.min(rect.right - 200, window.innerWidth - 220));
    setMenuState({ key, top: rect.bottom + 4, left, items });
  }
  function openContextMenu(e: React.MouseEvent, key: string, items: { label: string; url: string }[]) {
    e.preventDefault();
    e.stopPropagation();
    const left = Math.max(10, Math.min(e.clientX, window.innerWidth - 220));
    const top  = Math.max(10, Math.min(e.clientY, window.innerHeight - 120));
    setMenuState({ key, top, left, items });
  }

  async function updateDashInst(update: Partial<typeof dashInst>) {
    const nieuw = { ...dashInst, ...update };
    dashInstRef.current = nieuw;
    setDashInst(nieuw);

    // Direct visueel toepassen
    if (update.blsTrxUitgeklapt !== undefined) {
      setOpenRijen(update.blsTrxUitgeklapt ? new Set(blsData.map(r => `${r.categorie}::${r.gedaanOpRekening}`)) : new Set());
    }
    if (update.catUitklappen !== undefined) {
      setOpenCatRijen(update.catUitklappen ? new Set(catData.map(c => c.categorie)) : new Set());
      if (update.catUitklappen) {
        if (nieuw.catTrxUitgeklapt) {
          const subKeys = new Set<string>();
          for (const cat of catData) {
            for (const sub of cat.subrijen) {
              if (sub.subcategorie.length > 0 && sub.bedrag !== 0) subKeys.add(`${cat.categorie}::${sub.subcategorie}`);
            }
          }
          setOpenCatSubRows(subKeys);
          for (const key of subKeys) {
            if (!catSubTrx.has(key)) {
              const [catNaam, subNaam] = key.split('::');
              laadCatSubTrx(catNaam, subNaam);
            }
          }
        } else {
          setOpenCatSubRows(new Set());
        }
      } else {
        setOpenCatSubRows(new Set());
      }
    }
    if (update.catTrxUitgeklapt !== undefined) {
      if (update.catTrxUitgeklapt && nieuw.catUitklappen) {
        const subKeys = new Set<string>();
        for (const cat of catData) {
          for (const sub of cat.subrijen) {
            if (sub.subcategorie.length > 0 && sub.bedrag !== 0) subKeys.add(`${cat.categorie}::${sub.subcategorie}`);
          }
        }
        setOpenCatSubRows(subKeys);
        for (const key of subKeys) {
          if (!catSubTrx.has(key)) {
            const [catNaam, subNaam] = key.split('::');
            laadCatSubTrx(catNaam, subNaam);
          }
        }
      } else {
        setOpenCatSubRows(new Set());
      }
    }

    await fetch('/api/instellingen', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dashboardBlsTonen: update.blsTonen,
        dashboardCatTonen: update.catTonen,
        blsTrxUitgeklapt: update.blsTrxUitgeklapt,
        catUitklappen: update.catUitklappen,
        catTrxUitgeklapt: update.catTrxUitgeklapt,
      }),
    });
  }
  async function verbergBls() {
    await fetch('/api/instellingen', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dashboardBlsTonen: false }),
    });
    window.location.href = '/instellingen#highlight-bls';
  }
  async function verbergCat() {
    await fetch('/api/instellingen', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dashboardCatTonen: false }),
    });
    window.location.href = '/instellingen#highlight-cat';
  }
  function blsHoofdItems(cat: string): { label: string; url: string }[] {
    const mp = maandStr();
    return [{ label: `Bekijk transacties van ${cat}`, url: `/transacties?categorie=${encodeURIComponent(cat)}${mp ? `&maand=${mp}` : ''}` }];
  }
  function blsSubItems(trx: BlsTransactie): { label: string; url: string }[] {
    const cat = trx.categorie ?? '';
    const mp  = maandStr();
    return [
      { label: 'Bekijk in gefilterde weergave', url: `/transacties?categorie=${encodeURIComponent(cat)}${mp ? `&maand=${mp}` : ''}&transactie=${trx.id}` },
      { label: 'Bekijk in maandweergave',        url: `/transacties?${mp ? `maand=${mp}&` : ''}transactie=${trx.id}` },
    ];
  }
  function catHoofdItems(cat: string): { label: string; url: string }[] {
    const mp = maandStr();
    return [{ label: `Bekijk transacties van ${cat}`, url: `/transacties?categorie=${encodeURIComponent(cat)}${mp ? `&maand=${mp}` : ''}` }];
  }
  function catSubMenuItems(catNaam: string, subNaam: string): { label: string; url: string }[] {
    const mp = maandStr();
    return [{ label: `Bekijk transacties van ${subNaam}`, url: `/transacties?categorie=${encodeURIComponent(catNaam)}&subcategorie=${encodeURIComponent(subNaam)}${mp ? `&maand=${mp}` : ''}` }];
  }

  async function laadCatSubTrx(catNaam: string, subNaam: string) {
    const key = `${catNaam}::${subNaam}`;
    if (catSubLaden.has(key) || catSubTrx.has(key)) return;
    setCatSubLaden(prev => { const next = new Set(prev); next.add(key); return next; });
    const start = geselecteerdePeriode?.start ?? '';
    const eind  = geselecteerdePeriode?.eind  ?? '';
    const groepQs = actieveGroepId ? `&groep_id=${actieveGroepId}` : '';
    const qs = `categorie=${encodeURIComponent(catNaam)}&subcategorie=${encodeURIComponent(subNaam)}${start ? `&van=${start}&tot=${eind}` : ''}${groepQs}`;
    try {
      const data = await fetch(`/api/dashboard/cat/transacties?${qs}`).then(r => r.ok ? r.json() : []) as CatSubTrx[];
      setCatSubTrx(prev => { const next = new Map(prev); next.set(key, data); return next; });
    } finally {
      setCatSubLaden(prev => { const next = new Set(prev); next.delete(key); return next; });
    }
  }

  // Sluit menu bij klik buiten of Escape
  useEffect(() => {
    if (!menuState) return;
    function handleClick() { setMenuState(null); }
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setMenuState(null); }
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('click', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [menuState]);

  // Sluit settings paneel bij klik buiten of Escape
  useEffect(() => {
    if (!settingsPanel) return;
    function handleClick(e: MouseEvent) {
      if (settingsPanelRef.current && settingsPanelRef.current.contains(e.target as Node)) return;
      setSettingsPanel(null);
    }
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setSettingsPanel(null); }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [settingsPanel]);

  async function openCategoriePopupBls(trx: BlsTransactie, e: React.MouseEvent) {
    e.stopPropagation();
    const naamChips = maakNaamChips(trx.naam_tegenpartij ?? null);
    const chips = analyseerOmschrijvingen(trx);

    if (trx.categorie_id != null || trx.categorie) {
      const regelsRes = await fetch('/api/categorieen');
      const regels: { id: number; naam_zoekwoord: string | null; omschrijving_zoekwoord: string | null; categorie: string; subcategorie: string | null }[] = regelsRes.ok ? await regelsRes.json() : [];
      const regel = trx.categorie_id != null ? regels.find(r => r.id === trx.categorie_id) ?? null : null;

      const categorie = trx.categorie ?? '';
      const subcategorie = trx.subcategorie ?? '';

      const naamZoekwoorden = regel?.naam_zoekwoord ? regel.naam_zoekwoord.split(' ').filter(Boolean) : [];
      const gekozenNaamChips = naamChips.filter(c => naamZoekwoorden.includes(c.waarde)).map(c => c.waarde);

      const omschrZoekwoorden = regel?.omschrijving_zoekwoord ? regel.omschrijving_zoekwoord.split(' ').filter(Boolean) : [];
      const gekozenWoorden = chips.filter(c => omschrZoekwoorden.includes(c.waarde)).map(c => c.waarde);

      const subcatRes = await fetch(`/api/subcategorieen?categorie=${encodeURIComponent(categorie)}`);
      const subcatOpties: string[] = subcatRes.ok ? await subcatRes.json() : [];

      setPatronModal({ transactie: trx as unknown as TransactieMetCategorie, toelichting: trx.toelichting ?? '', nieuweCat: categorie, catNieuw: false, nieuweCatRekeningId: '', subcategorie, subcatOpties, subcatNieuw: false, naamChips, gekozenNaamChips, chips, gekozenWoorden, scope: trx.categorie_id != null ? 'alle' : 'enkel' });
    } else {
      setPatronModal({ transactie: trx as unknown as TransactieMetCategorie, toelichting: trx.toelichting ?? '', nieuweCat: '', catNieuw: false, nieuweCatRekeningId: '', subcategorie: '', subcatOpties: [], subcatNieuw: false, naamChips, gekozenNaamChips: [], chips, gekozenWoorden: [], scope: 'alle' });
    }
  }

  async function handlePatronModalBevestig() {
    if (!patronModal) return;
    const { transactie: t, toelichting, nieuweCat, catNieuw, nieuweCatRekeningId, subcategorie, gekozenWoorden, gekozenNaamChips, scope } = patronModal;
    const gekozenNaamChip  = gekozenNaamChips.join(' ');
    const gekozenWoord     = gekozenWoorden.join(' ');
    const gekozenNaamLabel = patronModal.naamChips
      .filter(c => gekozenNaamChips.includes(c.waarde))
      .map(c => c.label)
      .join(' ') || t.naam_tegenpartij || null;
    const subcatWaarde = subcategorie === '__geen__' ? '' : subcategorie;
    setPatronModal(null);

    if (nieuweCat === '__geen__') {
      if (scope === 'alle') {
        if (t.categorie_id != null) await fetch(`/api/categorieen/${t.categorie_id}`, { method: 'DELETE' });
        await fetch('/api/categoriseer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      } else {
        await fetch(`/api/transacties/${t.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categorie_id: null, status: 'nieuw', handmatig_gecategoriseerd: 0, toelichting: toelichting || null }),
        });
      }
      herlaadBls(); return;
    }
    if (!nieuweCat) { herlaadBls(); return; }

    if (scope === 'enkel') {
      if (catNieuw) {
        await fetch('/api/budgetten-potjes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ naam: nieuweCat.trim(), rekening_ids: nieuweCatRekeningId ? [parseInt(nieuweCatRekeningId, 10)] : [] }) });
      }
      await fetch(`/api/transacties/${t.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorie: nieuweCat.trim(), subcategorie: subcatWaarde || null, status: 'verwerkt', handmatig_gecategoriseerd: 1, toelichting: toelichting || null }),
      });
      herlaadBls(); return;
    }

    // scope 'alle'
    if (catNieuw) {
      await fetch('/api/budgetten-potjes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ naam: nieuweCat.trim(), rekening_ids: nieuweCatRekeningId ? [parseInt(nieuweCatRekeningId, 10)] : [] }) });
    }

    const body: Record<string, unknown> = {
      categorie: nieuweCat.trim(),
      subcategorie: subcatWaarde || null,
      type: t.type,
      naam_origineel: gekozenNaamLabel,
      naam_zoekwoord_raw: gekozenNaamChip || t.naam_tegenpartij,
      toelichting: toelichting || null,
    };
    if (t.tegenrekening_iban_bban) body.iban = t.tegenrekening_iban_bban;
    if (gekozenWoord) body.omschrijving_raw = gekozenWoord;

    let finalRegelId: number | null = null;
    if (t.categorie_id != null && !catNieuw) {
      await fetch(`/api/categorieen/${t.categorie_id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      finalRegelId = t.categorie_id;
    } else {
      const res = await fetch('/api/categorieen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { const { id } = await res.json(); finalRegelId = id as number; }
    }

    const extra = finalRegelId != null ? { toelichting: toelichting || null, categorie_id: finalRegelId } : {};
    await fetch('/api/categoriseer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(extra) });
    herlaadBls();
  }

  if (redirecting) return null;

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>
          {geselecteerdePeriode
            ? `${MAAND_NAMEN[geselecteerdePeriode.maand - 1].toLowerCase()} ${geselecteerdePeriode.jaar}`
            : `${geselecteerdJaar} — alle maanden`}
        </p>
      </div>

      {fout && <div className="error-melding">{fout}</div>}

      {/* Periodenavigatie */}
      {!laadtPeriodes && (
        <div style={{ marginBottom: 20 }}>
          <MaandFilter
            periodes={periodes}
            geselecteerdJaar={geselecteerdJaar}
            geselecteerdePeriode={geselecteerdePeriode}
            onJaarChange={handleJaar}
            onPeriodeChange={setGeselecteerdePeriode}
          />
        </div>
      )}

      {/* Tabbalk rekeninggroepen */}
      {rekeningGroepen.length > 1 && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--border)' }}>
          {rekeningGroepen.map(g => (
            <button key={g.id} onClick={() => setActieveGroepId(g.id)}
              style={{
                padding: '8px 20px', fontSize: 13, fontWeight: actieveGroepId === g.id ? 600 : 400,
                background: 'none', border: 'none', cursor: 'pointer',
                color: actieveGroepId === g.id ? 'var(--accent)' : 'var(--text-dim)',
                borderBottom: actieveGroepId === g.id ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -2, transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {g.naam}
            </button>
          ))}
        </div>
      )}

      {/* BLS + CAT wrapper — compact als ingeklapt, breed als uitgeklapt */}
      {(dashInst.blsTonen || dashInst.catTonen) && <div style={{ maxWidth: 'fit-content', margin: '0 auto' }}>

      {/* BLS Sectie */}
      {dashInst.blsTonen && <><p className="section-title">Balans Budgetten en Potjes</p>
      {laadtBls ? (
        <div className="loading">BLS-data wordt geladen…</div>
      ) : blsData.length === 0 && !fout ? (
        <div className="empty">Geen data voor deze periode.</div>
      ) : (
        <div className="table-wrapper" style={{ marginBottom: 36 }}>
          <table>
            <colgroup>
              <col style={{ width: 'auto' }} />
              <col />
              <col style={{ width: 12 }} />
              <col />
              <col style={{ width: 12 }} />
              <col />
              <col style={{ width: 100 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 20 }} />
              <col style={{ width: 12 }} />
              <col style={{ width: 20 }} />
              <col style={{ width: 12 }} />
              <col style={{ width: 15 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Categorie</th>
                <th colSpan={5}>Correctie richting</th>
                <th style={{ textAlign: 'right' }}>Bedrag</th>
                <th style={{ textAlign: 'right' }}>Gecorrigeerd</th>
                <th style={{ textAlign: 'right', padding: 0, whiteSpace: 'nowrap', minWidth: 80, maxWidth: 80 }}>Saldo</th>
                <th style={{ padding: 0, minWidth: 20, maxWidth: 20 }} />
                <th style={{ padding: 0 }}><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><rect x="1" y="1" width="9.5" height="9.5" rx="3" /><rect x="5.5" y="5.5" width="9.5" height="9.5" rx="3" fill="var(--bg-card)" /></svg></th>
                <th style={{ padding: 0, minWidth: 20, maxWidth: 20 }} />
                <th style={{ padding: 0, position: 'relative' }}>
                  <button onClick={() => setSettingsPanel(settingsPanel === 'bls' ? null : 'bls')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', padding: 0 }} title="Tabel instellingen"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M6.5 1h3l.5 2.1a5.5 5.5 0 0 1 1.8 1l2-.7 1.5 2.6-1.5 1.4a5.5 5.5 0 0 1 0 2.1l1.5 1.4-1.5 2.6-2-.7a5.5 5.5 0 0 1-1.8 1L9.5 15h-3l-.5-2.1a5.5 5.5 0 0 1-1.8-1l-2 .7L.7 10l1.5-1.4a5.5 5.5 0 0 1 0-2.1L.7 5.1l1.5-2.6 2 .7a5.5 5.5 0 0 1 1.8-1z" /><circle cx="8" cy="8" r="2.5" /></svg></button>
                  {settingsPanel === 'bls' && (
                    <div ref={settingsPanelRef} style={{ position: 'absolute', top: '100%', right: 0, zIndex: 100, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', minWidth: 260, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 8px', letterSpacing: '0.5px' }}>Tabel instellingen</p>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text)', marginBottom: 6, gap: 12, textTransform: 'none' as const, fontWeight: 400, letterSpacing: 0 }}>Transacties standaard uitgeklapt <MiniToggle checked={dashInst.blsTrxUitgeklapt} onChange={v => updateDashInst({ blsTrxUitgeklapt: v })} /></label>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text)', textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>Tabel verbergen <button onClick={() => verbergBls()} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 18, background: 'var(--border)', borderRadius: 9, border: 'none', cursor: 'pointer', flexShrink: 0, padding: 2 }}><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 14, borderRadius: 7, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', fontSize: 9, color: 'var(--red)', lineHeight: 1 }}>⏻</span></button></div>
                    </div>
                  )}
                </th>
                <th style={{ padding: 0, minWidth: 15, maxWidth: 15 }} />
              </tr>
            </thead>
            <tbody>
              {(() => {
                const hoortTellingen = new Map<string, number>();
                for (const r of blsData) {
                  hoortTellingen.set(r.hoortOpRekening, (hoortTellingen.get(r.hoortOpRekening) ?? 0) + 1);
                }
                // Effectieve kleuren per rekening (rekening houdend met categorie- en andere rekeningkleuren)
                const rekKleurMap = (() => {
                  const catKleuren = budgettenPotjes.map(bp => bp.kleur).filter((k): k is string => !!k);
                  const map = new Map<string, string>();
                  const gebruikt = [...catKleuren];
                  for (const r of rekeningen) {
                    if (r.kleur) { map.set(r.naam, r.kleur); gebruikt.push(r.kleur); }
                    else { const auto = kiesAutomatischeKleur(gebruikt); map.set(r.naam, auto); gebruikt.push(auto); }
                  }
                  return map;
                })();

                const rekBadge = (naam: string, label?: string, kleurOverride?: string): React.ReactNode => {
                  const kleur = kleurOverride ?? rekKleurMap.get(naam) ?? hashKleur(naam);
                  return (
                    <span style={{ display: 'inline-block', fontSize: 11, borderRadius: 3, padding: '0px 6px', fontWeight: 600, border: `1px solid ${kleur}`, color: kleur, whiteSpace: 'nowrap', textAlign: 'center' }}>
                      {label ?? naam}
                    </span>
                  );
                };

                return blsData.map(rij => {
                  const sleutel = `${rij.categorie}::${rij.gedaanOpRekening}`;
                  const isOpen = openRijen.has(sleutel);
                  const toggleRij = () => setOpenRijen(prev => {
                    const next = new Set(prev);
                    if (next.has(sleutel)) next.delete(sleutel); else next.add(sleutel);
                    return next;
                  });
                  const hoortLabel = `${rij.hoortOpRekening}: ${rij.categorie}`;
                  return (
                    <Fragment key={sleutel}>
                      {/* Hoofdrij — directe <tr> in outer tbody, geen geneste tabel */}
                      <tr onClick={toggleRij} onContextMenu={e => openContextMenu(e, `ctx-bls-${sleutel}`, blsHoofdItems(rij.categorie))} style={{ cursor: 'pointer' }}>
                        <td style={{ borderLeft: `2px solid ${borderKleur(rij.saldo)}`, paddingLeft: 10, paddingRight: 12, paddingTop: 6, paddingBottom: 6, whiteSpace: 'nowrap', width: '1%' }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, color: 'var(--text-dim)', transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>
                            {rij.categorie}
                          </div>
                        </td>
                        <td style={{ padding: '6px 0 6px 8px', whiteSpace: 'nowrap' }}>{rekBadge(rij.gedaanOpRekening)}</td>
                        <td style={{ padding: 0, minWidth: 12, maxWidth: 12 }} />
                        <td style={{ padding: '6px 0', whiteSpace: 'nowrap', textAlign: 'center' }}><RichtingsIndicator saldo={rij.saldo} /></td>
                        <td style={{ padding: 0, minWidth: 12, maxWidth: 12 }} />
                        <td style={{ padding: '6px 0', whiteSpace: 'nowrap' }}>{rekBadge(rij.hoortOpRekening, hoortLabel, budgettenPotjes.find(bp => bp.naam === rij.categorie)?.kleur ?? undefined)}{rij.saldo === 0 && <span style={{ color: 'var(--green)', fontSize: 13, fontWeight: 700, marginLeft: 6 }}>✓</span>}</td>
                        <td style={{ ...tdNum, color: bedragKleur(rij.bedrag), fontWeight: 600 }}>{formatBedrag(rij.bedrag)}</td>
                        <td style={{ ...tdNum, color: rij.gecorrigeerd !== 0 ? bedragKleur(rij.gecorrigeerd) : undefined, fontWeight: 600 }}>{rij.gecorrigeerd !== 0 ? formatBedrag(rij.gecorrigeerd) : <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', padding: 0, whiteSpace: 'nowrap', minWidth: 80, maxWidth: 80, color: bedragKleur(rij.saldo), fontWeight: 600 }}>{formatBedrag(rij.saldo)}</td>
                        <td style={{ padding: 0, minWidth: 20, maxWidth: 20 }} />
                        <td style={{ padding: 0, verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}><button title="Kopieer saldo bedrag" onClick={() => { navigator.clipboard.writeText(Math.abs(rij.saldo).toFixed(2).replace('.', ',')); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', padding: 0, lineHeight: 1, opacity: 0.6 }} onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }} onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; }}><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="9.5" height="9.5" rx="3" /><rect x="5.5" y="5.5" width="9.5" height="9.5" rx="3" fill="var(--bg-card)" /></svg></button></td>
                        <td style={{ padding: 0, minWidth: 20, maxWidth: 20 }} />
                        <td style={{ padding: 0, verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                          <HamburgerBtn menuKey={`hbls-${sleutel}`} items={blsHoofdItems(rij.categorie)} onOpen={openMenu} />
                        </td>
                        <td style={{ padding: 0, minWidth: 15, maxWidth: 15 }} />
                      </tr>
                      {/* Subtabel — aparte <tr> zodat hover niet interfereert met hoofdrij */}
                      {isOpen && rij.transacties && rij.transacties.length > 0 && (
                        <tr className="bls-expand">
                          <td colSpan={14} style={{ padding: '0 8px 8px 28px' }}>
                            <table style={{ fontSize: 11, borderCollapse: 'collapse', tableLayout: 'fixed', width: 850 }}>
                              <colgroup>
                                <col style={{ width: 80 }} />
                                <col style={{ width: 160 }} />
                                <col />
                                <col style={{ width: 65 }} />
                                <col style={{ width: 110 }} />
                                <col style={{ width: 110 }} />
                                <col style={{ width: 36 }} />
                              </colgroup>
                              <thead>
                                <tr style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>
                                  <th style={{ textAlign: 'left', padding: '2px 10px', fontWeight: 500 }}>Datum</th>
                                  <th style={{ textAlign: 'left', padding: '2px 10px', fontWeight: 500 }}>Naam</th>
                                  <th style={{ textAlign: 'left', padding: '2px 10px', fontWeight: 500 }}>Omschrijving</th>
                                  <th style={{ textAlign: 'right', padding: '2px 10px', fontWeight: 500 }}>Bedrag</th>
                                  <th style={{ textAlign: 'left', padding: '2px 10px', fontWeight: 500 }}>Categorie</th>
                                  <th style={{ textAlign: 'left', padding: '2px 10px', fontWeight: 500 }}>Subcategorie</th>
                                  <th style={{ width: 36 }} />
                                </tr>
                              </thead>
                              <tbody>
                                {rij.transacties.map(trx => {
                                  const catKleur = budgettenPotjes.find(bp => bp.naam === trx.categorie)?.kleur ?? 'var(--accent)';
                                  return (
                                    <tr key={trx.id} onClick={(e) => openCategoriePopupBls(trx, e)} onContextMenu={e => openContextMenu(e, `ctx-bls-sub-${trx.id}`, blsSubItems(trx))} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}>
                                      <td style={{ padding: '2px 10px', whiteSpace: 'nowrap' }}>{trx.datum ?? '—'}</td>
                                      <td style={{ padding: '2px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trx.naam_tegenpartij ?? '—'}</td>
                                      <td title={trx.omschrijving ?? undefined} style={{ padding: '2px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trx.omschrijving ?? '—'}</td>
                                      <td style={{ padding: '2px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: bedragKleur(trx.bedrag ?? 0) }}>{trx.bedrag != null ? formatBedrag(trx.bedrag) : '—'}</td>
                                      <td style={{ padding: '2px 10px' }}>
                                        {trx.categorie
                                          ? <span className="badge" style={{ background: kleurBg(catKleur), border: `1px solid ${catKleur}`, color: catKleur }}>{trx.categorie}</span>
                                          : <span className="badge-outline-red">Ongecategoriseerd</span>
                                        }
                                      </td>
                                      <td style={{ padding: '2px 10px' }}>
                                        {trx.subcategorie
                                          ? <span className="badge-outline" style={{ borderColor: catKleur, color: catKleur }}>{trx.subcategorie}</span>
                                          : <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>
                                        }
                                      </td>
                                      <td style={{ width: 36, padding: 0, textAlign: 'center', verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                                        <HamburgerBtn menuKey={`h-bls-sub-${trx.id}`} items={blsSubItems(trx)} onOpen={openMenu} />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      )}</>}

      {/* CAT Sectie — Samenvatting per Categorie */}
      {dashInst.catTonen && <><p className="section-title" style={{ marginTop: 8 }}>Samenvatting per Categorie</p>
      {laadtCat ? (
        <div className="loading">Categoriedata wordt geladen…</div>
      ) : catData.length === 0 && !fout ? (
        <div className="empty">Geen categoriedata voor deze periode.</div>
      ) : (
        <div className="table-wrapper" style={{ marginBottom: 36, minWidth: 895 }}>
          {(() => {
            const isAlle = geselecteerdePeriode === null;
            const aantalAfgesloten = isAlle ? periodes.filter(p => p.jaar === geselecteerdJaar && p.status === 'afgesloten').length : 0;
            return (<table>
            <colgroup>
              <col style={{ width: 'auto' }} />
              <col style={{ width: isAlle ? 150 : 120 }} />
              {isAlle && <col style={{ width: 180 }} />}
              <col style={{ width: 12 }} />
              <col style={{ width: 15 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Categorie</th>
                <th style={{ textAlign: 'right', padding: '8px 16px' }}>{isAlle ? `Totaal over ${geselecteerdJaar}` : 'Bedrag'}</th>
                {isAlle && <th style={{ textAlign: 'right', padding: '8px 16px' }}>Gemiddeld per maand</th>}
                <th style={{ padding: 0, position: 'relative' }}>
                  <button onClick={() => setSettingsPanel(settingsPanel === 'cat' ? null : 'cat')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', padding: 0 }} title="Tabel instellingen"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M6.5 1h3l.5 2.1a5.5 5.5 0 0 1 1.8 1l2-.7 1.5 2.6-1.5 1.4a5.5 5.5 0 0 1 0 2.1l1.5 1.4-1.5 2.6-2-.7a5.5 5.5 0 0 1-1.8 1L9.5 15h-3l-.5-2.1a5.5 5.5 0 0 1-1.8-1l-2 .7L.7 10l1.5-1.4a5.5 5.5 0 0 1 0-2.1L.7 5.1l1.5-2.6 2 .7a5.5 5.5 0 0 1 1.8-1z" /><circle cx="8" cy="8" r="2.5" /></svg></button>
                  {settingsPanel === 'cat' && (
                    <div ref={settingsPanelRef} style={{ position: 'absolute', top: '100%', right: 0, zIndex: 100, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', minWidth: 300, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 8px', letterSpacing: '0.5px' }}>Tabel instellingen</p>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text)', marginBottom: 6, gap: 12, textTransform: 'none' as const, fontWeight: 400, letterSpacing: 0 }}>Subcategorieën standaard uitgeklapt <MiniToggle checked={dashInst.catUitklappen} onChange={v => updateDashInst({ catUitklappen: v })} /></label>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text)', marginBottom: 6, gap: 12, textTransform: 'none' as const, fontWeight: 400, letterSpacing: 0 }}>Transacties standaard uitgeklapt <MiniToggle checked={dashInst.catTrxUitgeklapt} onChange={v => updateDashInst({ catTrxUitgeklapt: v })} /></label>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text)', textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>Tabel verbergen <button onClick={() => verbergCat()} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 18, background: 'var(--border)', borderRadius: 9, border: 'none', cursor: 'pointer', flexShrink: 0, padding: 2 }}><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 14, borderRadius: 7, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', fontSize: 9, color: 'var(--red)', lineHeight: 1 }}>⏻</span></button></div>
                    </div>
                  )}
                </th>
                <th style={{ padding: 0, minWidth: 15, maxWidth: 15 }} />
              </tr>
            </thead>
            <tbody>
              {(() => {
                return catData.map(cat => {
                  const isOpen = openCatRijen.has(cat.categorie);
                  const heeftSubs = cat.subrijen.length > 0;
                  const toggleCat = () => setOpenCatRijen(prev => {
                    const next = new Set(prev);
                    if (next.has(cat.categorie)) next.delete(cat.categorie); else next.add(cat.categorie);
                    return next;
                  });
                  return (
                    <Fragment key={cat.categorie}>
                      <tr onClick={heeftSubs ? toggleCat : undefined} onContextMenu={e => openContextMenu(e, `ctx-cat-${cat.categorie}`, catHoofdItems(cat.categorie))} style={{ cursor: heeftSubs ? 'pointer' : 'default', borderTop: '1px solid var(--border)' }}>
                        <td style={{ paddingTop: 8, paddingBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14, color: 'var(--text-h)' }}>
                            {heeftSubs && <span style={{ fontSize: 10, color: 'var(--text-dim)', transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>}
                            {cat.categorie}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 16px', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: bedragKleur(cat.totaal), fontSize: 14 }}>{formatBedrag(cat.totaal)}</td>
                        {isAlle && <td style={{ textAlign: 'right', padding: '8px 16px', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: aantalAfgesloten > 0 ? bedragKleur(cat.totaal / aantalAfgesloten) : 'var(--text-dim)', fontSize: 14 }}>{aantalAfgesloten > 0 ? formatBedrag(cat.totaal / aantalAfgesloten) : '—'}</td>}
                        <td style={{ padding: 0, verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                          <HamburgerBtn menuKey={`h-cat-${cat.categorie}`} items={catHoofdItems(cat.categorie)} onOpen={openMenu} />
                        </td>
                        <td style={{ padding: 0, minWidth: 15, maxWidth: 15 }} />
                      </tr>
                      {isOpen && cat.subrijen.filter(sub => sub.bedrag !== 0).map(sub => {
                        const subKey = `${cat.categorie}::${sub.subcategorie}`;
                        const isSubOpen   = openCatSubRows.has(subKey);
                        const subTrxs     = catSubTrx.get(subKey) ?? [];
                        const subIsLaden  = catSubLaden.has(subKey);
                        const canExpand   = sub.subcategorie.length > 0;
                        const toggleSub = (e: React.MouseEvent) => {
                          e.stopPropagation();
                          const willOpen = !openCatSubRows.has(subKey);
                          setOpenCatSubRows(prev => {
                            const next = new Set(prev);
                            if (next.has(subKey)) next.delete(subKey); else next.add(subKey);
                            return next;
                          });
                          if (willOpen) laadCatSubTrx(cat.categorie, sub.subcategorie);
                        };
                        return (
                          <Fragment key={subKey}>
                            <tr
                              style={{ borderBottom: 'none', cursor: canExpand ? 'pointer' : 'default' }}
                              onClick={canExpand ? toggleSub : undefined}
                              onContextMenu={e => openContextMenu(e, `ctx-cat-sub-${subKey}`, catSubMenuItems(cat.categorie, sub.subcategorie))}
                              onMouseEnter={canExpand ? e => (e.currentTarget.style.background = 'var(--bg-hover)') : undefined}
                              onMouseLeave={canExpand ? e => (e.currentTarget.style.background = '') : undefined}
                            >
                              <td style={{ paddingLeft: 32, paddingTop: 3, paddingBottom: 3, fontSize: 13, color: 'var(--text-dim)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  {canExpand && <span style={{ fontSize: 9, color: 'var(--text-dim)', transition: 'transform 0.15s', transform: isSubOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>}
                                  {sub.subcategorie}
                                </div>
                              </td>
                              <td style={{ textAlign: 'right', padding: '3px 16px', fontVariantNumeric: 'tabular-nums', color: 'var(--text-dim)', fontSize: 13 }}>{formatBedrag(sub.bedrag)}</td>
                              {isAlle && <td style={{ textAlign: 'right', padding: '3px 16px', fontVariantNumeric: 'tabular-nums', color: 'var(--text-dim)', fontSize: 13 }}>{aantalAfgesloten > 0 ? formatBedrag(sub.bedrag / aantalAfgesloten) : '—'}</td>}
                              <td style={{ padding: 0, verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                                <HamburgerBtn menuKey={`h-cat-sub-${subKey}`} items={catSubMenuItems(cat.categorie, sub.subcategorie)} onOpen={openMenu} />
                              </td>
                              <td style={{ padding: 0, minWidth: 15, maxWidth: 15 }} />
                            </tr>
                            {isSubOpen && (
                              <tr className="bls-expand">
                                <td colSpan={isAlle ? 5 : 4} style={{ padding: '0 8px 8px 28px' }}>
                                  {subIsLaden ? (
                                    <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '4px 0' }}>Laden…</div>
                                  ) : subTrxs.length === 0 ? (
                                    <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '4px 0' }}>Geen transacties gevonden.</div>
                                  ) : (
                                    <table style={{ fontSize: 11, borderCollapse: 'collapse', tableLayout: 'fixed', width: 850 }}>
                                      <colgroup>
                                        <col style={{ width: 80 }} /><col style={{ width: 160 }} /><col />
                                        <col style={{ width: 65 }} /><col style={{ width: 110 }} /><col style={{ width: 110 }} />
                                        <col style={{ width: 36 }} />
                                      </colgroup>
                                      <thead>
                                        <tr style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>
                                          <th style={{ textAlign: 'left', padding: '2px 10px', fontWeight: 500 }}>Datum</th>
                                          <th style={{ textAlign: 'left', padding: '2px 10px', fontWeight: 500 }}>Naam</th>
                                          <th style={{ textAlign: 'left', padding: '2px 10px', fontWeight: 500 }}>Omschrijving</th>
                                          <th style={{ textAlign: 'right', padding: '2px 10px', fontWeight: 500 }}>Bedrag</th>
                                          <th style={{ textAlign: 'left', padding: '2px 10px', fontWeight: 500 }}>Categorie</th>
                                          <th style={{ textAlign: 'left', padding: '2px 10px', fontWeight: 500 }}>Subcategorie</th>
                                          <th style={{ width: 36 }} />
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {subTrxs.map(trx => {
                                          const ck = budgettenPotjes.find(bp => bp.naam === trx.categorie)?.kleur ?? 'var(--accent)';
                                          const trxAsBls = trx as unknown as BlsTransactie;
                                          return (
                                            <tr key={trx.id} onClick={(e) => openCategoriePopupBls(trxAsBls, e)} onContextMenu={e => openContextMenu(e, `ctx-cat-sub-trx-${trx.id}`, blsSubItems(trxAsBls))} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}>
                                              <td style={{ padding: '2px 10px', whiteSpace: 'nowrap' }}>{trx.datum ?? '—'}</td>
                                              <td style={{ padding: '2px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trx.naam_tegenpartij ?? '—'}</td>
                                              <td title={trx.omschrijving ?? undefined} style={{ padding: '2px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trx.omschrijving ?? '—'}</td>
                                              <td style={{ padding: '2px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: bedragKleur(trx.bedrag ?? 0) }}>{trx.bedrag != null ? formatBedrag(trx.bedrag) : '—'}</td>
                                              <td style={{ padding: '2px 10px' }}>{trx.categorie ? <span className="badge" style={{ background: kleurBg(ck), border: `1px solid ${ck}`, color: ck }}>{trx.categorie}</span> : <span className="badge-outline-red">Ongecategoriseerd</span>}</td>
                                              <td style={{ padding: '2px 10px' }}>{trx.subcategorie ? <span className="badge-outline" style={{ borderColor: ck, color: ck }}>{trx.subcategorie}</span> : <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>}</td>
                                              <td style={{ width: 36, padding: 0, textAlign: 'center', verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                                                <HamburgerBtn menuKey={`h-cat-sub-trx-${trx.id}`} items={blsSubItems(trxAsBls)} onOpen={openMenu} />
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </Fragment>
                  );
                });
              })()}
            </tbody>
          </table>);
          })()}
        </div>
      )}</>}

      </div>}{/* einde BLS + CAT wrapper */}

      {/* Floating contextmenu / hamburger menu */}
      {menuState && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: 'fixed', top: menuState.top, left: menuState.left, zIndex: 1000, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', minWidth: 200, overflow: 'hidden' }}
        >
          {menuState.items.map((item, i) => (
            <a
              key={i}
              href={item.url}
              style={{ display: 'block', padding: '9px 14px', fontSize: 13, color: 'var(--text)', textDecoration: 'none', cursor: 'pointer', borderBottom: i < menuState.items.length - 1 ? '1px solid var(--border)' : 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-dim)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => setMenuState(null)}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}

      {patronModal && (
        <CategoriePopup
          patronModal={patronModal}
          setPatronModal={setPatronModal}
          onBevestig={handlePatronModalBevestig}
          onSluiten={() => setPatronModal(null)}
          onAnalyseer={async () => {
            const naam = patronModal.transactie.naam_tegenpartij;
            if (!naam) return {};
            const res = await fetch(`/api/transacties?naam_tegenpartij=${encodeURIComponent(naam)}`);
            const trns: TransactieMetCategorie[] = res.ok ? await res.json() : [];
            const tellers: Record<string, number> = {};
            for (const t of trns) {
              const omschr = [t.omschrijving_1, t.omschrijving_2, t.omschrijving_3].filter(Boolean).join(' ');
              const woorden = new Set(
                omschr.split(/[\s.,/()\[\]{}'"!?:;]+/)
                  .filter(w => w.length >= 1)
                  .map(w => w.toLowerCase().replace(/[^a-z0-9&-]/g, ''))
                  .filter(w => w.length > 0)
              );
              for (const w of woorden) tellers[w] = (tellers[w] ?? 0) + 1;
            }
            return tellers;
          }}
          budgettenPotjes={budgettenPotjes}
          rekeningen={rekeningen}
          periodes={periodes}
          onDatumWijzig={async () => {}}
          onVoegRekeningToe={() => {}}
          uniekeCategorieenDropdown={uniekeCategorieenDropdown}
        />
      )}
    </>
  );
}
