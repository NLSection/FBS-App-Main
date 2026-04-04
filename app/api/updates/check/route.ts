// FILE: route.ts (updates/check)
// AANGEMAAKT: 05-04-2026 01:15
// VERSIE: 1
// GEWIJZIGD: 05-04-2026 01:15
//
// WIJZIGINGEN (05-04-2026 01:15):
// - Initieel: GitHub release check tegen huidige app versie

import { NextResponse } from 'next/server';

export async function GET() {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const huidig = process.env.NEXT_PUBLIC_APP_VERSION ?? 'onbekend';

  if (!repo) {
    return NextResponse.json({ huidig, nieuwste: huidig, updateBeschikbaar: false });
  }

  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers });

    if (res.status === 404) {
      return NextResponse.json({ huidig, nieuwste: huidig, updateBeschikbaar: false });
    }

    if (!res.ok) {
      return NextResponse.json({ huidig, nieuwste: huidig, updateBeschikbaar: false });
    }

    const data = await res.json();
    const nieuwste = (data.tag_name ?? '').replace(/^v/, '');
    const huidige = huidig.replace(/^v/, '');
    const updateBeschikbaar = nieuwste !== '' && nieuwste !== huidige;

    return NextResponse.json({
      huidig: `v${huidige}`,
      nieuwste: `v${nieuwste}`,
      updateBeschikbaar,
      releaseUrl: data.html_url ?? null,
    });
  } catch {
    return NextResponse.json({ huidig, nieuwste: huidig, updateBeschikbaar: false });
  }
}
