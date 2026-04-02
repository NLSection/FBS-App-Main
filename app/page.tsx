// FILE: page.tsx
// AANGEMAAKT: 25-03-2026 14:00
// VERSIE: 1
// GEWIJZIGD: 02-04-2026 20:00
//
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

import { useEffect, useState, useCallback } from 'react';
import type { Periode } from '@/lib/maandperiodes';
import CategoriePopup from '@/features/shared/components/CategoriePopup';
import type { PatronModalData } from '@/features/shared/components/CategoriePopup';
import type { TransactieMetCategorie } from '@/lib/transacties';

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
interface Rekening { id: number; naam: string; iban: string; beheerd: number; }

interface BlsRegel {
  categorie: string;
  gedaanOpRekening: string;
  hoortOpRekening: string;
  bedrag: number;
  gecorrigeerd: number;
  saldo: number;
  transacties: BlsTransactie[];
}

function formatBedrag(bedrag: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag);
}

function maakNaamChips(naam: string | null): { label: string; waarde: string }[] {
  if (!naam) return [];
  return naam
    .split(/[\s.,/()\[\]{}'"!?:;]+/)
    .filter(w => w.length >= 1)
    .map(w => ({ label: w, waarde: w.toLowerCase().replace(/[^a-z0-9&-]/g, '') }))
    .filter(c => c.waarde.length > 0);
}

function analyseerOmschrijvingenBls(trx: BlsTransactie): { label: string; waarde: string }[] {
  const omschr = [trx.omschrijving_1, trx.omschrijving_2, trx.omschrijving_3]
    .filter(Boolean).join(' ');
  if (!omschr) return [];
  return omschr
    .split(/[\s.,/()\[\]{}'"!?:;]+/)
    .filter(w => w.length >= 1)
    .map(w => ({ label: w, waarde: w.toLowerCase().replace(/[^a-z0-9&-]/g, '') }))
    .filter(c => c.waarde.length > 0);
}

const filterKnop = (actief: boolean): React.CSSProperties => ({
  padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
  fontWeight: actief ? 600 : 400,
  background: actief ? 'var(--accent)' : 'var(--bg-card)',
  color: actief ? '#fff' : 'var(--text-dim)',
  border: actief ? '1px solid transparent' : '1px solid var(--border)',
});

export default function DashboardPage() {
  const [periodes, setPeriodes]                   = useState<Periode[]>([]);
  const [geselecteerdePeriode, setGeselecteerdePeriode] = useState<Periode | null>(null);
  const [geselecteerdJaar, setGeselecteerdJaar]   = useState<number>(new Date().getFullYear());
  const [blsData, setBlsData]                     = useState<BlsRegel[]>([]);
  const [laadtPeriodes, setLaadtPeriodes]         = useState(true);
  const [laadtBls, setLaadtBls]                   = useState(false);
  const [openRijen, setOpenRijen]                 = useState<Set<string>>(new Set());
  const [fout, setFout]                           = useState('');
  const [patronModal, setPatronModal]             = useState<PatronModalData | null>(null);
  const [budgettenPotjes, setBudgettenPotjes]     = useState<BudgetPotjeNaam[]>([]);
  const [rekeningen, setRekeningen]               = useState<Rekening[]>([]);
  const [uniekeCategorieenDropdown, setUniekeCategorieenDropdown] = useState<string[]>([]);

  // Periodes laden
  useEffect(() => {
    fetch('/api/periodes')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data: Periode[]) => {
        setPeriodes(data);
        const actueel = data.find(p => p.status === 'actueel') ?? data[data.length - 1] ?? null;
        if (actueel) {
          setGeselecteerdePeriode(actueel);
          setGeselecteerdJaar(actueel.jaar);
        }
      })
      .catch(() => setFout('Kon periodes niet ophalen.'))
      .finally(() => setLaadtPeriodes(false));
  }, []);

  // BLS data laden
  const laadBls = useCallback((periode: Periode | null, jaar: number, allesPeriodes: Periode[]) => {
    setLaadtBls(true);
    setFout('');

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

    fetch(`/api/dashboard/bls?datum_van=${datumVan}&datum_tot=${datumTot}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data: BlsRegel[]) => { setBlsData(data); setOpenRijen(new Set()); })
      .catch(() => setFout('Kon BLS-data niet ophalen.'))
      .finally(() => setLaadtBls(false));
  }, []);

  useEffect(() => {
    laadBls(geselecteerdePeriode, geselecteerdJaar, periodes);
  }, [geselecteerdePeriode, geselecteerdJaar, periodes, laadBls]);

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
    laadBls(geselecteerdePeriode, geselecteerdJaar, periodes);
  }

  async function openCategoriePopupBls(trx: BlsTransactie, e: React.MouseEvent) {
    e.stopPropagation();
    const naamChips = maakNaamChips(trx.naam_tegenpartij ?? null);
    const chips = analyseerOmschrijvingenBls(trx);

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
          {/* Jaarknoppen */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {jaarOpties.map(jaar => (
              <button key={jaar} onClick={() => handleJaar(jaar)} style={filterKnop(geselecteerdJaar === jaar)}>
                {jaar}
              </button>
            ))}
          </div>

          {/* Maandknoppen */}
          {periodesVoorJaar.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(12, 1fr)', gap: 6, marginBottom: 0 }}>
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
        </div>
      )}

      {/* BLS Sectie */}
      <p className="section-title">Balans Budgetten en Potjes</p>
      {laadtBls ? (
        <div className="loading">BLS-data wordt geladen…</div>
      ) : blsData.length === 0 && !fout ? (
        <div className="empty">Geen data voor deze periode.</div>
      ) : (
        <div className="table-wrapper" style={{ marginBottom: 36 }}>
          <table>
            <thead>
              <tr>
                <th>Categorie</th>
                <th style={{ textAlign: 'right' }}>Bedrag</th>
                <th style={{ textAlign: 'right' }}>Gecorrigeerd</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {blsData.map(rij => {
                const sleutel = `${rij.categorie}::${rij.gedaanOpRekening}`;
                const isOpen = openRijen.has(sleutel);
                const badge: React.CSSProperties = { fontSize: 10, borderRadius: 3, padding: '0px 4px', fontWeight: 500 };
                const toggleRij = () => setOpenRijen(prev => {
                  const next = new Set(prev);
                  if (next.has(sleutel)) next.delete(sleutel); else next.add(sleutel);
                  return next;
                });
                return (
                  <tr key={sleutel} style={{ cursor: 'default' }}>
                    <td colSpan={4} style={{ padding: 0 }}>
                      {/* Hoofdrij */}
                      <div onClick={toggleRij} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', cursor: 'pointer', borderLeft: `2px solid ${borderKleur(rij.saldo)}`, paddingLeft: 10, paddingTop: 6, paddingBottom: 6 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-h)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, color: 'var(--text-dim)', transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>
                            {rij.categorie}
                            {rij.saldo === 0 && <span style={{ color: 'var(--green)', fontSize: 12, fontWeight: 700 }}>✓</span>}
                          </div>
                          <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 16 }}>
                            <span style={{ ...badge, background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>{rij.gedaanOpRekening}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>→</span>
                            <span style={{ ...badge, background: 'var(--bg-base)', border: '1px solid var(--accent)', color: 'var(--accent)' }}>{rij.hoortOpRekening}</span>
                          </div>
                        </div>
                        <span style={{ ...tdNum, padding: '0 12px' }}>{formatBedrag(rij.bedrag)}</span>
                        <span style={{ ...tdNum, padding: '0 12px' }}>{rij.gecorrigeerd !== 0 ? formatBedrag(rij.gecorrigeerd) : '—'}</span>
                        <span style={{ ...tdNum, padding: '0 12px', color: saldoKleur(rij.saldo), fontWeight: 600 }}>{formatBedrag(rij.saldo)}</span>
                      </div>
                      {/* Subtabel */}
                      {isOpen && rij.transacties && rij.transacties.length > 0 && (
                        <div style={{ paddingLeft: 28, paddingRight: 8, paddingBottom: 8 }}>
                          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500 }}>Datum</th>
                                <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500 }}>Naam</th>
                                <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500 }}>Omschrijving</th>
                                <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 500 }}>Bedrag</th>
                                <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500 }}>Rekening</th>
                                <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500 }}>Categorie</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rij.transacties.map(trx => (
                                <tr key={trx.id} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>
                                  <td style={{ padding: '3px 6px', whiteSpace: 'nowrap' }}>{trx.datum ?? '—'}</td>
                                  <td style={{ padding: '3px 6px' }}>{trx.naam_tegenpartij ?? '—'}</td>
                                  <td style={{ padding: '3px 6px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trx.omschrijving ?? '—'}</td>
                                  <td style={{ padding: '3px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{trx.bedrag != null ? formatBedrag(trx.bedrag) : '—'}</td>
                                  <td style={{ padding: '3px 6px' }}>{trx.rekening_naam ?? '—'}</td>
                                  <td style={{ padding: '3px 6px' }}>
                                    <span
                                      onClick={(e) => openCategoriePopupBls(trx, e)}
                                      style={{ cursor: 'pointer', fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--bg-base)', border: '1px solid var(--accent)', color: 'var(--accent)', fontWeight: 500, whiteSpace: 'nowrap' }}
                                    >
                                      {trx.categorie ?? 'Categoriseer'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
