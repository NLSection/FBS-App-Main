// FILE: CategorieenBeheer.tsx
// AANGEMAAKT: 25-03-2026 17:30
// VERSIE: 1
// GEWIJZIGD: 31-03-2026 01:00
//
// WIJZIGINGEN (31-03-2026 02:00):
// - onAnalyseer prop toegevoegd aan CategoriePopup: woordfrequentie analyse per tegenpartij
// WIJZIGINGEN (31-03-2026 01:30):
// - Tab "Aangepast" met 🔒 slotje in tab-knop en bij elke transactierij (naam tegenpartij)
// WIJZIGINGEN (31-03-2026 01:00):
// - Volledig herbouwd met twee tabs: Categorieregels + Aangepast
// - Beide tabs: categorie filterknoppen met tellers, zoekbalk, gesynchroniseerde scrollbar
// - CategoriePopup geïntegreerd voor rij-klik categorisatie
// - Tab Categorieregels: rijen klikbaar via CategoriePopup, verwijderknop behouden
// - Tab Aangepast: transacties met handmatig_gecategoriseerd === 1

'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import type { CategorieType } from '@/lib/categorisatie';
import type { TransactieMetCategorie } from '@/lib/transacties';
import { formatType } from '@/lib/formatType';
import CategoriePopup from '@/features/shared/components/CategoriePopup';
import type { PatronModalData } from '@/features/shared/components/CategoriePopup';

interface CategorieRegel {
  id: number;
  iban: string | null;
  naam_zoekwoord: string | null;
  naam_origineel: string | null;
  omschrijving_zoekwoord: string | null;
  toelichting: string | null;
  categorie: string;
  subcategorie: string | null;
  type: CategorieType;
  laatste_gebruik: string | null;
}

interface BudgetPotjeNaam { id: number; naam: string; kleur: string | null; rekening_id: number | null; }
interface Rekening { id: number; naam: string; iban: string; beheerd: number; }

type Tab = 'regels' | 'aangepast';

const filterKnopStijl = (actief: boolean): React.CSSProperties => ({
  padding: '5px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
  border: '1px solid var(--border)',
  background: actief ? 'var(--accent)' : 'var(--bg-card)',
  color: actief ? '#fff' : 'var(--text)',
  fontWeight: actief ? 600 : 400,
});

function formatDatum(d: string | null): string {
  if (!d) return '—';
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d;
}

function formatBedrag(bedrag: number | null): string {
  if (bedrag === null) return '—';
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag);
}

