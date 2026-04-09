import getDb from '@/lib/db';

export interface TrendPanel {
  id: number;
  titel: string;
  databron: 'saldo' | 'uitgaven' | 'inkomsten';
  grafiek_type: 'lijn' | 'staaf';
  weergave: 'per_maand' | 'cumulatief';
  toon_jaarknoppen: boolean;
  toon_maandknoppen: boolean;
  toon_alle_jaren: boolean;
  volgorde: number;
  items: TrendPanelItem[];
}

export interface TrendPanelItem {
  id: number;
  panel_id: number;
  item_type: 'rekening' | 'categorie' | 'subcategorie';
  item_id: number;
}

interface PanelRij {
  id: number;
  titel: string;
  databron: string;
  grafiek_type: string;
  weergave: string;
  toon_jaarknoppen: number;
  toon_maandknoppen: number;
  toon_alle_jaren: number;
  volgorde: number;
}

function rijNaarPanel(rij: PanelRij, items: TrendPanelItem[]): TrendPanel {
  return {
    id: rij.id,
    titel: rij.titel,
    databron: rij.databron as TrendPanel['databron'],
    grafiek_type: rij.grafiek_type as TrendPanel['grafiek_type'],
    weergave: rij.weergave as TrendPanel['weergave'],
    toon_jaarknoppen: rij.toon_jaarknoppen === 1,
    toon_maandknoppen: rij.toon_maandknoppen === 1,
    toon_alle_jaren: rij.toon_alle_jaren === 1,
    volgorde: rij.volgorde,
    items,
  };
}

export function getAllPanels(): TrendPanel[] {
  const db = getDb();
  const rijen = db.prepare('SELECT * FROM trend_panels ORDER BY volgorde ASC, id ASC').all() as PanelRij[];
  const alleItems = db.prepare('SELECT * FROM trend_panel_items ORDER BY id ASC').all() as TrendPanelItem[];

  const itemsPerPanel = new Map<number, TrendPanelItem[]>();
  for (const item of alleItems) {
    if (!itemsPerPanel.has(item.panel_id)) itemsPerPanel.set(item.panel_id, []);
    itemsPerPanel.get(item.panel_id)!.push(item);
  }

  return rijen.map(r => rijNaarPanel(r, itemsPerPanel.get(r.id) ?? []));
}

export function getPanel(id: number): TrendPanel | null {
  const db = getDb();
  const rij = db.prepare('SELECT * FROM trend_panels WHERE id = ?').get(id) as PanelRij | undefined;
  if (!rij) return null;
  const items = db.prepare('SELECT * FROM trend_panel_items WHERE panel_id = ? ORDER BY id ASC').all(id) as TrendPanelItem[];
  return rijNaarPanel(rij, items);
}

export function createPanel(data: {
  titel: string;
  databron: string;
  grafiek_type: string;
  weergave: string;
  toon_jaarknoppen: boolean;
  toon_maandknoppen: boolean;
  toon_alle_jaren: boolean;
  items: { item_type: string; item_id: number }[];
}): TrendPanel {
  const db = getDb();
  const maxVolgorde = (db.prepare('SELECT MAX(volgorde) AS m FROM trend_panels').get() as { m: number | null }).m ?? -1;

  const result = db.prepare(`
    INSERT INTO trend_panels (titel, databron, grafiek_type, weergave, toon_jaarknoppen, toon_maandknoppen, toon_alle_jaren, volgorde)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.titel, data.databron, data.grafiek_type, data.weergave,
    data.toon_jaarknoppen ? 1 : 0, data.toon_maandknoppen ? 1 : 0, data.toon_alle_jaren ? 1 : 0,
    maxVolgorde + 1,
  );

  const panelId = Number(result.lastInsertRowid);
  const insertItem = db.prepare('INSERT INTO trend_panel_items (panel_id, item_type, item_id) VALUES (?, ?, ?)');
  for (const item of data.items) {
    insertItem.run(panelId, item.item_type, item.item_id);
  }

  return getPanel(panelId)!;
}

export function updatePanel(id: number, data: {
  titel?: string;
  databron?: string;
  grafiek_type?: string;
  weergave?: string;
  toon_jaarknoppen?: boolean;
  toon_maandknoppen?: boolean;
  toon_alle_jaren?: boolean;
  items?: { item_type: string; item_id: number }[];
}): TrendPanel | null {
  const db = getDb();
  const bestaand = db.prepare('SELECT id FROM trend_panels WHERE id = ?').get(id);
  if (!bestaand) return null;

  const velden: string[] = [];
  const waarden: (string | number)[] = [];

  if (data.titel !== undefined) { velden.push('titel = ?'); waarden.push(data.titel); }
  if (data.databron !== undefined) { velden.push('databron = ?'); waarden.push(data.databron); }
  if (data.grafiek_type !== undefined) { velden.push('grafiek_type = ?'); waarden.push(data.grafiek_type); }
  if (data.weergave !== undefined) { velden.push('weergave = ?'); waarden.push(data.weergave); }
  if (data.toon_jaarknoppen !== undefined) { velden.push('toon_jaarknoppen = ?'); waarden.push(data.toon_jaarknoppen ? 1 : 0); }
  if (data.toon_maandknoppen !== undefined) { velden.push('toon_maandknoppen = ?'); waarden.push(data.toon_maandknoppen ? 1 : 0); }
  if (data.toon_alle_jaren !== undefined) { velden.push('toon_alle_jaren = ?'); waarden.push(data.toon_alle_jaren ? 1 : 0); }

  if (velden.length > 0) {
    waarden.push(id);
    db.prepare(`UPDATE trend_panels SET ${velden.join(', ')} WHERE id = ?`).run(...waarden);
  }

  if (data.items !== undefined) {
    db.prepare('DELETE FROM trend_panel_items WHERE panel_id = ?').run(id);
    const insertItem = db.prepare('INSERT INTO trend_panel_items (panel_id, item_type, item_id) VALUES (?, ?, ?)');
    for (const item of data.items) {
      insertItem.run(id, item.item_type, item.item_id);
    }
  }

  return getPanel(id);
}

export function deletePanel(id: number): boolean {
  const db = getDb();
  db.prepare('DELETE FROM trend_panel_items WHERE panel_id = ?').run(id);
  const result = db.prepare('DELETE FROM trend_panels WHERE id = ?').run(id);
  return result.changes > 0;
}

export function duplicatePanel(id: number): TrendPanel | null {
  const panel = getPanel(id);
  if (!panel) return null;

  return createPanel({
    titel: `${panel.titel} (kopie)`,
    databron: panel.databron,
    grafiek_type: panel.grafiek_type,
    weergave: panel.weergave,
    toon_jaarknoppen: panel.toon_jaarknoppen,
    toon_maandknoppen: panel.toon_maandknoppen,
    toon_alle_jaren: panel.toon_alle_jaren,
    items: panel.items.map(i => ({ item_type: i.item_type, item_id: i.item_id })),
  });
}

export function updateVolgorde(panelIds: number[]): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE trend_panels SET volgorde = ? WHERE id = ?');
  const tx = db.transaction(() => {
    panelIds.forEach((id, idx) => stmt.run(idx, id));
  });
  tx();
}
