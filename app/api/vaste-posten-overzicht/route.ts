import { NextResponse } from 'next/server';
import { getInstellingen } from '@/lib/instellingen';
import { getVastePostenConfig, VastePostDefinitie } from '@/lib/vastePostenConfig';
import { getTransacties, TransactieMetCategorie } from '@/lib/transacties';
import { getPeriodeBereik, getPeriodeVanDatum } from '@/lib/maandperiodes';

export type VastePostStatus = 'ontvangen' | 'te-gaan' | 'afwezig';

export interface VastePostItem {
  sleutel: string;
  label: string;
  naam: string;
  iban: string | null;
  configId: number | null;
  verwachteDag: number | null;
  verwachtBedrag: number | null;
  verwachteDatum: string | null;
  werkelijkeDatum: string | null;
  werkelijkBedrag: number | null;
  historischGemiddelde: number | null;
  afwijkingProcent: number | null;
  status: VastePostStatus;
}

export interface VastePostenOverzicht {
  periodeLabel: string;
  periodeStart: string;
  periodeEind: string;
  vandaag: string;
  afwijkingDrempel: number;
  buffer: number;
  items: VastePostItem[];
  totaalInkomsten: number;
  totaalUitgaven: number;
  nogTeGaan: number;
  vrijTeBesteden: number;
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function vandaagStr(): string {
  const v = new Date();
  return toISO(v.getFullYear(), v.getMonth() + 1, v.getDate());
}

function bepaalVerwachteDatum(dag: number, start: string, eind: string): string | null {
  for (const iso of [eind, start]) {
    const y = parseInt(iso.slice(0, 4));
    const m = parseInt(iso.slice(5, 7));
    const maxDag = new Date(y, m, 0).getDate();
    if (dag <= maxDag) {
      const d = toISO(y, m, dag);
      if (d >= start && d <= eind) return d;
    }
  }
  return null;
}

/** Groepeer transacties op tegenpartij-sleutel: IBAN als aanwezig, anders naam. */
function sleutelVan(t: TransactieMetCategorie): string {
  return t.tegenrekening_iban_bban?.trim().toUpperCase() || t.naam_tegenpartij || '?';
}

function matchConfig(sleutel: string, naam: string | null, config: VastePostDefinitie[]): VastePostDefinitie | null {
  // IBAN-match (primair)
  const ibanMatch = config.find(c => c.iban && c.iban === sleutel);
  if (ibanMatch) return ibanMatch;
  // Naam-match (fallback, alleen als sleutel geen IBAN-formaat heeft)
  if (naam) {
    const naamMatch = config.find(c => naam.toLowerCase().includes(c.naam.toLowerCase()));
    if (naamMatch) return naamMatch;
  }
  return null;
}

const MAANDEN = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

export function GET() {
  try {
    const inst = getInstellingen();
    const { maandStartDag, vastePostenOverzichtMaanden, vastePostenAfwijkingProcent, vastePostenBuffer } = inst;

    const vandaag = vandaagStr();
    const nu = new Date();

    // Huidige periode
    const huidig = getPeriodeVanDatum(nu, maandStartDag);
    const { start: periodeStart, eind: periodeEind } = getPeriodeBereik(huidig.jaar, huidig.maand, maandStartDag);
    const periodeLabel = `${MAANDEN[huidig.maand - 1]} '${String(huidig.jaar).slice(2)}`;

    // Historische periodes
    const histPeriodes: { start: string; eind: string }[] = [];
    let pJaar = huidig.jaar, pMaand = huidig.maand;
    for (let i = 0; i < vastePostenOverzichtMaanden; i++) {
      if (--pMaand < 1) { pMaand = 12; pJaar--; }
      histPeriodes.push(getPeriodeBereik(pJaar, pMaand, maandStartDag));
    }

    const isVastePost = (t: TransactieMetCategorie) =>
      t.categorie === 'Vaste Posten' && t.type !== 'omboeking-af' && t.type !== 'omboeking-bij';

    // Huidige-periode transacties
    const huidigeTrx = getTransacties({ datum_van: periodeStart, datum_tot: periodeEind }).filter(isVastePost);

    // Historische transacties
    const histTrx: TransactieMetCategorie[] = histPeriodes.length > 0
      ? getTransacties({
          datum_van: histPeriodes[histPeriodes.length - 1].start,
          datum_tot: histPeriodes[0].eind,
        }).filter(isVastePost)
      : [];

    const config = getVastePostenConfig();

    // ── Groepeer huidige transacties op sleutel ──────────────────────────────
    const groepMap = new Map<string, { trx: TransactieMetCategorie[] }>();
    for (const t of huidigeTrx) {
      const s = sleutelVan(t);
      if (!groepMap.has(s)) groepMap.set(s, { trx: [] });
      groepMap.get(s)!.trx.push(t);
    }

    // ── Historisch gemiddelde per sleutel ────────────────────────────────────
    const histPerSleutel = new Map<string, number>();
    if (histTrx.length > 0) {
      const perSleutelPeriode = new Map<string, Map<string, number>>();
      for (const t of histTrx) {
        const s = sleutelVan(t);
        const datum = (t.datum_aanpassing ?? t.datum) ?? '';
        let periodeKey: string | null = null;
        for (const hp of histPeriodes) {
          if (datum >= hp.start && datum <= hp.eind) { periodeKey = hp.start; break; }
        }
        if (!periodeKey) continue;
        if (!perSleutelPeriode.has(s)) perSleutelPeriode.set(s, new Map());
        const pm = perSleutelPeriode.get(s)!;
        pm.set(periodeKey, (pm.get(periodeKey) ?? 0) + (t.bedrag ?? 0));
      }
      for (const [s, pm] of perSleutelPeriode) {
        const vals = [...pm.values()];
        histPerSleutel.set(s, vals.reduce((a, b) => a + b, 0) / vals.length);
      }
    }

    // ── Bouw items uit huidige transacties ───────────────────────────────────
    const items: VastePostItem[] = [];
    const gebruikteConfigIds = new Set<number>();

    for (const [sleutel, { trx }] of groepMap) {
      const eersteT = trx[0];
      const naam = eersteT.naam_tegenpartij ?? sleutel;
      const iban = eersteT.tegenrekening_iban_bban?.trim().toUpperCase() ?? null;
      const cfg = matchConfig(sleutel, naam, config);
      if (cfg) gebruikteConfigIds.add(cfg.id);

      const werkelijkBedrag = trx.reduce((s, t) => s + (t.bedrag ?? 0), 0);
      const werkelijkeDatum = [...trx]
        .sort((a, b) => ((a.datum_aanpassing ?? a.datum) ?? '').localeCompare((b.datum_aanpassing ?? b.datum) ?? ''))
        [0].datum_aanpassing ?? eersteT.datum ?? null;

      const verwachteDatum = cfg?.verwachte_dag
        ? bepaalVerwachteDatum(cfg.verwachte_dag, periodeStart, periodeEind)
        : null;

      const historischGemiddelde = histPerSleutel.get(sleutel) ?? null;
      const afwijkingProcent = (historischGemiddelde !== null && historischGemiddelde !== 0)
        ? Math.round(((werkelijkBedrag - historischGemiddelde) / Math.abs(historischGemiddelde)) * 100)
        : null;

      items.push({
        sleutel,
        label: cfg?.label ?? naam,
        naam,
        iban,
        configId: cfg?.id ?? null,
        verwachteDag: cfg?.verwachte_dag ?? null,
        verwachtBedrag: cfg?.verwacht_bedrag ?? null,
        verwachteDatum,
        werkelijkeDatum,
        werkelijkBedrag,
        historischGemiddelde,
        afwijkingProcent,
        status: 'ontvangen',
      });
    }

    // ── Voeg config-entries toe die geen transactie hebben ───────────────────
    for (const cfg of config) {
      if (gebruikteConfigIds.has(cfg.id)) continue;
      const verwachteDatum = cfg.verwachte_dag
        ? bepaalVerwachteDatum(cfg.verwachte_dag, periodeStart, periodeEind)
        : null;
      const status: VastePostStatus = (verwachteDatum && verwachteDatum > vandaag) ? 'te-gaan' : 'afwezig';
      const historischGemiddelde = histPerSleutel.get(cfg.iban) ?? null;

      items.push({
        sleutel: cfg.iban,
        label: cfg.label,
        naam: cfg.naam,
        iban: cfg.iban,
        configId: cfg.id,
        verwachteDag: cfg.verwachte_dag,
        verwachtBedrag: cfg.verwacht_bedrag,
        verwachteDatum,
        werkelijkeDatum: null,
        werkelijkBedrag: null,
        historischGemiddelde,
        afwijkingProcent: null,
        status,
      });
    }

    // ── Sorteer op datum (werkelijk of verwacht), null last ──────────────────
    items.sort((a, b) => {
      const ad = a.werkelijkeDatum ?? a.verwachteDatum ?? '9999';
      const bd = b.werkelijkeDatum ?? b.verwachteDatum ?? '9999';
      return ad.localeCompare(bd);
    });

    // ── Totalen ──────────────────────────────────────────────────────────────
    let totaalInkomsten = 0, totaalUitgaven = 0, nogTeGaan = 0;
    for (const item of items) {
      const bedrag = item.werkelijkBedrag ?? item.verwachtBedrag ?? 0;
      if (bedrag > 0) totaalInkomsten += bedrag;
      else if (bedrag < 0) {
        totaalUitgaven += Math.abs(bedrag);
        if (item.status !== 'ontvangen') nogTeGaan += Math.abs(bedrag);
      }
    }

    return NextResponse.json({
      periodeLabel,
      periodeStart,
      periodeEind,
      vandaag,
      afwijkingDrempel: vastePostenAfwijkingProcent,
      buffer: vastePostenBuffer,
      items,
      totaalInkomsten,
      totaalUitgaven,
      nogTeGaan,
      vrijTeBesteden: totaalInkomsten - totaalUitgaven - vastePostenBuffer,
    } satisfies VastePostenOverzicht);

  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
