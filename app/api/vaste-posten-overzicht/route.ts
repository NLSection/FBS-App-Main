import { NextRequest, NextResponse } from 'next/server';
import { getInstellingen } from '@/lib/instellingen';
import { getCategorieRegels, matchCategorie } from '@/lib/categorisatie';
import { getTransacties } from '@/lib/transacties';
import { getPeriodeBereik, getPeriodeVanDatum } from '@/lib/maandperiodes';
import { getVpGroepen } from '@/lib/vpGroepen';
import { getVpVolgorde } from '@/lib/vpVolgorde';
import { getVpNegeer } from '@/lib/vpNegeer';

export type VastePostStatus = 'geweest' | 'verwacht' | 'ontbreekt';

export interface VastePostTransactie {
  id: number;
  datum: string;
  naam_tegenpartij: string | null;
  omschrijving_1: string | null;
  omschrijving_2: string | null;
  omschrijving_3: string | null;
  bedrag: number;
  categorie: string | null;
  subcategorie: string | null;
  categorie_id: number | null;
  toelichting: string | null;
  type: string | null;
  tegenrekening_iban_bban: string | null;
  iban_bban: string | null;
  rekening_naam: string | null;
}

export interface VastePostItem {
  regelId: number;
  subcategorie: string;
  naam: string;
  status: VastePostStatus;
  datum: string | null;
  bedrag: number | null;
  gemiddeldBedrag: number | null;
  afwijkingBedrag: number | null;
  ontbrakVorigeMaand: boolean;
  transacties: VastePostTransactie[];
}

export interface VastePostGroep {
  subcategorie: string;  // weergavenaam (groepnaam of subcategorie)
  groepId: number | null;
  subcategorieen: string[];  // alle subcategorieen in deze weergavegroep
  items: VastePostItem[];
}

export interface NegeerItem {
  regelId: number;
  naam: string;
  subcategorie: string;
  periode: string; // 'permanent' | 'YYYY-MM'
}

export interface VastePostenOverzicht {
  periodeLabel: string;
  periodeStart: string;
  periodeEind: string;
  vandaag: string;
  afwijkingDrempel: number;
  groepen: VastePostGroep[];
  negeerde: NegeerItem[];
  totaalInkomsten: number;
  totaalUitgaven: number;
  nogTeGaan: number;
}

const MAANDEN = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function vandaagStr(): string {
  const v = new Date();
  return toISO(v.getFullYear(), v.getMonth() + 1, v.getDate());
}

function vorigePeriode(jaar: number, maand: number, maandStartDag: number) {
  let vJaar = jaar, vMaand = maand - 1;
  if (vMaand < 1) { vMaand = 12; vJaar--; }
  return getPeriodeBereik(vJaar, vMaand, maandStartDag);
}

