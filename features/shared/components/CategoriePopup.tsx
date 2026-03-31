// FILE: CategoriePopup.tsx
// AANGEMAAKT: 31-03-2026 00:00
// VERSIE: 1
// GEWIJZIGD: 31-03-2026 15:00
//
// WIJZIGINGEN (31-03-2026 15:00):
// - Datum sectie: kop "BOEKDATUM", outline knopstijl, geen tijd in datumweergave
// - Rekeningen sectie: kop "REKENINGEN", alleen tonen als tegenrekening gevuld, kaartjes layout
// - ArrowLeft toegevoegd voor normaal-bij richting
// WIJZIGINGEN (31-03-2026 02:00):
// - Woordfrequentie analyse: onAnalyseer prop, Analyseer/Verberg knop, tellers in omschrijving chips
// WIJZIGINGEN (31-03-2026 00:00):
// - Geëxtraheerd uit TransactiesTabel.tsx: patronModal popup als gedeeld component
// - Props: patronModal data, setPatronModal, onBevestig, onSluiten, budgettenPotjes, rekeningen, uniekeCategorieenDropdown

'use client';

import { useState } from 'react';
import { ChevronsLeft, ChevronsRight, ArrowLeft, ArrowRight, ArrowLeftRight } from 'lucide-react';
import type { TransactieMetCategorie } from '@/lib/transacties';
import type { Periode } from '@/lib/maandperiodes';

export interface PatronModalData {
  transactie: TransactieMetCategorie;
  toelichting: string;
  nieuweCat: string;
  catNieuw: boolean;
  nieuweCatRekeningId: string;
  subcategorie: string;
  subcatOpties: string[];
  subcatNieuw: boolean;
  naamChips: { label: string; waarde: string }[];
  gekozenNaamChips: string[];
  chips: { label: string; waarde: string }[];
  gekozenWoorden: string[];
  scope: 'enkel' | 'alle';
}

interface BudgetPotjeNaam { id: number; naam: string; kleur: string | null; rekening_id: number | null; }
interface Rekening { id: number; naam: string; iban: string; beheerd: number; }

interface CategoriePopupProps {
  patronModal: PatronModalData;
  setPatronModal: React.Dispatch<React.SetStateAction<PatronModalData | null>>;
  onBevestig: () => void;
  onSluiten: () => void;
  onAnalyseer: () => Promise<Record<string, number>>;
  onDatumWijzig: (nieuweDatum: string, origineelBehouden: boolean) => Promise<void>;
  onVoegRekeningToe: (iban: string, naam: string) => void;
  budgettenPotjes: BudgetPotjeNaam[];
  rekeningen: Rekening[];
  periodes: Periode[];
  uniekeCategorieenDropdown: string[];
}

function formatDatum(d: string | null): string {
  if (!d) return '—';
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d;
}

