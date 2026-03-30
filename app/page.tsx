// FILE: page.tsx
// AANGEMAAKT: 25-03-2026 14:00
// VERSIE: 1
// GEWIJZIGD: 25-03-2026 18:30
//
// WIJZIGINGEN (25-03-2026 18:30):
// - Initiële aanmaak: dashboard met samenvatting, vaste lasten nog te gaan en laatste transacties
// - formatType gebruikt voor type-badge weergave in laatste transacties tabel

'use client';

import { useEffect, useState } from 'react';
import { formatType } from '@/lib/formatType';

interface Samenvatting {
  inkomsten: number;
  uitgaven: number;
  vrij_te_besteden: number;
}

interface VasteLastNogTeGaan {
  id: number;
  label: string;
  verwachte_dag: number;
  verwacht_bedrag: number | null;
}

interface Transactie {
  id: number;
  datum: string | null;
  naam_tegenpartij: string | null;
  bedrag: number | null;
  type: string;
}

function formatBedrag(bedrag: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag);
}

function formatDatum(datum: string | null) {
  if (!datum) return '—';
  return new Date(datum).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function dagNaam(dag: number): string {
  const now = new Date();
  const datum = new Date(now.getFullYear(), now.getMonth(), dag);
  return datum.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' });
}

export default function DashboardPage() {
  const [samenvatting, setSamenvatting]     = useState<Samenvatting | null>(null);
  const [vasteLasten, setVasteLasten]       = useState<VasteLastNogTeGaan[]>([]);
  const [transacties, setTransacties]       = useState<Transactie[]>([]);
  const [laadtSamenvatting, setLaadtSamenvatting] = useState(true);
  const [laadtVasteLasten, setLaadtVasteLasten]   = useState(true);
  const [laadtTransacties, setLaadtTransacties]   = useState(true);
  const [foutSamenvatting, setFoutSamenvatting]   = useState('');
  const [foutVasteLasten, setFoutVasteLasten]     = useState('');
  const [foutTransacties, setFoutTransacties]     = useState('');

  useEffect(() => {
    fetch('/api/dashboard/samenvatting')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setSamenvatting)
      .catch(() => setFoutSamenvatting('Kon samenvatting niet ophalen.'))
      .finally(() => setLaadtSamenvatting(false));
  }, []);

  useEffect(() => {
    fetch('/api/dashboard/vaste-lasten-nog-te-gaan')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setVasteLasten)
      .catch(() => setFoutVasteLasten('Kon vaste lasten niet ophalen.'))
      .finally(() => setLaadtVasteLasten(false));
  }, []);

  useEffect(() => {
    fetch('/api/transacties')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data) => setTransacties(Array.isArray(data) ? data.slice(0, 10) : []))
      .catch(() => setFoutTransacties('Kon transacties niet ophalen.'))
      .finally(() => setLaadtTransacties(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Financieel overzicht huidige maand</p>
      </div>

      {/* ── Samenvatting ── */}
      <p className="section-title">Deze maand</p>
      {foutSamenvatting && <div className="error-melding">{foutSamenvatting}</div>}
      {laadtSamenvatting ? (
        <div className="loading">Samenvatting wordt geladen…</div>
      ) : samenvatting && (
        <div className="cards-grid">
          <div className="summary-card">
            <div className="card-label">Totale inkomsten</div>
            <div className="card-bedrag positief">{formatBedrag(samenvatting.inkomsten)}</div>
          </div>
          <div className="summary-card">
            <div className="card-label">Totale uitgaven</div>
            <div className="card-bedrag negatief">{formatBedrag(samenvatting.uitgaven)}</div>
          </div>
          <div className="summary-card">
            <div className="card-label">Vrij te besteden</div>
            <div className={`card-bedrag ${samenvatting.vrij_te_besteden >= 0 ? 'positief' : 'negatief'}`}>
              {formatBedrag(samenvatting.vrij_te_besteden)}
            </div>
          </div>
        </div>
      )}

      {/* ── Vaste lasten nog te gaan ── */}
      <p className="section-title">Vaste lasten nog te gaan</p>
      {foutVasteLasten && <div className="error-melding">{foutVasteLasten}</div>}
      {laadtVasteLasten ? (
        <div className="loading">Vaste lasten worden geladen…</div>
      ) : (
        <div className="vaste-lasten-lijst" style={{ marginBottom: 36 }}>
          {vasteLasten.length === 0 && !foutVasteLasten ? (
            <div className="empty">Geen vaste lasten meer te gaan deze maand.</div>
          ) : vasteLasten.map(vl => (
            <div className="vaste-last-rij" key={vl.id}>
              <span className="vaste-last-naam">{vl.label}</span>
              <div className="vaste-last-meta">
                <span className="vaste-last-datum">{dagNaam(vl.verwachte_dag)}</span>
                <span className="vaste-last-bedrag">
                  {vl.verwacht_bedrag !== null ? formatBedrag(-Math.abs(vl.verwacht_bedrag)) : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Laatste transacties ── */}
      <p className="section-title">Laatste transacties</p>
      {foutTransacties && <div className="error-melding">{foutTransacties}</div>}
      {laadtTransacties ? (
        <div className="loading">Transacties worden geladen…</div>
      ) : (
        <div className="table-wrapper">
          {transacties.length === 0 && !foutTransacties ? (
            <div className="empty">Geen transacties gevonden.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Naam tegenpartij</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Bedrag</th>
                </tr>
              </thead>
              <tbody>
                {transacties.map(t => (
                  <tr key={t.id}>
                    <td>{formatDatum(t.datum)}</td>
                    <td>{t.naam_tegenpartij ?? <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
                    <td>
                      <span className="badge">{formatType(t.type)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {t.bedrag !== null ? (
                        <span className={t.bedrag >= 0 ? 'bedrag-positief' : 'bedrag-negatief'}>
                          {formatBedrag(t.bedrag)}
                        </span>
                      ) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