export function GET(req: NextRequest) {
  try {
    const inst = getInstellingen();
    const { maandStartDag, vastePostenOverzichtMaanden, vastePostenVergelijkMaanden, vastePostenAfwijkingProcent } = inst;

    const sp = req.nextUrl.searchParams;
    const paramJaar  = sp.get('jaar')  ? parseInt(sp.get('jaar')!)  : null;
    const paramMaand = sp.get('maand') ? parseInt(sp.get('maand')!) : null;

    const nu = new Date();
    const huidig = getPeriodeVanDatum(nu, maandStartDag);
    const gesJaar  = paramJaar  ?? huidig.jaar;
    const gesMaand = paramMaand ?? huidig.maand;

    const { start: periodeStart, eind: periodeEind } = getPeriodeBereik(gesJaar, gesMaand, maandStartDag);
    const periodeLabel = `${MAANDEN[gesMaand - 1]} '${String(gesJaar).slice(2)}`;
    const vandaag = vandaagStr();

    // Vorige periode
    const vorigePer = vorigePeriode(gesJaar, gesMaand, maandStartDag);

    // Lookback: genoeg voor zowel X (verwachte datum) als Y (bedraggemiddelde)
    const aantalTerug = Math.max(vastePostenOverzichtMaanden, vastePostenVergelijkMaanden);
    let lookJaar = gesJaar, lookMaand = gesMaand;
    for (let i = 0; i < aantalTerug; i++) {
      if (--lookMaand < 1) { lookMaand = 12; lookJaar--; }
    }
    const { start: lookbackStart } = getPeriodeBereik(lookJaar, lookMaand, maandStartDag);

    // X periodes (voor verwachte datum)
    const xPeriodes: { start: string; eind: string }[] = [];
    let pJ = gesJaar, pM = gesMaand;
    for (let i = 0; i < vastePostenOverzichtMaanden; i++) {
      if (--pM < 1) { pM = 12; pJ--; }
      xPeriodes.push(getPeriodeBereik(pJ, pM, maandStartDag));
    }

    // Y periodes (voor bedraggemiddelde)
    const yPeriodes: { start: string; eind: string }[] = [];
    let yJ = gesJaar, yM = gesMaand;
    for (let i = 0; i < vastePostenVergelijkMaanden; i++) {
      if (--yM < 1) { yM = 12; yJ--; }
      yPeriodes.push(getPeriodeBereik(yJ, yM, maandStartDag));
    }

    // Alle VP regels
    const alleRegels = getCategorieRegels().filter(r => r.categorie === 'Vaste Posten');

    // Alle relevante transacties ophalen — direct gefilterd op Vaste Posten in SQL
    const alleTrx = getTransacties({ datum_van: lookbackStart, datum_tot: periodeEind, categorie: 'Vaste Posten' });

    // Map elke transactie naar een regelId
    interface TrxMapped { regelId: number; datum: string; bedrag: number; t: ReturnType<typeof getTransacties>[0] }
    const trxGemapped: TrxMapped[] = [];
    for (const t of alleTrx) {
      const r = matchCategorie(t, alleRegels);
      if (!r) continue;
      const datum = (t.datum_aanpassing ?? t.datum) ?? '';
      if (!datum) continue;
      trxGemapped.push({ regelId: r.id, datum, bedrag: t.bedrag ?? 0, t });
    }

    // Groepeer op regelId
    const perRegel = new Map<number, TrxMapped[]>();
    for (const tm of trxGemapped) {
      if (!perRegel.has(tm.regelId)) perRegel.set(tm.regelId, []);
      perRegel.get(tm.regelId)!.push(tm);
    }

    function inPeriode(datum: string, p: { start: string; eind: string }) {
      return datum >= p.start && datum <= p.eind;
    }

    // Negeer- en volgorde-data ophalen
    const periodeSleutel = `${gesJaar}-${String(gesMaand).padStart(2, '0')}`;
    const negeerRegels = getVpNegeer();
    const negeerMap = new Map<number, string>(); // regelId → periode (meest specifiek)
    for (const n of negeerRegels) {
      if (n.periode === 'permanent') {
        negeerMap.set(n.regel_id, 'permanent');
      } else if (n.periode.startsWith('vanaf:')) {
        const vanaf = n.periode.slice(6); // 'YYYY-MM'
        if (periodeSleutel >= vanaf && !negeerMap.has(n.regel_id)) negeerMap.set(n.regel_id, n.periode);
      } else if (n.periode === periodeSleutel && !negeerMap.has(n.regel_id)) {
        negeerMap.set(n.regel_id, periodeSleutel);
      }
    }

    const items: VastePostItem[] = [];
    const negeerde: NegeerItem[] = [];

    for (const regel of alleRegels) {
      const trx = perRegel.get(regel.id) ?? [];

      // Geselecteerde periode
      const gesTrx = trx.filter(t => inPeriode(t.datum, { start: periodeStart, eind: periodeEind }));

      // Vorige periode
      const vorigeTrx = trx.filter(t => inPeriode(t.datum, vorigePer));
      const ontbrakVorigeMaand = vorigeTrx.length === 0;

      // Werkelijk bedrag + datum voor geselecteerde periode
      const werkelijkBedrag = gesTrx.length > 0
        ? gesTrx.reduce((s, t) => s + t.bedrag, 0)
        : null;
      const werkelijkeDatum = gesTrx.length > 0
        ? [...gesTrx].sort((a, b) => a.datum.localeCompare(b.datum))[0].datum
        : null;

      // Verwachte datum: gemiddelde dag-van-maand uit X periodes waar transactie voorkwam
      const xDagen: number[] = [];
      for (const xp of xPeriodes) {
        const xt = trx.filter(t => inPeriode(t.datum, xp));
        if (xt.length > 0) {
          const vroegste = [...xt].sort((a, b) => a.datum.localeCompare(b.datum))[0];
          xDagen.push(parseInt(vroegste.datum.slice(8, 10), 10));
        }
      }
      let verwachteDatum: string | null = null;
      if (xDagen.length > 0) {
        const gemDag = Math.round(xDagen.reduce((s, d) => s + d, 0) / xDagen.length);
        const maxDag = new Date(gesJaar, gesMaand, 0).getDate();
        const dag = Math.min(gemDag, maxDag);
        verwachteDatum = toISO(gesJaar, gesMaand, dag);
      }

      // Gemiddeld bedrag uit Y periodes
      const yBedragen: number[] = [];
      for (const yp of yPeriodes) {
        const yt = trx.filter(t => inPeriode(t.datum, yp));
        if (yt.length > 0) {
          yBedragen.push(yt.reduce((s, t) => s + t.bedrag, 0));
        }
      }
      const gemiddeldBedrag = yBedragen.length > 0
        ? yBedragen.reduce((s, b) => s + b, 0) / yBedragen.length
        : null;

      // Afwijking
      const afwijkingProcent = (werkelijkBedrag !== null && gemiddeldBedrag !== null && gemiddeldBedrag !== 0)
        ? Math.round(((werkelijkBedrag - gemiddeldBedrag) / Math.abs(gemiddeldBedrag)) * 100)
        : null;
      const afwijkingBedrag = (werkelijkBedrag !== null && gemiddeldBedrag !== null)
        ? werkelijkBedrag - gemiddeldBedrag
        : null;

      // Status
      let status: VastePostStatus;
      if (werkelijkBedrag !== null) {
        status = 'geweest';
      } else if (periodeEind < vandaag) {
        status = 'ontbreekt';
      } else {
        status = 'verwacht';
      }

      const naam = regel.naam_origineel ?? regel.naam_zoekwoord ?? '?';

      // Y-maanden transacties voor subtabel
      const yStart = yPeriodes.length > 0 ? yPeriodes[yPeriodes.length - 1].start : periodeStart;
      const yEind  = yPeriodes.length > 0 ? yPeriodes[0].eind : periodeStart;
      const subtabelTrx: VastePostTransactie[] = trx
        .filter(tm => tm.datum >= yStart && tm.datum <= yEind)
        .sort((a, b) => b.datum.localeCompare(a.datum))
        .map(tm => ({
          id: tm.t.id,
          datum: tm.datum,
          naam_tegenpartij: tm.t.naam_tegenpartij ?? null,
          omschrijving_1: tm.t.omschrijving_1 ?? null,
          omschrijving_2: tm.t.omschrijving_2 ?? null,
          omschrijving_3: tm.t.omschrijving_3 ?? null,
          bedrag: tm.bedrag,
          categorie: tm.t.categorie ?? null,
          subcategorie: tm.t.subcategorie ?? null,
          categorie_id: tm.t.categorie_id ?? null,
          toelichting: tm.t.toelichting ?? null,
          type: tm.t.type ?? null,
          tegenrekening_iban_bban: tm.t.tegenrekening_iban_bban ?? null,
          iban_bban: tm.t.iban_bban ?? null,
          rekening_naam: tm.t.rekening_naam ?? null,
        }));

      const negeerPeriode = negeerMap.get(regel.id);
      if (negeerPeriode) {
        negeerde.push({ regelId: regel.id, naam, subcategorie: regel.subcategorie ?? '—', periode: negeerPeriode });
      } else {
        items.push({
          regelId: regel.id,
          subcategorie: regel.subcategorie ?? '—',
          naam,
          status,
          datum: werkelijkeDatum ?? verwachteDatum,
          bedrag: werkelijkBedrag ?? (yBedragen.length > 0 ? yBedragen[yBedragen.length - 1] : null),
          gemiddeldBedrag,
          afwijkingBedrag: Math.abs(afwijkingProcent ?? 0) > vastePostenAfwijkingProcent ? afwijkingBedrag : null,
          ontbrakVorigeMaand,
          transacties: subtabelTrx,
        });
      }
    }

    // Sorteer items: 1) datum oplopend, 2) subcategorie, 3) naam
    items.sort((a, b) => {
      const ad = a.datum ?? '9999';
      const bd = b.datum ?? '9999';
      if (ad !== bd) return ad.localeCompare(bd);
      if (a.subcategorie !== b.subcategorie) return a.subcategorie.localeCompare(b.subcategorie);
      return a.naam.localeCompare(b.naam);
    });

    // Groepeer op subcategorie, rekening houdend met vp_groepen
    const vpGroepen = getVpGroepen();
    // subcategorie → { groepId, groepNaam }
    const subcatNaarGroep = new Map<string, { groepId: number; groepNaam: string }>();
    for (const g of vpGroepen) {
      for (const s of g.subcategorieen) subcatNaarGroep.set(s, { groepId: g.id, groepNaam: g.naam });
    }

    // Sleutel: groepNaam als in groep, anders subcategorie zelf
    const groepenMap = new Map<string, { groepId: number | null; subcategorieen: Set<string>; items: VastePostItem[] }>();
    for (const item of items) {
      const groepInfo = subcatNaarGroep.get(item.subcategorie);
      const sleutel = groepInfo ? groepInfo.groepNaam : item.subcategorie;
      if (!groepenMap.has(sleutel)) groepenMap.set(sleutel, { groepId: groepInfo?.groepId ?? null, subcategorieen: new Set(), items: [] });
      const entry = groepenMap.get(sleutel)!;
      entry.subcategorieen.add(item.subcategorie);
      entry.items.push(item);
    }
    const volgorde = getVpVolgorde(periodeSleutel);
    const groepen: VastePostGroep[] = [...groepenMap.entries()]
      .map(([subcategorie, { groepId, subcategorieen, items }]) => ({ subcategorie, groepId, subcategorieen: [...subcategorieen], items }))
      .sort((a, b) => {
        const va = volgorde.get(a.subcategorie) ?? Infinity;
        const vb = volgorde.get(b.subcategorie) ?? Infinity;
        if (va !== vb) return va - vb;
        return a.subcategorie.localeCompare(b.subcategorie);
      });

    // Totalen
    let totaalInkomsten = 0, totaalUitgaven = 0, nogTeGaan = 0;
    for (const item of items) {
      const b = item.bedrag ?? 0;
      if (b > 0) totaalInkomsten += b;
      else if (b < 0) {
        totaalUitgaven += Math.abs(b);
        if (item.status !== 'geweest') nogTeGaan += Math.abs(b);
      }
    }

    return NextResponse.json({
      periodeLabel,
      periodeStart,
      periodeEind,
      vandaag,
      afwijkingDrempel: vastePostenAfwijkingProcent,
      groepen,
      negeerde,
      totaalInkomsten,
      totaalUitgaven,
      nogTeGaan,
    } satisfies VastePostenOverzicht);

  } catch (err) {
    const bericht = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: bericht }, { status: 500 });
  }
}
