// FILE: TransactiesTabel.tsx
// AANGEMAAKT: 25-03-2026 12:00
// VERSIE: 1
// GEWIJZIGD: 31-03-2026 14:30
//
// WIJZIGINGEN (31-03-2026 14:30):
// - CategoriePopup: periodes, onDatumWijzig, onVoegRekeningToe props meegegeven
// - handleDatumWijzig: PATCH datum + originele_datum (indien eerste keer)
// - handleVoegRekeningToe: navigeer naar /instellingen met iban + naam query params
// - Datumkolom: Calendar icoon + var(--accent) kleur als originele_datum gevuld
// WIJZIGINGEN (31-03-2026 02:30):
// - onAnalyseer fix: alle omschrijvingsvelden (1+2+3) meenemen in woordfrequentie telling
// WIJZIGINGEN (31-03-2026 02:00):
// - onAnalyseer prop toegevoegd aan CategoriePopup: woordfrequentie analyse per tegenpartij
// WIJZIGINGEN (31-03-2026 01:45):
// - Volledige tabelrij klikbaar voor CategoriePopup (onClick op tr i.p.v. individuele cellen)
// WIJZIGINGEN (31-03-2026 00:00):
// - Categorisatie popup geëxtraheerd naar CategoriePopup component (features/shared/components/)
// - PatronModalData interface verplaatst naar CategoriePopup; import type toegevoegd
// - tooltipNaam/tooltipOmschr state verwijderd (leeft nu in CategoriePopup)
// WIJZIGINGEN (30-03-2026 23:45):
// - Slotje-filterknop kleur opgehaald uit budgettenPotjes ("Aangepast" systeemitem)
// WIJZIGINGEN (30-03-2026 23:30):
// - Slotje-filterknop: inline met andere knoppen, label "🔒 Aangepast (N)", accent kleur stijl
// WIJZIGINGEN (30-03-2026 23:00):
// - Slotje-filterknop toegevoegd in categoriefilterbalk: filtert op handmatig_gecategoriseerd === 1
// WIJZIGINGEN (30-03-2026 21:30):
// - Omschrijving <td> volledig klikbaar: opent openCategoriePopup (onClick op td i.p.v. alleen toelichting div)
// WIJZIGINGEN (30-03-2026 21:00):
// - maakCategorieregel: toelichting param toegevoegd, meegegeven in POST body
// - handlePatronModalBevestig scope='alle': toelichting meegeven aan maakCategorieregel en PUT categorieregel
// WIJZIGINGEN (30-03-2026 20:15):
// - Toelichting tekst in omschrijving kolom klikbaar: opent openCategoriePopup
// WIJZIGINGEN (30-03-2026 20:00):
// - triggerHermatch: toelichting altijd meesturen als categorieId bekend is (ook bij leeg → wist toelichting)
// WIJZIGINGEN (30-03-2026 19:30):
// - Popup: toelichting verplaatst naar onder chips, boven scope-keuze
// - Popup: scope-sectie heeft nu koptekst "Toepassen op"
// WIJZIGINGEN (30-03-2026 19:00):
// - PatronModalData: toelichting veld toegevoegd
// - openCategoriePopup: toelichting pre-invullen vanuit transactie
// - handlePatronModalBevestig: toelichting meesturen bij scope='enkel' (PATCH) en scope='alle' (categoriseer bulk-update)
// - triggerHermatch: accepteert toelichting + categorieId; stuurt door naar /api/categoriseer
// - Popup: toelichting tekstveld boven bestaande inhoud
// - Omschrijving cel: toelichting tonen boven omschrijving_1 in var(--accent) kleur
// - Zoekfilter: zoekterm ook matchen op toelichting veld
// WIJZIGINGEN (30-03-2026 18:00):
// - Subcategorie <td> onClick: openCategoriePopup i.p.v. startEdit (zelfde gedrag als categorie cel)
// - openCategoriePopup: async; pre-invullen popup bij gecategoriseerde transacties (categorie, subcategorie, naam/omschrijving chips)
// WIJZIGINGEN (30-03-2026):
// - Tab-logica gebaseerd op rekening.beheerd vlag i.p.v. gekoppelde budgetten_potjes
// WIJZIGINGEN (29-03-2026 23:00):
// - Rekening-tabs boven transactiepagina: "Beheerde Rekeningen" (met gekoppelde categorie) + losse rekening-tabs
// - Transacties gefilterd op eigen_iban per actieve tab
// - BudgetPotjeNaam interface uitgebreid met rekening_id
// - Tabs alleen zichtbaar voor rekeningen met geïmporteerde transacties
// - Tabbar verborgen als er maar één tab is
//
// WIJZIGINGEN (29-03-2026 09:00):
// - containerWidth ResizeObserver: scrollWidth ipv contentRect.width; dep [klaar, laden] zodat observer start na data-load
// - tabelMinWidth gebaseerd op scrollWidth: top-scrollbalk thumb klopt nu exact met tabel scrollrange
// - tableRequiredWidth alleen updaten bij overflow (el.scrollWidth > el.clientWidth): voorkomt circulaire drempel
//
// WIJZIGINGEN (29-03-2026 08:30):
// - Actie <th>/<td> sticky: className="sticky-acties" (position sticky, right 0, bg var(--bg-card), z-index 1/2)
// - Buffer <td> verwijderd; aantalKolommen +1 i.p.v. +2
//
// WIJZIGINGEN (29-03-2026 07:30):
// - Externe actieskolom teruggedraaid; hamburgermenu terug als normale <th>/<td>
// - Lege buffer <td> (60px) na actieskolom zodat hamburgermenu volledig scrollbaar is
//
// WIJZIGINGEN (29-03-2026 07:00):
// - Tabelrij '<<< Naar maand' knop verwijderd; hamburger '<<< Naar [maand]' dynamisch gemaakt
// - Categorie dropdown merged met unieke categorieën uit transacties (/api/categorieen/uniek)
//
// WIJZIGINGEN (29-03-2026 01:00):
// - handlePatronModalBevestig: naam_tegenpartij als fallback voor naam_origineel wanneer null
// - maakNaamChips / analyseerOmschrijvingen: koppelteken verwijderd als splitsingsteken
// - categorie filterknoppen: teller toegevoegd per categorie, ongecategoriseerd en totaal
// - categorieFilter reset-useEffect verwijderd; filters werken nu onafhankelijk van elkaar
// - handleJaarSelectie: maand reset verwijderd bij jaar wissel
// - patronModal: geen standaard naam chip selectie bij openen
// - patronModal: labels hernoemd naar "Match op naam/omschrijving (optioneel)"
// - patronModal: ⓘ tooltip toegevoegd bij beide chip-secties
// - patronModal: omschrijving tooltip display:none → visibility/opacity fix; stijl + positie gelijkgetrokken
// - patronModal: tooltips herschreven naar React state (onMouseEnter/Leave); CSS-regel verwijderd
// - scope 'enkel': geen maakCategorieregel/PUT meer; alleen PATCH transactie met categorie+subcategorie
// - vindMatchendeRegelId: strict match op iban + naam_zoekwoord + omschrijving_zoekwoord
// - chip keys: index suffix toegevoegd om duplicaat-key warnings te voorkomen
// - patronModal: tooltip stijl verbeterd; positie onder ⓘ, donkere achtergrond, box-shadow
// - maakNaamChips / analyseerOmschrijvingen: chip waarde regex /[^a-z0-9&]/g → /[^a-z0-9&-]/g
// - maakCategorieregel: console.error met status + body alleen bij fout (was altijd)
//
// WIJZIGINGEN (28-03-2026 00:00):
// - Omboekingen klikbaar voor categorisatie (zelfde flow als ongecategoriseerde transacties)
// - Altijd volledige popup flow (patronModal) — categorieModal en GEVAL 2 verwijderd
// - openCategoriePopup: gecategoriseerde transacties gaan direct naar patronModal (geen tussenliggende select)
// - patronModal: categorie dropdown toegevoegd boven subcategorie (aanpasbaar, herlaadt subcatOpties)
// - patronModal: categorie start leeg (placeholder), "— Geen categorie —" wist categorie, "Nieuwe categorie..." tekstveld
// - patronModal: subcategorie placeholder + "— Geen subcategorie —" als expliciete keuze
// - handlePatronModalBevestig: '__geen__' categorie → categorie_id null + status nieuw
// - handlePatronModalBevestig: '__geen__' + alle → DELETE matchende categorieregel + hermatch
// - handlePatronModalBevestig: catNieuw → POST budgetten-potjes, upsert categorieregel (PUT/POST)
// - patronModal: rekening dropdown bij nieuwe of gewijzigde categorie