function kleurBg(hex: string): string {
  if (!hex.startsWith('#') || hex.length < 7) return 'var(--accent-dim)';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.15)`;
}

function maakNaamChips(naam: string | null): { label: string; waarde: string }[] {
  if (!naam) return [];
  return naam
    .split(/[\s.,/()\[\]{}'"!?:;]+/)
    .filter(w => w.length >= 3)
    .map(w => ({ label: w, waarde: w.toLowerCase().replace(/[^a-z0-9&-]/g, '') }))
    .filter(c => c.waarde.length > 0);
}

function analyseerOmschrijvingen(t: TransactieMetCategorie): { label: string; waarde: string }[] {
  const omschr = [t.omschrijving_1, t.omschrijving_2, t.omschrijving_3]
    .filter(Boolean).join(' ');
  if (!omschr) return [];
  return omschr
    .split(/[\s.,/()\[\]{}'"!?:;]+/)
    .filter(w => w.length >= 3)
    .map(w => ({ label: w, waarde: w.toLowerCase().replace(/[^a-z0-9&-]/g, '') }))
    .filter(c => c.waarde.length > 0);
}

export default function CategorieenBeheer() {
  const [tab, setTab]                           = useState<Tab>('regels');
  const [regels, setRegels]                     = useState<CategorieRegel[]>([]);
  const [transacties, setTransacties]           = useState<TransactieMetCategorie[]>([]);
  const [budgettenPotjes, setBudgettenPotjes]   = useState<BudgetPotjeNaam[]>([]);
  const [rekeningen, setRekeningen]             = useState<Rekening[]>([]);
  const [uniekeCatDropdown, setUniekeCatDropdown] = useState<string[]>([]);
  const [reloadTrigger, setReloadTrigger]       = useState(0);
  const [patronModal, setPatronModal]           = useState<PatronModalData | null>(null);

  // Filter state per tab
  const [regelsCatFilter, setRegelsCatFilter]   = useState<string | 'alle'>('alle');
  const [regelsZoek, setRegelsZoek]             = useState('');
  const [aangepastCatFilter, setAangepastCatFilter] = useState<string | 'alle'>('alle');
  const [aangepastZoek, setAangepastZoek]       = useState('');

  // Sort state per tab
  const [regelsSortCol, setRegelsSortCol]       = useState<string | null>(null);
  const [regelsSortDir, setRegelsSortDir]       = useState<'asc' | 'desc'>('asc');
  const [aangepastSortCol, setAangepastSortCol] = useState<string | null>(null);
  const [aangepastSortDir, setAangepastSortDir] = useState<'asc' | 'desc'>('asc');

  // Scroll sync refs
  const topScrollRef1     = useRef<HTMLDivElement>(null);
  const tableWrapperRef1  = useRef<HTMLDivElement>(null);
  const syncingRef1       = useRef(false);
  const [containerWidth1, setContainerWidth1] = useState(0);

  const topScrollRef2     = useRef<HTMLDivElement>(null);
  const tableWrapperRef2  = useRef<HTMLDivElement>(null);
  const syncingRef2       = useRef(false);
  const [containerWidth2, setContainerWidth2] = useState(0);

  // Data laden
  useEffect(() => {
    fetch('/api/categorieen').then(r => r.ok ? r.json() : []).then(setRegels);
    fetch('/api/transacties').then(r => r.ok ? r.json() : []).then((all: TransactieMetCategorie[]) => {
      setTransacties(all.filter(t => t.handmatig_gecategoriseerd === 1));
    });
    fetch('/api/budgetten-potjes').then(r => r.ok ? r.json() : []).then(setBudgettenPotjes);
    fetch('/api/rekeningen').then(r => r.ok ? r.json() : []).then(setRekeningen);
    fetch('/api/categorieen/uniek').then(r => r.ok ? r.json() : []).then(setUniekeCatDropdown);
  }, [reloadTrigger]);

  // Scroll sync observers
  useEffect(() => {
    if (!tableWrapperRef1.current) return;
    const el = tableWrapperRef1.current;
    const obs = new ResizeObserver(() => { setContainerWidth1(el.scrollWidth); });
    obs.observe(el);
    return () => obs.disconnect();
  }, [regels]);

  useEffect(() => {
    if (!tableWrapperRef2.current) return;
    const el = tableWrapperRef2.current;
    const obs = new ResizeObserver(() => { setContainerWidth2(el.scrollWidth); });
    obs.observe(el);
    return () => obs.disconnect();
  }, [transacties]);

  function syncScroll1(source: 'top' | 'table') {
    if (syncingRef1.current) return;
    syncingRef1.current = true;
    if (source === 'top' && tableWrapperRef1.current && topScrollRef1.current)
      tableWrapperRef1.current.scrollLeft = topScrollRef1.current.scrollLeft;
    else if (source === 'table' && topScrollRef1.current && tableWrapperRef1.current)
      topScrollRef1.current.scrollLeft = tableWrapperRef1.current.scrollLeft;
    requestAnimationFrame(() => { syncingRef1.current = false; });
  }

  function syncScroll2(source: 'top' | 'table') {
    if (syncingRef2.current) return;
    syncingRef2.current = true;
    if (source === 'top' && tableWrapperRef2.current && topScrollRef2.current)
      tableWrapperRef2.current.scrollLeft = topScrollRef2.current.scrollLeft;
    else if (source === 'table' && topScrollRef2.current && tableWrapperRef2.current)
      topScrollRef2.current.scrollLeft = tableWrapperRef2.current.scrollLeft;
    requestAnimationFrame(() => { syncingRef2.current = false; });
  }

  // ── CategoriePopup logica (identiek aan TransactiesTabel) ─────────────

  async function openCategoriePopup(t: TransactieMetCategorie) {
    const naamChips = maakNaamChips(t.naam_tegenpartij ?? null);
    const chips = analyseerOmschrijvingen(t);

    if (t.categorie_id != null || t.categorie) {
      const regelsRes = await fetch('/api/categorieen');
      const allRegels: { id: number; naam_zoekwoord: string | null; omschrijving_zoekwoord: string | null; categorie: string; subcategorie: string | null }[] = regelsRes.ok ? await regelsRes.json() : [];
      const regel = t.categorie_id != null ? allRegels.find(r => r.id === t.categorie_id) ?? null : null;

      const categorie = t.categorie ?? '';
      const subcategorie = t.subcategorie ?? '';

      const naamZoekwoorden = regel?.naam_zoekwoord ? regel.naam_zoekwoord.split(' ').filter(Boolean) : [];
      const gekozenNaamChips = naamChips.filter(c => naamZoekwoorden.includes(c.waarde)).map(c => c.waarde);

      const omschrZoekwoorden = regel?.omschrijving_zoekwoord ? regel.omschrijving_zoekwoord.split(' ').filter(Boolean) : [];
      const gekozenWoorden = chips.filter(c => omschrZoekwoorden.includes(c.waarde)).map(c => c.waarde);

      const subcatRes = await fetch(`/api/subcategorieen?categorie=${encodeURIComponent(categorie)}`);
      const subcatOpties: string[] = subcatRes.ok ? await subcatRes.json() : [];

      setPatronModal({ transactie: t, toelichting: t.toelichting ?? '', nieuweCat: categorie, catNieuw: false, nieuweCatRekeningId: '', subcategorie, subcatOpties, subcatNieuw: false, naamChips, gekozenNaamChips, chips, gekozenWoorden, scope: 'alle' });
    } else {
      setPatronModal({ transactie: t, toelichting: t.toelichting ?? '', nieuweCat: '', catNieuw: false, nieuweCatRekeningId: '', subcategorie: '', subcatOpties: [], subcatNieuw: false, naamChips, gekozenNaamChips: [], chips, gekozenWoorden: [], scope: 'alle' });
    }
  }

  // Voor tab 1 (categorieregels): maak een dummy TransactieMetCategorie van een CategorieRegel
  function openRegelPopup(r: CategorieRegel) {
    const dummy: TransactieMetCategorie = {
      id: 0, import_id: 0, iban_bban: null, munt: null, bic: null, volgnummer: null,
      datum: null, rentedatum: null, bedrag: null, saldo_na_trn: null,
      tegenrekening_iban_bban: r.iban, naam_tegenpartij: r.naam_origineel,
      naam_uiteindelijke_partij: null, naam_initierende_partij: null, bic_tegenpartij: null,
      code: null, batch_id: null, transactiereferentie: null, machtigingskenmerk: null,
      incassant_id: null, betalingskenmerk: null,
      omschrijving_1: r.omschrijving_zoekwoord, omschrijving_2: null, omschrijving_3: null,
      reden_retour: null, oorspr_bedrag: null, oorspr_munt: null, koers: null,
      type: r.type === 'alle' ? 'normaal-af' : r.type as TransactieMetCategorie['type'],
      status: 'verwerkt', categorie_id: r.id, handmatig_gecategoriseerd: 0,
      originele_datum: null, fout_geboekt: 0, rekening_naam: null, tegenrekening_naam: null,
      categorie: r.categorie, subcategorie: r.subcategorie, toelichting: r.toelichting,
    };
    openCategoriePopup(dummy);
  }

  async function maakCategorieregel(
    t: TransactieMetCategorie, categorie: string, subcategorie: string,
    omschrWoord?: string | null, inclusiefIban = true,
    naamZoekWoord?: string | null, naamOrigineel?: string | null,
    toelichting?: string | null,
  ): Promise<number | null> {
    const body: Record<string, unknown> = {
      categorie, subcategorie: subcategorie || null,
      type: t.type,
      naam_origineel: naamOrigineel !== undefined ? naamOrigineel : (t.naam_tegenpartij ?? null),
      naam_zoekwoord_raw: naamZoekWoord ?? null,
      toelichting: toelichting ?? null,
    };
    if (inclusiefIban && t.tegenrekening_iban_bban) body.iban = t.tegenrekening_iban_bban;
    if (omschrWoord) body.omschrijving_raw = omschrWoord;
    const res = await fetch('/api/categorieen', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const { id } = await res.json();
    return id as number;
  }

  async function triggerHermatch(toelichting?: string | null, categorieId?: number | null) {
    const extra = categorieId != null ? { toelichting: toelichting || null, categorie_id: categorieId } : {};
    await fetch('/api/categoriseer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(extra),
    });
  }

  async function vindMatchendeRegelId(
    t: TransactieMetCategorie, naamZoekwoord: string | null, omschrZoekwoord: string | null
  ): Promise<number | null> {
    const res = await fetch('/api/categorieen');
    if (!res.ok) return null;
    const allRegels: { id: number; naam_zoekwoord: string | null; iban: string | null; omschrijving_zoekwoord: string | null }[] = await res.json();
    const match = allRegels.find(r =>
      r.iban === (t.tegenrekening_iban_bban ?? null) &&
      r.naam_zoekwoord === naamZoekwoord &&
      r.omschrijving_zoekwoord === omschrZoekwoord
    );
    return match?.id ?? null;
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
        const regelId = await vindMatchendeRegelId(t, gekozenNaamChip || null, gekozenWoord || null);
        if (regelId !== null) await fetch(`/api/categorieen/${regelId}`, { method: 'DELETE' });
        await triggerHermatch();
      } else {
        await fetch(`/api/transacties/${t.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categorie_id: null, status: 'nieuw', handmatig_gecategoriseerd: 0, toelichting: toelichting || null }),
        });
      }
      setReloadTrigger(n => n + 1);
      return;
    }
    if (!nieuweCat) { setReloadTrigger(n => n + 1); return; }

    if (scope === 'enkel') {
      if (catNieuw) {
        await fetch('/api/budgetten-potjes', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ naam: nieuweCat.trim(), rekening_id: nieuweCatRekeningId ? parseInt(nieuweCatRekeningId, 10) : null }),
        });
      }
      await fetch(`/api/transacties/${t.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorie: nieuweCat.trim(), subcategorie: subcatWaarde || null, status: 'verwerkt', handmatig_gecategoriseerd: 1, toelichting: toelichting || null }),
      });
      setReloadTrigger(n => n + 1);
      return;
    }

    let finalRegelId: number | null = null;
    if (catNieuw) {
      await fetch('/api/budgetten-potjes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naam: nieuweCat.trim(), rekening_id: nieuweCatRekeningId ? parseInt(nieuweCatRekeningId, 10) : null }),
      });
      const regelId = await vindMatchendeRegelId(t, gekozenNaamChip || null, gekozenWoord || null);
      if (regelId !== null) {
        await fetch(`/api/categorieen/${regelId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categorie: nieuweCat.trim(), subcategorie: subcatWaarde || null,
            toelichting: toelichting || null, naam_origineel: gekozenNaamLabel,
            naam_zoekwoord_raw: gekozenNaamChip || null, type: t.type,
            ...(t.tegenrekening_iban_bban ? { iban: t.tegenrekening_iban_bban } : {}),
          }),
        });
        finalRegelId = regelId;
      } else {
        finalRegelId = await maakCategorieregel(t, nieuweCat.trim(), subcatWaarde, gekozenWoord || null, true, gekozenNaamChip || null, gekozenNaamLabel, toelichting || null);
      }
    } else {
      finalRegelId = await maakCategorieregel(t, nieuweCat, subcatWaarde, gekozenWoord || null, true, gekozenNaamChip || null, gekozenNaamLabel, toelichting || null);
    }
    await triggerHermatch(toelichting || null, finalRegelId);
    setReloadTrigger(n => n + 1);
  }

  async function handleDelete(id: number) {
    await fetch(`/api/categorieen/${id}`, { method: 'DELETE' });
    await triggerHermatch();
    setReloadTrigger(n => n + 1);
  }

  // ── Tab 1: Categorieregels filtering ──────────────────────────────────

  const regelsUniekeCats = Array.from(new Set(regels.map(r => r.categorie)));
  const regelsCatTellers: Record<string, number> = {};
  for (const r of regels) regelsCatTellers[r.categorie] = (regelsCatTellers[r.categorie] ?? 0) + 1;

  const gefilterdeRegels = (
    regelsCatFilter === 'alle' ? regels : regels.filter(r => r.categorie === regelsCatFilter)
  ).filter(r => {
    if (!regelsZoek) return true;
    const q = regelsZoek.toLowerCase();
    return (
      r.iban?.toLowerCase().includes(q) ||
      r.naam_origineel?.toLowerCase().includes(q) ||
      r.naam_zoekwoord?.toLowerCase().includes(q) ||
      r.omschrijving_zoekwoord?.toLowerCase().includes(q) ||
      r.toelichting?.toLowerCase().includes(q) ||
      r.categorie.toLowerCase().includes(q) ||
      r.subcategorie?.toLowerCase().includes(q)
    );
  });

  function toggleRegelsSort(col: string) {
    if (regelsSortCol === col) setRegelsSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setRegelsSortCol(col); setRegelsSortDir('asc'); }
  }

  const gesorteerdeRegels = regelsSortCol
    ? [...gefilterdeRegels].sort((a, b) => {
        const av = String((a as unknown as Record<string, unknown>)[regelsSortCol!] ?? '');
        const bv = String((b as unknown as Record<string, unknown>)[regelsSortCol!] ?? '');
        const cmp = av.localeCompare(bv, 'nl');
        return regelsSortDir === 'asc' ? cmp : -cmp;
      })
    : gefilterdeRegels;

  // ── Tab 2: Aangepast filtering ────────────────────────────────────────

  const aangepastUniekeCats = Array.from(new Set(transacties.map(t => t.categorie).filter((c): c is string => c !== null)));
  const aangepastCatTellers: Record<string, number> = {};
  for (const t of transacties) if (t.categorie) aangepastCatTellers[t.categorie] = (aangepastCatTellers[t.categorie] ?? 0) + 1;

  const gefilterdeTransacties = (
    aangepastCatFilter === 'alle' ? transacties : transacties.filter(t => t.categorie === aangepastCatFilter)
  ).filter(t => {
    if (!aangepastZoek) return true;
    const q = aangepastZoek.toLowerCase();
    return (
      t.naam_tegenpartij?.toLowerCase().includes(q) ||
      t.omschrijving_1?.toLowerCase().includes(q) ||
      t.tegenrekening_iban_bban?.toLowerCase().includes(q) ||
      t.toelichting?.toLowerCase().includes(q) ||
      t.categorie?.toLowerCase().includes(q) ||
      t.subcategorie?.toLowerCase().includes(q)
    );
  });

  function toggleAangepastSort(col: string) {
    if (aangepastSortCol === col) setAangepastSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setAangepastSortCol(col); setAangepastSortDir('asc'); }
  }

  const gesorteerdeTransacties = aangepastSortCol
    ? [...gefilterdeTransacties].sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[aangepastSortCol!] ?? '';
        const bv = (b as unknown as Record<string, unknown>)[aangepastSortCol!] ?? '';
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv : String(av).localeCompare(String(bv), 'nl');
        return aangepastSortDir === 'asc' ? cmp : -cmp;
      })
    : gefilterdeTransacties;

  // ── Render helpers ────────────────────────────────────────────────────

  const REGELS_KOLOMMEN = [
    { id: 'iban', label: 'IBAN' },
    { id: 'naam_origineel', label: 'Naam tegenpartij' },
    { id: 'naam_zoekwoord', label: 'Naam zoekwoord' },
    { id: 'omschrijving_zoekwoord', label: 'Omschrijving zoekwoord' },
    { id: 'toelichting', label: 'Toelichting' },
    { id: 'categorie', label: 'Categorie' },
    { id: 'subcategorie', label: 'Subcategorie' },
    { id: 'type', label: 'Type' },
  ];

  const AANGEPAST_KOLOMMEN = [
    { id: 'datum', label: 'Datum' },
    { id: 'iban_bban', label: 'IBAN eigen' },
    { id: 'tegenrekening_iban_bban', label: 'IBAN tegenrekening' },
    { id: 'naam_tegenpartij', label: 'Naam tegenpartij' },
    { id: 'bedrag', label: 'Bedrag' },
    { id: 'type', label: 'Type' },
    { id: 'categorie', label: 'Categorie' },
    { id: 'subcategorie', label: 'Subcategorie' },
    { id: 'toelichting', label: 'Toelichting' },
    { id: 'omschrijving_1', label: 'Omschrijving' },
  ];

  function renderCatFilterKnoppen(
    items: { categorie: string | null }[],
    uniekeCats: string[],
    catTellers: Record<string, number>,
    actieveFilter: string | 'alle',
    setFilter: (v: string | 'alle') => void,
  ) {
    return (
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('alle')} style={filterKnopStijl(actieveFilter === 'alle')}>
          Alle categorieën ({items.length})
        </button>
        {uniekeCats.map(cat => {
          const kleur = budgettenPotjes.find(bp => bp.naam === cat)?.kleur ?? undefined;
          const actief = actieveFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                ...filterKnopStijl(actief),
                background: actief ? (kleur ?? 'var(--accent)') : 'var(--bg-card)',
                borderColor: kleur ?? 'var(--border)',
                color: actief ? '#fff' : (kleur ?? 'var(--text)'),
              }}
            >
              {cat} ({catTellers[cat] ?? 0})
            </button>
          );
        })}
      </div>
    );
  }

  function renderZoekbalk(zoekterm: string, setZoekterm: (v: string) => void) {
    return (
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <input
          type="text"
          placeholder="Zoek…"
          value={zoekterm}
          onChange={e => setZoekterm(e.target.value)}
          style={{
            width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '6px 32px 6px 10px', fontSize: 13,
            color: 'var(--text-h)', outline: 'none',
          }}
        />
        {zoekterm && (
          <button
            onClick={() => setZoekterm('')}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--text-dim)',
              cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1,
            }}
          >×</button>
        )}
      </div>
    );
  }

  function renderSortHeader(kolommen: { id: string; label: string }[], sortCol: string | null, sortDir: 'asc' | 'desc', toggleSort: (col: string) => void, extraTh?: boolean) {
    return (
      <tr>
        {kolommen.map(k => (
          <th
            key={k.id}
            onClick={() => toggleSort(k.id)}
            style={{ whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
              ...(k.id === 'bedrag' ? { textAlign: 'right' } : {}),
            }}
          >
            {k.label}
            <span style={{ marginLeft: 4, opacity: sortCol === k.id ? 1 : 0.3 }}>
              {sortCol === k.id && sortDir === 'desc' ? '↓' : '↑'}
            </span>
          </th>
        ))}
        {extraTh && <th style={{ width: 80 }}></th>}
      </tr>
    );
  }

  // ── Tabs ──────────────────────────────────────────────────────────────

  const tabStijl = (actief: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px 16px', fontSize: 14, cursor: 'pointer',
    background: actief ? 'var(--bg-card)' : 'transparent',
    color: actief ? 'var(--accent)' : 'var(--text-muted)',
    fontWeight: actief ? 600 : 400, border: 'none',
    borderBottom: actief ? '2px solid var(--accent)' : '2px solid transparent',
    marginBottom: -2,
  });

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', marginBottom: 16, borderBottom: '2px solid var(--border)' }}>
        <button onClick={() => setTab('regels')} style={tabStijl(tab === 'regels')}>
          Categorieregels ({regels.length})
        </button>
        <button onClick={() => setTab('aangepast')} style={tabStijl(tab === 'aangepast')}>
          🔒 Aangepast ({transacties.length})
        </button>
      </div>

      {/* Tab 1: Categorieregels */}
      {tab === 'regels' && (
        <>
          {renderCatFilterKnoppen(regels, regelsUniekeCats, regelsCatTellers, regelsCatFilter, setRegelsCatFilter)}
          {renderZoekbalk(regelsZoek, setRegelsZoek)}

          {gesorteerdeRegels.length === 0 ? (
            <p className="empty">Geen categorieregels gevonden.</p>
          ) : (
            <>
              <div
                ref={topScrollRef1}
                onScroll={() => syncScroll1('top')}
                style={{ overflowX: 'scroll', overflowY: 'hidden', height: 14, scrollbarColor: 'var(--border) var(--bg-base)', scrollbarWidth: 'thin' }}
              >
                <div style={{ minWidth: containerWidth1 + 10, height: 1 }} />
              </div>
              <div ref={tableWrapperRef1} className="table-wrapper" onScroll={() => syncScroll1('table')}>
                <table style={{ minWidth: 1200 }}>
                  <thead>
                    {renderSortHeader(REGELS_KOLOMMEN, regelsSortCol, regelsSortDir, toggleRegelsSort, true)}
                  </thead>
                  <tbody>
                    {gesorteerdeRegels.map(r => {
                      const catKleur = budgettenPotjes.find(bp => bp.naam === r.categorie)?.kleur ?? 'var(--accent)';
                      return (
                        <tr key={r.id} onClick={() => openRegelPopup(r)} style={{ cursor: 'pointer' }}>
                          <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{r.iban || <em style={{ color: 'var(--text-dim)' }}>—</em>}</td>
                          <td style={{ color: 'var(--text-h)', fontWeight: 500 }}>{r.naam_origineel || <em style={{ color: 'var(--text-dim)' }}>—</em>}</td>
                          <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{r.naam_zoekwoord || <em style={{ color: 'var(--text-dim)' }}>—</em>}</td>
                          <td style={{ fontSize: 11 }}>{r.omschrijving_zoekwoord || <em style={{ color: 'var(--text-dim)' }}>—</em>}</td>
                          <td style={{ fontSize: 12 }}>{r.toelichting || <em style={{ color: 'var(--text-dim)' }}>—</em>}</td>
                          <td>
                            <span className="badge" style={{ background: kleurBg(catKleur), border: `1px solid ${catKleur}`, color: catKleur }}>{r.categorie}</span>
                          </td>
                          <td>
                            {r.subcategorie
                              ? <span className="badge-outline" style={{ borderColor: catKleur, color: catKleur }}>{r.subcategorie}</span>
                              : <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>}
                          </td>
                          <td><span className="badge">{formatType(r.type)}</span></td>
                          <td onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleDelete(r.id)}
                              style={{
                                background: 'none', border: '1px solid var(--red)', color: 'var(--red)',
                                fontSize: 12, cursor: 'pointer', padding: '3px 10px', borderRadius: 4,
                              }}
                            >
                              Verwijder
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* Tab 2: Aangepast */}
      {tab === 'aangepast' && (
        <>
          {renderCatFilterKnoppen(transacties, aangepastUniekeCats, aangepastCatTellers, aangepastCatFilter, setAangepastCatFilter)}
          {renderZoekbalk(aangepastZoek, setAangepastZoek)}

          {gesorteerdeTransacties.length === 0 ? (
            <p className="empty">Geen handmatig gecategoriseerde transacties gevonden.</p>
          ) : (
            <>
              <div
                ref={topScrollRef2}
                onScroll={() => syncScroll2('top')}
                style={{ overflowX: 'scroll', overflowY: 'hidden', height: 14, scrollbarColor: 'var(--border) var(--bg-base)', scrollbarWidth: 'thin' }}
              >
                <div style={{ minWidth: containerWidth2 + 10, height: 1 }} />
              </div>
              <div ref={tableWrapperRef2} className="table-wrapper" onScroll={() => syncScroll2('table')}>
                <table style={{ minWidth: 1200 }}>
                  <thead>
                    {renderSortHeader(AANGEPAST_KOLOMMEN, aangepastSortCol, aangepastSortDir, toggleAangepastSort)}
                  </thead>
                  <tbody>
                    {gesorteerdeTransacties.map(t => {
                      const catKleur = budgettenPotjes.find(bp => bp.naam === t.categorie)?.kleur ?? 'var(--accent)';
                      return (
                        <tr key={t.id} onClick={() => openCategoriePopup(t)} style={{ cursor: 'pointer' }}>
                          <td style={{ color: 'var(--text-dim)', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDatum(t.datum)}</td>
                          <td style={{ color: 'var(--text-dim)', fontSize: 11 }}>{t.iban_bban ?? '—'}</td>
                          <td style={{ color: 'var(--text-dim)', fontSize: 11 }}>{t.tegenrekening_iban_bban ?? '—'}</td>
                          <td style={{ color: 'var(--text-h)', fontWeight: 500 }}>
                            <span style={{ color: 'var(--text-dim)', marginRight: 4, fontSize: 11 }}>🔒</span>
                            {t.naam_tegenpartij ?? '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: (t.bedrag ?? 0) < 0 ? 'var(--red)' : 'var(--green)' }}>{formatBedrag(t.bedrag)}</td>
                          <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{formatType(t.type)}</td>
                          <td>
                            {t.categorie
                              ? <span className="badge" style={{ background: kleurBg(catKleur), border: `1px solid ${catKleur}`, color: catKleur }}>{t.categorie}</span>
                              : <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>}
                          </td>
                          <td>
                            {t.subcategorie
                              ? <span className="badge-outline" style={{ borderColor: catKleur, color: catKleur }}>{t.subcategorie}</span>
                              : <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--accent)' }}>{t.toelichting || <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-dim)', minWidth: 200, whiteSpace: 'normal', wordBreak: 'break-word' }}>{t.omschrijving_1 ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* CategoriePopup */}
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
              const woorden = new Set(
                (t.omschrijving_1 ?? '').split(/[\s.,/()\[\]{}'"!?:;]+/)
                  .filter(w => w.length >= 3)
                  .map(w => w.toLowerCase().replace(/[^a-z0-9&-]/g, ''))
                  .filter(w => w.length > 0)
              );
              for (const w of woorden) tellers[w] = (tellers[w] ?? 0) + 1;
            }
            return tellers;
          }}
          budgettenPotjes={budgettenPotjes}
          rekeningen={rekeningen}
          uniekeCategorieenDropdown={uniekeCatDropdown}
        />
      )}
    </div>
  );
}
