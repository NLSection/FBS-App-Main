import { NextRequest, NextResponse } from 'next/server';
import { getAllPanels, createPanel, updateVolgorde } from '@/lib/trendPanels';

export function GET() {
  try {
    const panels = getAllPanels();
    return NextResponse.json(panels);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Volgorde-update
    if (body.volgorde && Array.isArray(body.volgorde)) {
      updateVolgorde(body.volgorde);
      return NextResponse.json({ ok: true });
    }

    // Nieuw panel
    if (!body.titel || !body.databron) {
      return NextResponse.json({ error: 'Titel en databron zijn verplicht.' }, { status: 400 });
    }

    const panel = createPanel({
      titel: body.titel,
      databron: body.databron,
      grafiek_type: body.grafiek_type ?? 'lijn',
      weergave: body.weergave ?? 'per_maand',
      toon_jaarknoppen: body.toon_jaarknoppen ?? true,
      toon_maandknoppen: body.toon_maandknoppen ?? false,
      toon_alle_jaren: body.toon_alle_jaren ?? true,
      items: body.items ?? [],
    });

    return NextResponse.json(panel, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
