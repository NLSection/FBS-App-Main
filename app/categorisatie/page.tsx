// FILE: page.tsx (categorisatie)
// AANGEMAAKT: 25-03-2026 17:30
// VERSIE: 1
// GEWIJZIGD: 28-03-2026 14:00
//
// WIJZIGINGEN (28-03-2026 14:00):
// - Tabvolgorde omgedraaid: Regels beheren is nu primaire tab (standaard actief)

'use client';

import { useState } from 'react';
import OngecategoriseerdeTabel from '@/features/categorisatie/components/OngecategoriseerdeTabel';
import CategorieenBeheer from '@/features/categorisatie/components/CategorieenBeheer';

type Tab = 'ongecategoriseerd' | 'regels';

export default function CategorisatiePage() {
  const [tab, setTab] = useState<Tab>('regels');

  return (
    <div className="main">
      <div className="page-header">
        <h1>Categorisatie</h1>
        <p>Transacties categoriseren en matchregels beheren</p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 24,
        borderBottom: '1px solid var(--border)',
      }}>
        {([
          ['regels',            'Regels beheren'],
          ['ongecategoriseerd', 'Ongecategoriseerd'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              background: 'none', border: 'none',
              borderBottom: tab === id ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === id ? 'var(--accent)' : 'var(--text-dim)',
              fontWeight: tab === id ? 600 : 400,
              fontSize: 14, padding: '10px 20px', cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'ongecategoriseerd' && <OngecategoriseerdeTabel />}
      {tab === 'regels'            && <CategorieenBeheer />}
    </div>
  );
}