export default function CategoriePopup({
  patronModal, setPatronModal, onBevestig, onSluiten, onAnalyseer, onDatumWijzig, onVoegRekeningToe,
  budgettenPotjes, rekeningen, periodes, uniekeCategorieenDropdown,
}: CategoriePopupProps) {
  const [tooltipNaam, setTooltipNaam]       = useState(false);
  const [tooltipOmschr, setTooltipOmschr]   = useState(false);
  const [woordTellers, setWoordTellers]     = useState<Record<string, number> | null>(null);
  const [tellerLaden, setTellerLaden]       = useState(false);

  const t = patronModal.transactie;
  const isOmboeking = t.type === 'omboeking-af' || t.type === 'omboeking-bij';
  const isEigenTegenrekening = !t.tegenrekening_iban_bban || rekeningen.some(r => r.iban === t.tegenrekening_iban_bban);
  const eigenRekening = rekeningen.find(r => r.iban === t.iban_bban);

  const currentPeriodeIdx = t.datum
    ? periodes.findIndex(p => t.datum! >= p.start && t.datum! <= p.eind)
    : -1;
  const volgendePeriode = currentPeriodeIdx >= 0 && currentPeriodeIdx < periodes.length - 1
    ? periodes[currentPeriodeIdx + 1]
    : null;
  const vorigePeriode = currentPeriodeIdx > 0
    ? periodes[currentPeriodeIdx - 1]
    : null;

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8,
  };
  const knopStijl: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)',
    borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
  };
  const kaartStijl: React.CSSProperties = {
    background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', flex: 1,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, minWidth: 360, maxWidth: 520 }}>
        <h3 style={{ margin: '0 0 8px', color: 'var(--text-h)', fontSize: 16 }}>Omschrijving matchcriterium</h3>
        <p style={{ margin: '0 0 14px', color: 'var(--text)', fontSize: 13 }}>
          Categorie <strong>{patronModal.nieuweCat}</strong> wordt opgeslagen voor alle transacties van{' '}
          <strong>{patronModal.transactie.naam_tegenpartij ?? 'deze tegenpartij'}</strong>.
          Selecteer optioneel een terugkerend woord om de regel specifieker te maken:
        </p>

        {/* Sectie 1: Datum */}
        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={sectionLabel}>Boekdatum</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-h)', fontWeight: 500 }}>{formatDatum(t.datum)}</div>
              {t.originele_datum && (
                <div style={{ fontSize: 11, color: 'var(--text-dim)', textDecoration: 'line-through', marginTop: 2 }}>
                  {formatDatum(t.originele_datum)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {volgendePeriode && (
                <button style={knopStijl} onClick={() => onDatumWijzig(volgendePeriode.start, !!t.originele_datum)}>
                  <ChevronsRight size={13} />
                  Boeken in {volgendePeriode.label}
                </button>
              )}
              {vorigePeriode && (
                <button style={knopStijl} onClick={() => onDatumWijzig(vorigePeriode.eind, !!t.originele_datum)}>
                  <ChevronsLeft size={13} />
                  Boeken in {vorigePeriode.label}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sectie 2: Rekeningen */}
        {t.tegenrekening_iban_bban && (
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={sectionLabel}>Rekeningen</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={kaartStijl}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3 }}>Eigen rekening</div>
                <div style={{ fontSize: 13, color: 'var(--text-h)', fontWeight: 600 }}>{t.rekening_naam ?? '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t.iban_bban ?? ''}</div>
                {eigenRekening?.beheerd === 1 && (
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>Beheerd</div>
                )}
              </div>
              <div style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
                {isOmboeking
                  ? <ArrowLeftRight size={16} />
                  : t.type === 'normaal-bij'
                    ? <ArrowLeft size={16} />
                    : <ArrowRight size={16} />
                }
              </div>
              <div style={kaartStijl}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3 }}>Tegenrekening</div>
                <div style={{ fontSize: 13, color: 'var(--text-h)', fontWeight: 600 }}>{t.naam_tegenpartij ?? '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t.tegenrekening_iban_bban}</div>
                {!isEigenTegenrekening && (
                  <button
                    onClick={() => onVoegRekeningToe(t.tegenrekening_iban_bban!, t.naam_tegenpartij ?? '')}
                    style={{ marginTop: 4, border: '1px solid var(--accent)', background: 'none', color: 'var(--accent)', fontSize: 10, borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}
                  >+ Eigen rekening</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Categorie */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Categorie</label>
          {patronModal.catNieuw ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                autoFocus
                value={patronModal.nieuweCat}
                onChange={e => setPatronModal(m => m ? { ...m, nieuweCat: e.target.value } : m)}
                placeholder="Typ nieuwe categorie…"
                style={{ flex: 1, background: 'var(--bg-base)', border: '1px solid var(--accent)', borderRadius: 4, padding: '4px 8px', fontSize: 12, color: 'var(--text-h)', outline: 'none' }}
              />
              <button
                onClick={() => setPatronModal(m => m ? { ...m, catNieuw: false, nieuweCat: '' } : m)}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', borderRadius: 4, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
              >✕</button>
            </div>
          ) : (
            <select
              value={patronModal.nieuweCat}
              onChange={async (e) => {
                const val = e.target.value;
                if (val === '__nieuw__') {
                  setPatronModal(m => m ? { ...m, catNieuw: true, nieuweCat: '', nieuweCatRekeningId: '', subcategorie: '', subcatOpties: [] } : m);
                  return;
                }
                if (val === '__geen__' || val === '') {
                  setPatronModal(m => m ? { ...m, nieuweCat: val, nieuweCatRekeningId: '', subcategorie: '', subcatOpties: [] } : m);
                  return;
                }
                const subcatRes = await fetch(`/api/subcategorieen?categorie=${encodeURIComponent(val)}`);
                const subcatOpties: string[] = subcatRes.ok ? await subcatRes.json() : [];
                setPatronModal(m => m ? { ...m, nieuweCat: val, subcategorie: '', subcatOpties } : m);
              }}
              style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 12, color: 'var(--text-h)' }}
            >
              <option value="" disabled>— Selecteer categorie —</option>
              <option value="__geen__">— Geen categorie —</option>
              {Array.from(new Set([...budgettenPotjes.map(bp => bp.naam), ...uniekeCategorieenDropdown])).sort().map(naam => <option key={naam} value={naam}>{naam}</option>)}
              <option value="__nieuw__">Nieuwe categorie…</option>
            </select>
          )}
        </div>

        {/* Rekening (alleen bij nieuwe categorie) */}
        {patronModal.catNieuw && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Rekening koppelen (optioneel)</label>
            <select
              value={patronModal.nieuweCatRekeningId}
              onChange={e => setPatronModal(m => m ? { ...m, nieuweCatRekeningId: e.target.value } : m)}
              style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 12, color: 'var(--text-h)' }}
            >
              <option value="">— Geen rekening —</option>
              {rekeningen.map(r => <option key={r.id} value={r.id}>{r.naam} ({r.iban})</option>)}
            </select>
          </div>
        )}

        {/* Subcategorie */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Subcategorie</label>
          {patronModal.subcatNieuw ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                autoFocus
                value={patronModal.subcategorie}
                onChange={e => setPatronModal(m => m ? { ...m, subcategorie: e.target.value } : m)}
                placeholder="Typ subcategorie…"
                style={{ flex: 1, background: 'var(--bg-base)', border: '1px solid var(--accent)', borderRadius: 4, padding: '4px 8px', fontSize: 12, color: 'var(--text-h)', outline: 'none' }}
              />
              <button
                onClick={() => setPatronModal(m => m ? { ...m, subcatNieuw: false, subcategorie: '' } : m)}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', borderRadius: 4, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
              >✕</button>
            </div>
          ) : (
            <select
              value={patronModal.subcategorie}
              onChange={e => {
                if (e.target.value === '__nieuw__') {
                  setPatronModal(m => m ? { ...m, subcatNieuw: true, subcategorie: '' } : m);
                } else {
                  setPatronModal(m => m ? { ...m, subcategorie: e.target.value } : m);
                }
              }}
              style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 12, color: 'var(--text-h)' }}
            >
              <option value="" disabled>— Selecteer subcategorie —</option>
              <option value="__geen__">— Geen subcategorie —</option>
              {patronModal.subcatOpties.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="__nieuw__">Nieuwe subcategorie…</option>
            </select>
          )}
        </div>

        {/* Naam zoekwoord chips */}
        {patronModal.naamChips.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
              Match op naam (optioneel):
              <span style={{ position: 'relative', display: 'inline-flex' }}
                onMouseEnter={() => setTooltipNaam(true)}
                onMouseLeave={() => setTooltipNaam(false)}>
                <span style={{ cursor: 'default', opacity: 0.6, fontSize: 11 }}>ⓘ</span>
                {tooltipNaam && (
                  <span style={{
                    position: 'absolute', bottom: '100%', left: 0, right: 'auto',
                    background: '#1e1e2e', color: '#e0e0e0', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '8px 10px', fontSize: 12, lineHeight: 1.4, minWidth: 320, maxWidth: 400,
                    whiteSpace: 'normal', zIndex: 1000, marginBottom: 4, pointerEvents: 'none', overflow: 'visible',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  }}>
                    Selecteer één of meer woorden om de matching te verfijnen. Bijv. &lsquo;Lidl&rsquo; matcht alle Lidl-filialen in plaats van alleen &lsquo;Lidl 765 Landgraaf&rsquo;. Zonder selectie wordt de volledige naam tegenpartij gebruikt.
                  </span>
                )}
              </span>
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {patronModal.naamChips.map((chip, index) => {
                const actief = patronModal.gekozenNaamChips.includes(chip.waarde);
                return (
                  <button
                    key={`${chip.waarde}-${index}`}
                    onClick={() => setPatronModal(m => m ? { ...m, gekozenNaamChips: actief ? m.gekozenNaamChips.filter(w => w !== chip.waarde) : [...m.gekozenNaamChips, chip.waarde] } : m)}
                    style={{
                      padding: '3px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
                      border: `1px solid ${actief ? 'var(--accent)' : 'var(--border)'}`,
                      background: actief ? 'var(--accent-dim)' : 'var(--bg-surface)',
                      color: actief ? 'var(--accent)' : 'var(--text)',
                      fontWeight: actief ? 600 : 400,
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Omschrijving zoekwoord chips */}
        <div style={{ marginBottom: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
            Match op omschrijving (optioneel):
            <span style={{ position: 'relative', display: 'inline-flex' }}
              onMouseEnter={() => setTooltipOmschr(true)}
              onMouseLeave={() => setTooltipOmschr(false)}>
              <span style={{ cursor: 'default', opacity: 0.6, fontSize: 11 }}>ⓘ</span>
              {tooltipOmschr && (
                <span style={{
                  position: 'absolute', bottom: '100%', left: 0, right: 'auto',
                  background: '#1e1e2e', color: '#e0e0e0', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 10px', fontSize: 12, lineHeight: 1.4, minWidth: 320, maxWidth: 400,
                  whiteSpace: 'normal', zIndex: 1000, marginBottom: 4, pointerEvents: 'none', overflow: 'visible',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}>
                  Selecteer een woord uit de omschrijving voor extra precisie — handig als dezelfde tegenpartij verschillende soorten transacties heeft. Door zoekwoorden op te geven wordt de matching geoptimaliseerd. Zonder selectie wordt geen omschrijving als criterium gebruikt.
                </span>
              )}
            </span>
            <button
              disabled={tellerLaden}
              onClick={async () => {
                if (woordTellers) { setWoordTellers(null); return; }
                setTellerLaden(true);
                const result = await onAnalyseer();
                setWoordTellers(result);
                setTellerLaden(false);
              }}
              style={{
                marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)',
                background: 'none', border: '1px solid var(--border)', borderRadius: 4,
                padding: '1px 8px', cursor: tellerLaden ? 'not-allowed' : 'pointer',
                opacity: tellerLaden ? 0.5 : 1,
              }}
            >
              {tellerLaden ? 'Laden…' : woordTellers ? 'Verberg' : 'Analyseer'}
            </button>
          </p>
          {patronModal.chips.length > 0 ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {patronModal.chips.map((chip, index) => {
                const actief = patronModal.gekozenWoorden.includes(chip.waarde);
                return (
                  <button
                    key={`${chip.waarde}-${index}`}
                    onClick={() => setPatronModal(m => m ? { ...m, gekozenWoorden: actief ? m.gekozenWoorden.filter(w => w !== chip.waarde) : [...m.gekozenWoorden, chip.waarde] } : m)}
                    style={{
                      padding: '3px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
                      border: `1px solid ${actief ? 'var(--accent)' : 'var(--border)'}`,
                      background: actief ? 'var(--accent-dim)' : 'var(--bg-surface)',
                      color: actief ? 'var(--accent)' : 'var(--text)',
                      fontWeight: actief ? 600 : 400,
                    }}
                  >
                    {chip.label}{woordTellers && woordTellers[chip.waarde] != null ? ` (${woordTellers[chip.waarde]})` : ''}
                  </button>
                );
              })}
            </div>
          ) : (
            <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 12 }}>Geen terugkerende woorden gevonden in de omschrijvingen.</p>
          )}
        </div>

        {/* Toelichting */}
        <div style={{ marginBottom: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Toelichting (optioneel)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={patronModal.toelichting}
              onChange={e => setPatronModal(m => m ? { ...m, toelichting: e.target.value } : m)}
              placeholder="Optionele toelichting..."
              style={{ flex: 1, background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 12, color: 'var(--text-h)' }}
            />
            {patronModal.toelichting && (
              <button
                onClick={() => setPatronModal(m => m ? { ...m, toelichting: '' } : m)}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', borderRadius: 4, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
              >✕</button>
            )}
          </div>
        </div>

        {/* Scope keuze */}
        <div style={{ marginBottom: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Toepassen op</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
              <input type="radio" checked={patronModal.scope === 'alle'}
                onChange={() => setPatronModal(m => m ? { ...m, scope: 'alle' } : m)} />
              Alle transacties van {patronModal.transactie.naam_tegenpartij ?? 'deze tegenpartij'}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
              <input type="radio" checked={patronModal.scope === 'enkel'}
                onChange={() => setPatronModal(m => m ? { ...m, scope: 'enkel' } : m)} />
              Alleen deze transactie
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onSluiten} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>Annuleer</button>
          <button
            onClick={onBevestig}
            disabled={!patronModal.nieuweCat || (patronModal.catNieuw && !patronModal.nieuweCat.trim())}
            style={{ background: 'var(--accent)', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: patronModal.nieuweCat ? 'pointer' : 'not-allowed', fontWeight: 600, opacity: patronModal.nieuweCat ? 1 : 0.5 }}
          >Opslaan</button>
        </div>
      </div>
    </div>
  );
}