'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';
import { useSidebar } from '@/lib/sidebar-context';
import type { TransactieType } from '@/lib/schema';
import type { TransactieMetCategorie } from '@/lib/transacties';
import type { Periode } from '@/lib/maandperiodes';
import { formatType } from '@/lib/formatType';
import CategoriePopup from '@/features/shared/components/CategoriePopup';
import type { PatronModalData } from '@/features/shared/components/CategoriePopup';

interface BudgetPotjeNaam { id: number; naam: string; kleur: string | null; rekening_id: number | null; }
interface Rekening { id: number; naam: string; iban: string; beheerd: number; }

interface EditingCell {
  id: number;
  veld: 'categorie' | 'subcategorie';
  waarde: string;
  origCategorie: string;
}

const TYPE_FILTERS: { label: string; waarde: TransactieType | 'alle' }[] = [
  { label: 'Alle',            waarde: 'alle'          },
  { label: 'Normaal - AF',    waarde: 'normaal-af'    },
  { label: 'Normaal - BIJ',   waarde: 'normaal-bij'   },
  { label: 'Omboeking - AF',  waarde: 'omboeking-af'  },
  { label: 'Omboeking - BIJ', waarde: 'omboeking-bij' },
];

const MAAND_NAMEN = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];
const MAAND_KORT  = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

const ALLE_KOLOMMEN = [
  { id: 'datum',                   label: 'Datum',                standaard: true  },
  { id: 'iban_bban',               label: 'IBAN eigen rekening',  standaard: true  },
  { id: 'tegenrekening_iban_bban', label: 'IBAN tegenrekening',   standaard: true  },
  { id: 'naam_tegenpartij',        label: 'Naam tegenpartij',     standaard: true  },
  { id: 'bedrag',                  label: 'Bedrag',               standaard: true  },
  { id: 'type',                    label: 'Type',                 standaard: true  },
  { id: 'categorie',               label: 'Categorie',            standaard: true  },
  { id: 'subcategorie',            label: 'Subcategorie',         standaard: true  },
  { id: 'omschrijving_1',          label: 'Omschrijving',         standaard: true  },
  { id: 'rentedatum',              label: 'Rentedatum',           standaard: false },
  { id: 'saldo_na_trn',            label: 'Saldo na transactie',  standaard: false },
  { id: 'originele_datum',         label: 'Originele datum',      standaard: false },
  { id: 'transactiereferentie',    label: 'Transactiereferentie', standaard: false },
  { id: 'omschrijving_2',          label: 'Omschrijving-2',       standaard: false },
  { id: 'omschrijving_3',          label: 'Omschrijving-3',       standaard: false },
];

const DEFAULT_KOLOMMEN = new Set(ALLE_KOLOMMEN.filter(k => k.standaard).map(k => k.id));

function formatBedrag(bedrag: number | null): string {
  if (bedrag === null) return '—';
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag);
}

function formatDatum(datum: string | null): string {
  if (!datum) return '—';
  const p = datum.split('-');
  if (p.length !== 3) return datum;
  return `${p[2]}-${p[1]}-${p[0]}`;
}

