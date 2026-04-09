import { NextRequest, NextResponse } from 'next/server';
import { getPanel, updatePanel, deletePanel, duplicatePanel } from '@/lib/trendPanels';

export function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => {
    try {
      const panel = getPanel(parseInt(id));
      if (!panel) return NextResponse.json({ error: 'Panel niet gevonden.' }, { status: 404 });
      return NextResponse.json(panel);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Databasefout.';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const panel = updatePanel(parseInt(id), body);
    if (!panel) return NextResponse.json({ error: 'Panel niet gevonden.' }, { status: 404 });
    return NextResponse.json(panel);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const ok = deletePanel(parseInt(id));
    if (!ok) return NextResponse.json({ error: 'Panel niet gevonden.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    if (body.actie === 'dupliceer') {
      const panel = duplicatePanel(parseInt(id));
      if (!panel) return NextResponse.json({ error: 'Panel niet gevonden.' }, { status: 404 });
      return NextResponse.json(panel, { status: 201 });
    }
    return NextResponse.json({ error: 'Onbekende actie.' }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Databasefout.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
