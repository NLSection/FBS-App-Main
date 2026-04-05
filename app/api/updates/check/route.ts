// FILE: route.ts (updates/check)
// AANGEMAAKT: 05-04-2026 01:15
// VERSIE: 1
// GEWIJZIGD: 04-04-2026 22:00
//
// WIJZIGINGEN (04-04-2026 22:00):
// - changelog veld doorgeven vanuit Worker response
// WIJZIGINGEN (04-04-2026 21:30):
// - Omgebouwd naar Cloudflare Worker endpoint i.p.v. directe GitHub API

import { NextResponse } from 'next/server';

const WORKER_URL = 'https://fbs-update-worker.section-labs.workers.dev/latest';

export async function GET() {
  const huidig = process.env.NEXT_PUBLIC_APP_VERSION ?? 'onbekend';

  try {
    const res = await fetch(WORKER_URL);

    if (!res.ok) {
      return NextResponse.json({ huidig, nieuwste: huidig, updateBeschikbaar: false });
    }

    const data: { versie: string | null; url: string | null; changelog: string | null } = await res.json();

    if (!data.versie) {
      return NextResponse.json({ huidig, nieuwste: huidig, updateBeschikbaar: false });
    }

    const nieuwste = data.versie.replace(/^v/, '');
    const huidige = huidig.replace(/^v/, '');
    const updateBeschikbaar = nieuwste !== '' && nieuwste !== huidige;

    return NextResponse.json({
      huidig: `v${huidige}`,
      nieuwste: `v${nieuwste}`,
      updateBeschikbaar,
      releaseUrl: data.url ?? null,
      changelog: data.changelog ?? null,
    });
  } catch {
    return NextResponse.json({ huidig, nieuwste: huidig, updateBeschikbaar: false });
  }
}