function kleurBg(hex: string): string {
  if (!hex.startsWith('#') || hex.length < 7) return 'var(--accent-dim)';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.15)`;
}

const filterKnopStijl = (actief: boolean): React.CSSProperties => ({
  padding: '5px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
  border: '1px solid var(--border)',
  background: actief ? 'var(--accent)' : 'var(--bg-card)',
  color: actief ? '#fff' : 'var(--text)',
  fontWeight: actief ? 600 : 400,
});

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

export default function TransactiesTabel() {
  const [klaar, setKlaar]                               = useState(false);
  const [filter, setFilter]                             = useState<TransactieType | 'alle'>('alle');
  const [categorieFilter, setCategorieFilter]           = useState<string | 'alle'>('alle');
  const [vergrendeldFilter, setVergrendeldFilter]       = useState(false);
  const [sortCol, setSortCol]                           = useState<string | null>(null);
  const [sortDir, setSortDir]                           = useState<'asc' | 'desc'>('asc');
  const [periodes, setPeriodes]                         = useState<Periode[]>([]);
  const [geselecteerdePeriode, setGeselecteerdePeriode] = useState<Periode | null>(null);
  const [geselecteerdJaar, setGeselecteerdJaar]         = useState<number>(new Date().getFullYear());
  const [transacties, setTransacties]                   = useState<TransactieMetCategorie[]>([]);
  const [laden, setLaden]                               = useState(false);
  const [fout, setFout]                                 = useState<string | null>(null);
  const [budgettenPotjes, setBudgettenPotjes]           = useState<BudgetPotjeNaam[]>([]);
  const [rekeningen, setRekeningen]                     = useState<Rekening[]>([]);
  const [subcatOpties, setSubcatOpties]                 = useState<string[]>([]);
  const [editingCell, setEditingCell]                   = useState<EditingCell | null>(null);
  const [reloadTrigger, setReloadTrigger]               = useState(0);
  const [zichtbareKolommen, setZichtbareKolommen]       = useState<Set<string>>(DEFAULT_KOLOMMEN);
  const [kolomMenuOpen, setKolomMenuOpen]               = useState(false);
  const [zoekterm, setZoekterm]                         = useState('');
  const [actieveTab, setActieveTab]                     = useState<string>('beheerd');
const [patronModal, setPatronModal]                   = useState<PatronModalData | null>(null);
  const [uniekeCategorieenDropdown, setUniekeCategorieenDropdown] = useState<string[]>([]);
  const isSavingRef                                     = useRef(false);
  const cancelledRef                                    = useRef(false);
  const topScrollRef                                    = useRef<HTMLDivElement>(null);
  const tableWrapperRef                                 = useRef<HTMLDivElement>(null);
  const syncingRef                                      = useRef(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const { setTableRequiredWidth } = useSidebar();

  // Stap 1: laad periodes op mount, stel actuele in als standaard
  useEffect(() => {
    fetch('/api/periodes')
      .then(r => r.ok ? r.json() : [])
      .then((ps: Periode[]) => {
        setPeriodes(ps);
        const actueel = ps.find(p => p.status === 'actueel') ?? ps.at(-1) ?? null;
        setGeselecteerdePeriode(actueel);
        setGeselecteerdJaar(actueel?.jaar ?? new Date().getFullYear());
        setKlaar(true);
      });
  }, []);

  // Stap 2: laad transacties zodra periodes gereed zijn, of bij filterwijziging
  useEffect(() => {
    if (!klaar) return;
    setLaden(true);
    setFout(null);
    const queryParts: string[] = [];
    if (filter !== 'alle') queryParts.push(`type=${filter}`);
    if (geselecteerdePeriode) {
      queryParts.push(`datum_van=${geselecteerdePeriode.start}`);
      queryParts.push(`datum_tot=${geselecteerdePeriode.eind}`);
    } else {
      queryParts.push(`datum_van=${geselecteerdJaar}-01-01`);
      queryParts.push(`datum_tot=${geselecteerdJaar}-12-31`);
    }
    const url = queryParts.length > 0
      ? `/api/transacties?${queryParts.join('&')}`
      : '/api/transacties';
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('Laden mislukt.');
        return r.json() as Promise<TransactieMetCategorie[]>;
      })
      .then(data => { setTransacties(data); setLaden(false); })
      .catch(err  => { setFout(err.message); setLaden(false); });
  }, [klaar, filter, geselecteerdePeriode, geselecteerdJaar, reloadTrigger]);

  // Laad budgetten/potjes voor select-opties en kleurcodering
  useEffect(() => {
    fetch('/api/budgetten-potjes')
      .then(r => r.ok ? r.json() : [])
      .then(setBudgettenPotjes);
    fetch('/api/rekeningen')
      .then(r => r.ok ? r.json() : [])
      .then(setRekeningen);
    fetch('/api/categorieen/uniek')
      .then(r => r.ok ? r.json() : [])
      .then(setUniekeCategorieenDropdown);
  }, []);

  // Breedte van de tabel-container observeren (voor dynamische min-width scrollbalk)
  // scrollWidth ipv contentRect.width: top-scrollbar krijgt exact dezelfde scrollrange als de tabel
  // Dependency op klaar: tableWrapperRef.current is null op mount (tabel in conditional)
  useEffect(() => {
    if (!tableWrapperRef.current) return;
    const el = tableWrapperRef.current;
    const obs = new ResizeObserver(() => {
      setContainerWidth(el.scrollWidth);
      if (el.scrollWidth > el.clientWidth) setTableRequiredWidth(el.scrollWidth);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [klaar, laden]);

  // Laad bestaande subcategorieën voor datalist
  useEffect(() => {
    fetch('/api/categorieen')
      .then(r => r.ok ? r.json() : [])
      .then((regels: { subcategorie: string | null }[]) => {
        const uniek = Array.from(
          new Set(regels.map(r => r.subcategorie).filter((s): s is string => s !== null))
        );
        setSubcatOpties(uniek);
      });
  }, [reloadTrigger]);

  // Laad kolomkeuze uit localStorage op mount
  useEffect(() => {
    const stored = localStorage.getItem('transacties-kolommen');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setZichtbareKolommen(new Set(parsed));
      } catch { /* ignore */ }
    }
  }, []);

  // Sluit kolommenmenu bij klik buiten
  useEffect(() => {
    if (!kolomMenuOpen) return;
    function handleClick() { setKolomMenuOpen(false); }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [kolomMenuOpen]);

  // Hulpfuncties overgangszone
  const maandStartDag = periodes.length > 0 ? parseInt(periodes[0].start.slice(8, 10), 10) : 1;

  function isOvergangszone(datum: string | null): boolean {
    if (!datum || maandStartDag <= 1) return false;
    const dag = parseInt(datum.slice(8, 10), 10);
    if (dag < maandStartDag) return false;
    const y = parseInt(datum.slice(0, 4), 10);
    const m = parseInt(datum.slice(5, 7), 10);
    const nextM = m === 12 ? 1 : m + 1;
    const nextJ = m === 12 ? y + 1 : y;
    const p = periodes.find(p => p.jaar === nextJ && p.maand === nextM);
    return p?.status === 'afgesloten';
  }

  function vorigePeriodeLabel(datum: string): string {
    const y = parseInt(datum.slice(0, 4), 10);
    const m = parseInt(datum.slice(5, 7), 10);
    const nextM = m === 12 ? 1 : m + 1;
    const nextJ = m === 12 ? y + 1 : y;
    const prevM = nextM === 1 ? 12 : nextM - 1;
    const prevJ = nextM === 1 ? nextJ - 1 : nextJ;
    const p = periodes.find(p => p.jaar === prevJ && p.maand === prevM);
    return p?.label ?? `${prevM}/${prevJ}`;
  }

  async function openCategoriePopup(t: TransactieMetCategorie) {
    const naamChips = maakNaamChips(t.naam_tegenpartij ?? null);
    const chips = analyseerOmschrijvingen(t);

    if (t.categorie_id != null || t.categorie) {
      const regelsRes = await fetch('/api/categorieen');
      const regels: { id: number; naam_zoekwoord: string | null; omschrijving_zoekwoord: string | null; categorie: string; subcategorie: string | null }[] = regelsRes.ok ? await regelsRes.json() : [];
      const regel = t.categorie_id != null ? regels.find(r => r.id === t.categorie_id) ?? null : null;

      const categorie = t.categorie ?? '';
      const subcategorie = t.subcategorie ?? '';

      const naamZoekwoorden = regel?.naam_zoekwoord ? regel.naam_zoekwoord.split(' ').filter(Boolean) : [];
      const gekozenNaamChips = naamChips.filter(c => naamZoekwoorden.includes(c.waarde)).map(c => c.waarde);

      const omschrZoekwoorden = regel?.omschrijving_zoekwoord ? regel.omschrijving_zoekwoord.split(' ').filter(Boolean) : [];
      const gekozenWoorden = chips.filter(c => omschrZoekwoorden.includes(c.waarde)).map(c => c.waarde);

      const subcatRes = await fetch(`/api/subcategorieen?categorie=${encodeURIComponent(categorie)}`);
      const subcatOpties: string[] = subcatRes.ok ? await subcatRes.json() : [];

      setPatronModal({ transactie: t, toelichting: t.toelichting ?? '', nieuweCat: categorie, catNieuw: false, nieuweCatRekeningId: '', subcategorie, subcatOpties, subcatNieuw: false, naamChips, gekozenNaamChips, chips, gekozenWoorden, scope: t.categorie_id != null ? 'alle' : 'enkel' });
    } else {
      setPatronModal({ transactie: t, toelichting: t.toelichting ?? '', nieuweCat: '', catNieuw: false, nieuweCatRekeningId: '', subcategorie: '', subcatOpties: [], subcatNieuw: false, naamChips, gekozenNaamChips: [], chips, gekozenWoorden: [], scope: 'alle' });
    }
  }

  function startEdit(t: TransactieMetCategorie, veld: 'categorie' | 'subcategorie') {
    cancelledRef.current = false;
    setEditingCell({
      id: t.id,
      veld,
      waarde: veld === 'categorie' ? (t.categorie ?? '') : (t.subcategorie ?? ''),
      origCategorie: t.categorie ?? '',
    });
  }

  async function maakCategorieregel(
    t: TransactieMetCategorie,
    categorie: string,
    subcategorie: string,
    omschrWoord?: string | null,
    inclusiefIban = true,
    naamZoekWoord?: string | null,
    naamOrigineel?: string | null,
    toelichting?: string | null,
  ): Promise<number | null> {
    const body: Record<string, unknown> = {
      categorie,
      subcategorie:       subcategorie || null,
      type:               t.type,
      naam_origineel:     naamOrigineel !== undefined ? naamOrigineel : (t.naam_tegenpartij ?? null),
      naam_zoekwoord_raw: naamZoekWoord ?? null,
      toelichting:        toelichting ?? null,
    };
    if (inclusiefIban && t.tegenrekening_iban_bban) body.iban = t.tegenrekening_iban_bban;
    if (omschrWoord) body.omschrijving_raw = omschrWoord;

    const res = await fetch('/api/categorieen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const { id } = await res.json();
    return id as number;
  }

  async function triggerHermatch(toelichting?: string | null, categorieId?: number | null) {
    const extra = categorieId != null ? { toelichting: toelichting || null, categorie_id: categorieId } : {};
    await fetch('/api/categoriseer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(extra),
    });
  }

  async function handleInlineOpslaan(t: TransactieMetCategorie, waardeParam?: string) {
    if (!editingCell || editingCell.id !== t.id || isSavingRef.current || cancelledRef.current) return;
    isSavingRef.current = true;

    const { veld }     = editingCell;
    const waarde       = waardeParam ?? editingCell.waarde;
    const categorie    = veld === 'categorie' ? waarde.trim() : editingCell.origCategorie;
    const subcategorie = veld === 'subcategorie' ? waarde.trim() : (t.subcategorie ?? '');

    if (!categorie) {
      setEditingCell(null);
      isSavingRef.current = false;
      return;
    }

    // Altijd volledige flow: patroonherkenning + hermatch
    const chips = veld === 'categorie'
      ? analyseerOmschrijvingen(t)
      : [];
    setEditingCell(null);
    isSavingRef.current = false;

    if (veld === 'categorie') {
      const subcatRes = await fetch(`/api/subcategorieen?categorie=${encodeURIComponent(categorie)}`);
      const subcatOpties: string[] = subcatRes.ok ? await subcatRes.json() : [];
      const naamChips = maakNaamChips(t.naam_tegenpartij ?? null);
      setPatronModal({ transactie: t, toelichting: t.toelichting ?? '', nieuweCat: categorie, catNieuw: false, nieuweCatRekeningId: '', subcategorie, subcatOpties, subcatNieuw: false, naamChips, gekozenNaamChips: [], chips, gekozenWoorden: [], scope: t.categorie_id != null ? 'alle' : (t.categorie ? 'enkel' : 'alle') });
    } else {
      // Subcategorie-aanpassing: direct opslaan
      await maakCategorieregel(t, categorie, subcategorie, null, true);
      await triggerHermatch();
      setReloadTrigger(n => n + 1);
    }
  }

  async function vindMatchendeRegelId(
    t: TransactieMetCategorie,
    naamZoekwoord: string | null,
    omschrZoekwoord: string | null
  ): Promise<number | null> {
    const res = await fetch('/api/categorieen');
    if (!res.ok) return null;
    const regels: { id: number; naam_zoekwoord: string | null; iban: string | null; omschrijving_zoekwoord: string | null }[] = await res.json();
    const match = regels.find(r =>
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

    // Geen categorie
    if (nieuweCat === '__geen__') {
      if (scope === 'alle') {
        const regelId = await vindMatchendeRegelId(t, gekozenNaamChip || null, gekozenWoord || null);
        if (regelId !== null) await fetch(`/api/categorieen/${regelId}`, { method: 'DELETE' });
        await triggerHermatch();
      } else {
        await fetch(`/api/transacties/${t.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categorie_id: null, status: 'nieuw', handmatig_gecategoriseerd: 0, toelichting: toelichting || null }),
        });
      }
      setReloadTrigger(n => n + 1);
      return;
    }
    if (!nieuweCat) { setReloadTrigger(n => n + 1); return; }

    // scope 'enkel': alleen de transactie direct bijwerken, geen categorieregel aanmaken
    if (scope === 'enkel') {
      if (catNieuw) {
        await fetch('/api/budgetten-potjes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ naam: nieuweCat.trim(), rekening_id: nieuweCatRekeningId ? parseInt(nieuweCatRekeningId, 10) : null }),
        });
      }
      await fetch(`/api/transacties/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorie: nieuweCat.trim(), subcategorie: subcatWaarde || null, status: 'verwerkt', handmatig_gecategoriseerd: 1, toelichting: toelichting || null }),
      });
      setReloadTrigger(n => n + 1);
      return;
    }

    // scope 'alle': categorieregel aanmaken of updaten
    let finalRegelId: number | null = null;
    if (catNieuw) {
      await fetch('/api/budgetten-potjes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naam: nieuweCat.trim(), rekening_id: nieuweCatRekeningId ? parseInt(nieuweCatRekeningId, 10) : null }),
      });
      const regelId = await vindMatchendeRegelId(t, gekozenNaamChip || null, gekozenWoord || null);
      if (regelId !== null) {
        await fetch(`/api/categorieen/${regelId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categorie:          nieuweCat.trim(),
            subcategorie:       subcatWaarde || null,
            toelichting:        toelichting || null,
            naam_origineel:     gekozenNaamLabel,
            naam_zoekwoord_raw: gekozenNaamChip || null,
            type:               t.type,
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

  function syncScroll(source: 'top' | 'table') {
    if (syncingRef.current) return;
    syncingRef.current = true;
    if (source === 'top' && tableWrapperRef.current && topScrollRef.current) {
      tableWrapperRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    } else if (source === 'table' && topScrollRef.current && tableWrapperRef.current) {
      topScrollRef.current.scrollLeft = tableWrapperRef.current.scrollLeft;
    }
    requestAnimationFrame(() => { syncingRef.current = false; });
  }

  // Tab-logica: beheerd vlag per rekening
  const ibansMetTransacties = new Set(transacties.map(t => t.iban_bban).filter(Boolean));
  const beheerdeRekeningen = rekeningen.filter(r => r.beheerd === 1 && ibansMetTransacties.has(r.iban));
  const losseRekeningen    = rekeningen.filter(r => r.beheerd === 0 && ibansMetTransacties.has(r.iban));
  const beheerdeIbans      = new Set(beheerdeRekeningen.map(r => r.iban));

  const tabTransacties = actieveTab === 'beheerd'
    ? transacties.filter(t => beheerdeIbans.has(t.iban_bban ?? ''))
    : transacties.filter(t => t.iban_bban === actieveTab);

  // Jaar- en periodefilter helpers
  const jaarOpties       = Array.from(new Set(periodes.map(p => p.jaar))).sort((a, b) => a - b);
  const periodesVoorJaar = periodes.filter(p => p.jaar === geselecteerdJaar);

  function handleJaarSelectie(jaar: number) {
    setGeselecteerdJaar(jaar);
  }

  async function handleDatumWijzig(nieuweDatum: string, origineelDatum: string | null) {
    const tr = patronModal!.transactie;
    await fetch(`/api/transacties/${tr.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datum: nieuweDatum, originele_datum: origineelDatum }),
    });
  }

  function handleVoegRekeningToe(iban: string, naam: string) {
    window.location.href = `/instellingen?iban=${encodeURIComponent(iban)}&naam=${encodeURIComponent(naam)}`;
  }

  // Unieke categorieën uit huidige gefilterde transacties (voor categorie-filterrij)
  const uniekeCategorieën = Array.from(
    new Set(tabTransacties.map(t => t.categorie).filter((c): c is string => c !== null))
  );
  const categorieTellers: Record<string, number> = {};
  for (const t of tabTransacties) {
    if (t.categorie) categorieTellers[t.categorie] = (categorieTellers[t.categorie] ?? 0) + 1;
  }
  const ongecategoriseerdTeller = tabTransacties.filter(t => !t.categorie || t.status === 'nieuw').length;
  const aangepastTeller = tabTransacties.filter(t => t.handmatig_gecategoriseerd === 1).length;

  // Aantal zichtbare kolommen (data + actie + lege buffer)
  const aantalKolommen = ALLE_KOLOMMEN.filter(k => zichtbareKolommen.has(k.id)).length;
  const tabelMinWidth  = 1200;

  // Kolommen toggle helper
  function toggleKolom(id: string, aan: boolean) {
    setZichtbareKolommen(prev => {
      const next = new Set(prev);
      if (aan) next.add(id); else next.delete(id);
      localStorage.setItem('transacties-kolommen', JSON.stringify([...next]));
      return next;
    });
  }

  // Client-side categorie-filter + zoekfilter toepassen
  const gefilterdeTransacties = (
    categorieFilter === 'alle'
      ? tabTransacties
      : categorieFilter === 'ongecategoriseerd'
        ? tabTransacties.filter(t => !t.categorie || t.status === 'nieuw')
        : tabTransacties.filter(t => t.categorie === categorieFilter)
  ).filter(t => {
    if (vergrendeldFilter && t.handmatig_gecategoriseerd !== 1) return false;
    if (!zoekterm) return true;
    const q = zoekterm.toLowerCase();
    return (
      t.naam_tegenpartij?.toLowerCase().includes(q) ||
      t.omschrijving_1?.toLowerCase().includes(q) ||
      t.tegenrekening_iban_bban?.toLowerCase().includes(q) ||
      t.toelichting?.toLowerCase().includes(q)
    );
  });

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  const gesorteerdeTransacties = sortCol
    ? [...gefilterdeTransacties].sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[sortCol] ?? '';
        const bv = (b as unknown as Record<string, unknown>)[sortCol] ?? '';
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'nl');
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : gefilterdeTransacties;

  return (
    <div>
      {/* Rekening-tabs */}
      {(beheerdeRekeningen.length > 0 ? 1 : 0) + losseRekeningen.length > 1 && (
        <div style={{ display: 'flex', marginBottom: 16, borderBottom: '2px solid var(--border)' }}>
          {beheerdeRekeningen.length > 0 && (
            <button
              onClick={() => setActieveTab('beheerd')}
              style={{
                flex: 1, padding: '10px 16px', fontSize: 14, cursor: 'pointer',
                background: actieveTab === 'beheerd' ? 'var(--bg-card)' : 'transparent',
                color: actieveTab === 'beheerd' ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: actieveTab === 'beheerd' ? 600 : 400,
                border: 'none',
                borderBottom: actieveTab === 'beheerd' ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -2,
              }}
            >
              Beheerde Rekeningen
            </button>
          )}
          {losseRekeningen.map(r => (
            <button
              key={r.id}
              onClick={() => setActieveTab(r.iban)}
              style={{
                flex: 1, padding: '10px 16px', fontSize: 14, cursor: 'pointer',
                background: actieveTab === r.iban ? 'var(--bg-card)' : 'transparent',
                color: actieveTab === r.iban ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: actieveTab === r.iban ? 600 : 400,
                border: 'none',
                borderBottom: actieveTab === r.iban ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -2,
              }}
            >
              {r.naam}
            </button>
          ))}
        </div>
      )}

      {/* Typefilter-knoppen */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {TYPE_FILTERS.map(f => (
          <button key={f.waarde} onClick={() => setFilter(f.waarde)} style={filterKnopStijl(filter === f.waarde)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Categorie-filterrij */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setCategorieFilter('alle')} style={filterKnopStijl(categorieFilter === 'alle')}>
          Alle categorieën ({tabTransacties.length})
        </button>
        <button
          onClick={() => setCategorieFilter('ongecategoriseerd')}
          style={{
            ...filterKnopStijl(categorieFilter === 'ongecategoriseerd'),
            background: categorieFilter === 'ongecategoriseerd' ? 'var(--red)' : 'var(--bg-card)',
            borderColor: 'var(--red)',
            color: categorieFilter === 'ongecategoriseerd' ? '#fff' : 'var(--red)',
          }}
        >
          Ongecategoriseerd ({ongecategoriseerdTeller})
        </button>
        {uniekeCategorieën.map(cat => {
          const kleur = budgettenPotjes.find(bp => bp.naam === cat)?.kleur ?? undefined;
          const actief = categorieFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategorieFilter(cat)}
              style={{
                ...filterKnopStijl(actief),
                background: actief ? (kleur ?? 'var(--accent)') : 'var(--bg-card)',
                borderColor: kleur ?? 'var(--border)',
                color: actief ? '#fff' : (kleur ?? 'var(--text)'),
              }}
            >
              {cat} ({categorieTellers[cat] ?? 0})
            </button>
          );
        })}
        {(() => {
          const aangepastKleur = budgettenPotjes.find(bp => bp.naam === 'Aangepast')?.kleur ?? '#e8590c';
          return (
            <button
              onClick={() => setVergrendeldFilter(v => !v)}
              style={{
                ...filterKnopStijl(vergrendeldFilter),
                borderColor: aangepastKleur,
                background: vergrendeldFilter ? aangepastKleur : 'var(--bg-card)',
                color: vergrendeldFilter ? '#fff' : aangepastKleur,
              }}
              title="Filter op handmatig gecategoriseerd"
            >
              🔒 Aangepast ({aangepastTeller})
            </button>
          );
        })()}
      </div>

      {/* Jaarfilter-knoppen */}
      {jaarOpties.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {jaarOpties.map(jaar => (
            <button
              key={jaar}
              onClick={() => handleJaarSelectie(jaar)}
              style={filterKnopStijl(geselecteerdJaar === jaar)}
            >
              {jaar}
            </button>
          ))}
        </div>
      )}

      {/* Maand-knoppen */}
      {periodesVoorJaar.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(12, 1fr)', gap: 6, marginBottom: 20 }}>
          <button
            onClick={() => setGeselecteerdePeriode(null)}
            style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 12, textAlign: 'center',
              fontWeight: !geselecteerdePeriode ? 600 : 400,
              background: !geselecteerdePeriode ? 'var(--accent)' : 'var(--bg-card)',
              color: !geselecteerdePeriode ? '#fff' : 'var(--text-dim)',
              border: !geselecteerdePeriode ? '1px solid transparent' : '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            Alle
          </button>
          {periodesVoorJaar.map(p => {
            const geselecteerd = geselecteerdePeriode?.jaar === p.jaar && geselecteerdePeriode?.maand === p.maand;
            const toekomstig   = p.status === 'toekomstig';
            const actueel      = p.status === 'actueel';

            let bg: string, kleur: string, border: string, cursor: string, opacity: number;
            if (geselecteerd) {
              bg = 'var(--accent)'; kleur = '#fff';
              border = '1px solid transparent'; cursor = 'pointer'; opacity = 1;
            } else if (toekomstig) {
              bg = 'var(--bg-card)'; kleur = 'var(--text-dim)';
              border = '1px solid var(--border)'; cursor = 'not-allowed'; opacity = 0.3;
            } else if (actueel) {
              bg = 'transparent'; kleur = 'var(--accent)';
              border = '1px solid var(--accent)'; cursor = 'pointer'; opacity = 1;
            } else {
              bg = 'var(--bg-card)'; kleur = 'var(--text-dim)';
              border = '1px solid var(--border)'; cursor = 'pointer'; opacity = 1;
            }

            return (
              <button
                key={`${p.jaar}-${p.maand}`}
                onClick={() => !toekomstig && setGeselecteerdePeriode(p)}
                style={{
                  padding: '4px 0', borderRadius: 6, fontSize: 12, textAlign: 'center',
                  fontWeight: geselecteerd ? 600 : 400,
                  background: bg, color: kleur, border, cursor, opacity,
                  pointerEvents: toekomstig ? 'none' : 'auto',
                }}
              >
                <span className="maand-vol">{MAAND_NAMEN[p.maand - 1]}</span>
                <span className="maand-kort">{MAAND_KORT[p.maand - 1]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Zoekbalk + kolommen knop */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, position: 'relative' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            placeholder="Zoek op naam, omschrijving of IBAN…"
            value={zoekterm}
            onChange={e => setZoekterm(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '6px 32px 6px 10px',
              fontSize: 13,
              color: 'var(--text-h)',
              outline: 'none',
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
        <button
          onClick={e => { e.stopPropagation(); setKolomMenuOpen(o => !o); }}
          title="Kolommen instellen"
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-dim)', borderRadius: 6, padding: '4px 10px',
            fontSize: 14, cursor: 'pointer', flexShrink: 0,
          }}
        >⚙</button>
        {kolomMenuOpen && (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', right: 0, top: '100%', zIndex: 200,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 8, minWidth: 220, padding: '8px 0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)', marginTop: 4,
            }}
          >
            {ALLE_KOLOMMEN.map(k => (
              <label
                key={k.id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={zichtbareKolommen.has(k.id)}
                  onChange={e => toggleKolom(k.id, e.target.checked)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: 12, color: 'var(--text)' }}>{k.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {fout && <div className="error-melding">{fout}</div>}

      {!klaar || laden ? (
        <p className="loading">Laden…</p>
      ) : gefilterdeTransacties.length === 0 ? (
        <p className="empty">Geen transacties gevonden.</p>
      ) : (
        <>

          {/* Scrollbalk bovenaan (gesynchroniseerd) */}
          <div
            ref={topScrollRef}
            onScroll={() => syncScroll('top')}
            style={{ overflowX: 'scroll', overflowY: 'hidden', height: 14, scrollbarColor: 'var(--border) var(--bg-base)', scrollbarWidth: 'thin' }}
          >
            <div style={{ minWidth: containerWidth + 10, height: 1 }} />
          </div>

          <div ref={tableWrapperRef} className="table-wrapper" onScroll={() => syncScroll('table')}>
            <table style={{ minWidth: tabelMinWidth }}>
              <thead>
                <tr>
                  {ALLE_KOLOMMEN.filter(k => zichtbareKolommen.has(k.id)).map(k => (
                    <th
                      key={k.id}
                      onClick={() => toggleSort(k.id)}
                      style={{
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        userSelect: 'none',
                        ...(k.id === 'bedrag' || k.id === 'saldo_na_trn' ? { textAlign: 'right' } : {}),
                      }}
                    >
                      {k.label}
                      <span style={{ marginLeft: 4, opacity: sortCol === k.id ? 1 : 0.3 }}>
                        {sortCol === k.id && sortDir === 'desc' ? '↓' : '↑'}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gesorteerdeTransacties.map(t => {
                  const isOmboeking  = t.type === 'omboeking-af' || t.type === 'omboeking-bij';
                  const editCat      = editingCell?.id === t.id && editingCell.veld === 'categorie';
                  const editSub      = editingCell?.id === t.id && editingCell.veld === 'subcategorie';
                  const catKleur     = budgettenPotjes.find(bp => bp.naam === t.categorie)?.kleur ?? 'var(--accent)';
                  const inOgz        = isOvergangszone(t.datum);
                  const prevLabel    = inOgz && t.datum ? vorigePeriodeLabel(t.datum) : '';
                  const zk           = zichtbareKolommen;

                  return (
                    <Fragment key={t.id}>
                      <tr onClick={() => openCategoriePopup(t)} style={{ cursor: 'pointer' }}>
                        {zk.has('datum') && (
                          <td
                            style={{ color: t.originele_datum ? 'var(--accent)' : 'var(--text-dim)', fontSize: 12, whiteSpace: 'nowrap' }}
                            title={t.originele_datum ? `Origineel geboekt op ${formatDatum(t.originele_datum)}` : undefined}
                          >
                            {t.originele_datum && <Calendar size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />}
                            {formatDatum(t.datum)}
                          </td>
                        )}
                        {zk.has('iban_bban') && (
                          <td style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                            {t.iban_bban ?? '—'}
                            {t.rekening_naam && <div style={{ fontSize: 10, opacity: 0.65, marginTop: 1 }}>{t.rekening_naam}</div>}
                          </td>
                        )}
                        {zk.has('tegenrekening_iban_bban') && (
                          <td style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                            {t.tegenrekening_iban_bban ?? '—'}
                            {t.tegenrekening_naam && <div style={{ fontSize: 10, opacity: 0.65, marginTop: 1 }}>{t.tegenrekening_naam}</div>}
                          </td>
                        )}
                        {zk.has('naam_tegenpartij') && (
                          <td style={{ color: 'var(--text-h)', fontWeight: 500 }}>
                            {t.fout_geboekt === 1 && <span style={{ color: '#f76707', marginRight: 4, fontSize: 12 }}>⚠</span>}
                            {t.handmatig_gecategoriseerd === 1 && <span style={{ color: 'var(--text-dim)', marginRight: 4, fontSize: 11 }}>🔒</span>}
                            {t.naam_tegenpartij ?? '—'}
                          </td>
                        )}
                        {zk.has('bedrag') && (
                          <td style={{ textAlign: 'right', fontWeight: 600, color: (t.bedrag ?? 0) < 0 ? 'var(--red)' : 'var(--green)' }}>
                            {formatBedrag(t.bedrag)}
                          </td>
                        )}
                        {zk.has('type') && (
                          <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                            {formatType(t.type)}
                          </td>
                        )}
                        {zk.has('categorie') && (
                          <td>
                            {editCat ? (
                              <select
                                autoFocus
                                value={editingCell.waarde}
                                onChange={e => handleInlineOpslaan(t, e.target.value)}
                                onBlur={() => { if (!isSavingRef.current) { cancelledRef.current = true; setEditingCell(null); } }}
                                onKeyDown={e => { if (e.key === 'Escape') { cancelledRef.current = true; setEditingCell(null); } }}
                                style={{ background: 'var(--bg-base)', border: '1px solid var(--accent)', borderRadius: 4, padding: '2px 6px', fontSize: 12, color: 'var(--text-h)', outline: 'none' }}
                              >
                                {!editingCell.waarde && <option value="">— Kies categorie —</option>}
                                {budgettenPotjes.map(bp => (
                                  <option key={bp.id} value={bp.naam}>{bp.naam}</option>
                                ))}
                              </select>
                            ) : (
                              t.categorie
                                ? <span className="badge" style={{ cursor: 'pointer', background: kleurBg(catKleur), border: `1px solid ${catKleur}`, color: catKleur }}>{t.categorie}</span>
                                : <span className="badge-outline-red" style={{ cursor: 'pointer' }}>Ongecategoriseerd</span>
                            )}
                          </td>
                        )}
                        {zk.has('subcategorie') && (
                          <td>
                            {editSub ? (
                              <>
                                <input
                                  autoFocus list="subcat-lijst"
                                  value={editingCell.waarde}
                                  onChange={e => setEditingCell(c => c ? { ...c, waarde: e.target.value } : c)}
                                  onBlur={() => handleInlineOpslaan(t)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') { e.preventDefault(); handleInlineOpslaan(t); }
                                    if (e.key === 'Escape') { cancelledRef.current = true; setEditingCell(null); }
                                  }}
                                  placeholder="bijv. Supermarkt"
                                  style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--accent)', borderRadius: 4, padding: '2px 6px', fontSize: 12, color: 'var(--text-h)', outline: 'none' }}
                                />
                                <datalist id="subcat-lijst">
                                  {subcatOpties.map(s => <option key={s} value={s} />)}
                                </datalist>
                              </>
                            ) : (
                              t.subcategorie
                                ? <span className="badge-outline" style={{ cursor: 'pointer', borderColor: catKleur, color: catKleur }}>{t.subcategorie}</span>
                                : <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>
                            )}
                          </td>
                        )}
                        {zk.has('omschrijving_1') && (
                          <td style={{ fontSize: 12, minWidth: 370, whiteSpace: 'normal', wordBreak: 'break-word', overflow: 'visible' }}>
                            {t.toelichting && <div style={{ color: 'var(--accent)', marginBottom: 2 }}>{t.toelichting}</div>}
                            <span style={{ color: 'var(--text-dim)' }}>{t.omschrijving_1 ?? '—'}</span>
                          </td>
                        )}
                        {zk.has('rentedatum') && (
                          <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{formatDatum(t.rentedatum)}</td>
                        )}
                        {zk.has('saldo_na_trn') && (
                          <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-dim)' }}>{formatBedrag(t.saldo_na_trn)}</td>
                        )}
                        {zk.has('originele_datum') && (
                          <td style={{ color: t.originele_datum ? '#f76707' : 'var(--text-dim)', fontSize: 12 }}>{formatDatum(t.originele_datum)}</td>
                        )}
                        {zk.has('transactiereferentie') && (
                          <td style={{ color: 'var(--text-dim)', fontSize: 11 }}>{t.transactiereferentie ?? '—'}</td>
                        )}
                        {zk.has('omschrijving_2') && (
                          <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{t.omschrijving_2 ?? '—'}</td>
                        )}
                        {zk.has('omschrijving_3') && (
                          <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{t.omschrijving_3 ?? '—'}</td>
                        )}

                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal: Patroonherkenning omschrijving */}
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
          periodes={periodes}
          onDatumWijzig={handleDatumWijzig}
          onVoegRekeningToe={handleVoegRekeningToe}
          uniekeCategorieenDropdown={uniekeCategorieenDropdown}
        />
      )}
    </div>
  );
}
