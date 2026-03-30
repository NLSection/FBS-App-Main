// FILE: page.tsx (scriptstatus)
// AANGEMAAKT: 25-03-2026 16:30
// VERSIE: 1
// GEWIJZIGD: 25-03-2026 17:00
//
// WIJZIGINGEN (25-03-2026 17:00):
// - Initiële aanmaak: scriptstatus pagina — vertaalstatus Excel scripts naar web app
// - App-structuursectie toegevoegd bovenaan
// - Scripts C, D, E, T uitgewerkt (vervangt placeholder)

import type { ReactNode } from 'react';

type BadgeVariant = 'vertaald' | 'geparkeerd' | 'niet-nodig' | 'te-doen';

const BADGE: Record<BadgeVariant, { bg: string; color: string; label: string }> = {
  'vertaald':   { bg: 'rgba(64,201,110,0.15)',  color: '#40c96e', label: 'Vertaald'    },
  'geparkeerd': { bg: 'rgba(245,165,36,0.15)',  color: '#f5a524', label: 'Geparkeerd'  },
  'niet-nodig': { bg: 'rgba(90,96,122,0.2)',    color: '#5a607a', label: 'Niet nodig'  },
  'te-doen':    { bg: 'rgba(240,82,82,0.15)',   color: '#f05252', label: 'Te doen'     },
};

function Badge({ v }: { v: BadgeVariant }) {
  const s = BADGE[v];
  return (
    <span className="badge" style={{ background: s.bg, color: s.color, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code style={{
      fontFamily: 'ui-monospace, Consolas, monospace',
      fontSize: 11,
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 3,
      padding: '1px 5px',
      color: 'var(--accent)',
    }}>
      {children}
    </code>
  );
}

interface Functie {
  naam: string;
  status: BadgeVariant;
  notitie: ReactNode;
}

interface Script {
  naam: string;
  label: string;
  functies: Functie[];
}

const APP_PAGINAS: { route: string; label: string; omschrijving: string; scripts: string }[] = [
  { route: '/',                   label: 'Dashboard',           omschrijving: 'Samenvatting huidige maand',           scripts: '—' },
  { route: '/transacties',        label: 'Transacties',         omschrijving: 'tmpOverig + tmpVast gecombineerd',      scripts: '—' },
  { route: '/import',             label: 'Importeer CSV',       omschrijving: 'CSV-import pipeline',                  scripts: 'A' },
  { route: '/categorisatie',      label: 'Categorisatie',       omschrijving: 'Categorie toewijzen aan transacties',   scripts: 'B + C' },
  { route: '/terugboekingen',     label: 'Terugboekingen',      omschrijving: 'bls-tabel verwerking',                 scripts: 'D' },
  { route: '/financieel-overzicht', label: 'Financieel Overzicht', omschrijving: 'Jaaroverzicht per categorie',      scripts: 'E' },
  { route: '/trends',             label: 'Trends',              omschrijving: 'Grafieken over tijd',                  scripts: 'T' },
  { route: '/instellingen',       label: 'Instellingen',        omschrijving: 'cfg-tabellen beheren',                 scripts: '—' },
  { route: '/scriptstatus',       label: 'Scriptstatus',        omschrijving: 'Ontwikkelaarspagina',                  scripts: '—' },
];

const SCRIPTS: Script[] = [
  {
    naam: 'Script A — ImporteerCSV',
    label: 'CSV-import pipeline',
    functies: [
      {
        naam: 'CSV selecteren (meerdere bestanden)',
        status: 'vertaald',
        notitie: <Code>features/import/components/ImportForm.tsx</Code>,
      },
      {
        naam: 'Alle 26 Rabobank kolommen opslaan',
        status: 'vertaald',
        notitie: <><Code>lib/migrations.ts</Code> + <Code>lib/imports.ts</Code></>,
      },
      {
        naam: 'Datum/bedrag normalisatie',
        status: 'vertaald',
        notitie: <Code>features/import/utils/parseCSV.ts</Code>,
      },
      {
        naam: 'Duplicate check via volgnummer',
        status: 'vertaald',
        notitie: <>UNIQUE INDEX op <Code>volgnummer</Code> + <Code>INSERT OR IGNORE</Code> in <Code>lib/imports.ts</Code></>,
      },
      {
        naam: 'Routing vast/spaar/omboeking/overig',
        status: 'vertaald',
        notitie: <Code>features/import/utils/matchTransactie.ts</Code>,
      },
      {
        naam: 'Score-based vaste lasten matching',
        status: 'vertaald',
        notitie: <Code>features/import/utils/matchTransactie.ts</Code>,
      },
      {
        naam: 'Naam verrijking (Naam in FO)',
        status: 'niet-nodig',
        notitie: <>Label direct opgeslagen in database via <Code>vaste_lasten_config.label</Code></>,
      },
      {
        naam: 'Laatste Gebruik bijwerken',
        status: 'geparkeerd',
        notitie: 'Afhankelijk van Script C',
      },
      {
        naam: 'UT-mechanisme',
        status: 'niet-nodig',
        notitie: 'Type handmatig aanpasbaar via transactiepagina',
      },
    ],
  },
  {
    naam: 'Script B — CategoriseerUitgaven',
    label: 'Categorisatie pipeline',
    functies: [
      {
        naam: 'Type bepalen (Normaal/Omboekingen AF/BIJ)',
        status: 'vertaald',
        notitie: <Code>features/import/utils/matchTransactie.ts</Code>,
      },
      {
        naam: 'Categorisatie via dbsCategorie',
        status: 'te-doen',
        notitie: 'Nieuwe categorieën tabel + matchlogica',
      },
      {
        naam: 'Suffix logica Budget/Potje',
        status: 'te-doen',
        notitie: 'Onderdeel van terugboekingen feature',
      },
      {
        naam: 'Omboeking datums aanpassen',
        status: 'niet-nodig',
        notitie: 'Datums blijven zoals geïmporteerd',
      },
      {
        naam: 'Laatste Gebruik bijwerken dbsCategorie',
        status: 'te-doen',
        notitie: 'Na categorisatie bijwerken',
      },
      {
        naam: 'Nieuwe transacties markeren',
        status: 'niet-nodig',
        notitie: <>Vervangen door <Code>status</Code> kolom in transacties tabel</>,
      },
    ],
  },
  {
    naam: 'Script C — VerrijkCategorieHerkenning',
    label: 'Categorie-database onderhoud',
    functies: [
      {
        naam: 'Nieuwe categorieën toevoegen aan dbsCategorie',
        status: 'te-doen',
        notitie: 'Automatisch na categorisatie via status \'ongecategoriseerd\'',
      },
      {
        naam: 'UT-transacties documenteren in dbsUT',
        status: 'niet-nodig',
        notitie: <>Vervangen door <Code>type</Code> kolom in transacties tabel</>,
      },
      {
        naam: 'Suffixen verwijderen uit dbsCategorie',
        status: 'niet-nodig',
        notitie: 'Suffixen bestaan niet in app',
      },
      {
        naam: 'Conflicten detecteren en interactief oplossen',
        status: 'te-doen',
        notitie: 'UI-melding bij conflicterende categoriedefinities',
      },
      {
        naam: 'Verouderde regels opruimen',
        status: 'te-doen',
        notitie: 'Laatste_gebruik + automatische cleanup',
      },
      {
        naam: 'Vaste lasten toevoegen via wizard',
        status: 'vertaald',
        notitie: 'Markeer als vaste last in transactieoverzicht',
      },
    ],
  },
  {
    naam: 'Script D — UitgavenVerwerken',
    label: 'Periode-aggregatie + terugboekingen',
    functies: [
      {
        naam: 'Maandgrenzen bepalen (27e t/m 26e cyclus)',
        status: 'te-doen',
        notitie: 'Configureerbaar via instellingen',
      },
      {
        naam: 'mnd-tabel vullen per maand',
        status: 'te-doen',
        notitie: 'SQL query op transacties gefilterd op periode',
      },
      {
        naam: 'cat-tabel vullen (categorie samenvatting)',
        status: 'te-doen',
        notitie: 'Aggregatie query voor categorieoverzicht pagina',
      },
      {
        naam: 'vst-tabel vullen (vaste lasten)',
        status: 'te-doen',
        notitie: <>SQL query op <Code>type = 'vast'</Code> per periode</>,
      },
      {
        naam: 'bls-tabel vullen (terugboekingen)',
        status: 'te-doen',
        notitie: 'Terugboekingenpagina met twee queries',
      },
      {
        naam: 'spr-tabel vullen (spaarrekening)',
        status: 'te-doen',
        notitie: <>SQL query op <Code>type = 'spaar'</Code> per periode</>,
      },
      {
        naam: 'Kwartaalwerkbladen Q1–Q4',
        status: 'niet-nodig',
        notitie: 'Alles via SQL queries op één transacties tabel',
      },
    ],
  },
  {
    naam: 'Script E — MaakFinancieelOverzicht',
    label: 'Financieel Overzicht pagina',
    functies: [
      {
        naam: 'smvCategorie (categorieoverzicht totaal + gemiddeld)',
        status: 'te-doen',
        notitie: 'Financieel Overzicht pagina',
      },
      {
        naam: 'jozSalaris (salarisoverzicht per persoon per maand)',
        status: 'te-doen',
        notitie: 'Onderdeel Financieel Overzicht',
      },
      {
        naam: 'Vaste lasten tabellen per groep',
        status: 'te-doen',
        notitie: 'Onderdeel Financieel Overzicht',
      },
      {
        naam: 'Afwijkingsindicator (stijging/daling)',
        status: 'te-doen',
        notitie: 'Kleurcodering in Financieel Overzicht',
      },
      {
        naam: 'jozSpaarrekening (saldo per maand)',
        status: 'te-doen',
        notitie: 'Onderdeel Financieel Overzicht',
      },
      {
        naam: 'Afgesloten maanden bepalen',
        status: 'te-doen',
        notitie: 'Configureerbaar maandgrens + SQL filter',
      },
    ],
  },
  {
    naam: 'Script T — TrendsGrafieken',
    label: 'Trends pagina met grafieken',
    functies: [
      {
        naam: 'dbsHistorie vullen per categorie per maand',
        status: 'te-doen',
        notitie: 'Aparte historie tabel in SQLite',
      },
      {
        naam: 'Staafgrafiek uitgaven per categorie',
        status: 'te-doen',
        notitie: 'Trends pagina met Recharts',
      },
      {
        naam: 'Lijngrafiek trends over tijd',
        status: 'te-doen',
        notitie: 'Trends pagina met Recharts',
      },
      {
        naam: 'Spaarrekening grafiek',
        status: 'te-doen',
        notitie: 'Trends pagina met Recharts',
      },
      {
        naam: 'Jaarfilter',
        status: 'te-doen',
        notitie: 'Dropdown filter op Trends pagina',
      },
    ],
  },
];

export default function ScriptstatusPage() {
  return (
    <div className="main">
      <div className="page-header">
        <h1>Scriptstatus</h1>
        <p>Vertaalstatus van de Excel VBA-scripts naar de FBS web app</p>
      </div>

      {/* App structuur */}
      <p className="section-title">Geplande app-structuur</p>
      <div className="table-wrapper" style={{ marginBottom: 36 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '22%' }}>Pagina</th>
              <th style={{ width: '38%' }}>Omschrijving</th>
              <th style={{ width: '20%' }}>Route</th>
              <th style={{ width: '20%' }}>Scripts</th>
            </tr>
          </thead>
          <tbody>
            {APP_PAGINAS.map((p) => (
              <tr key={p.route}>
                <td style={{ color: 'var(--text-h)', fontWeight: 500 }}>{p.label}</td>
                <td>{p.omschrijving}</td>
                <td><Code>{p.route}</Code></td>
                <td style={{ color: 'var(--text-dim)' }}>{p.scripts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
        {(Object.keys(BADGE) as BadgeVariant[]).map((v) => (
          <span key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim)' }}>
            <Badge v={v} /> {v === 'vertaald' ? 'Volledig geïmplementeerd' : v === 'geparkeerd' ? 'Bewust uitgesteld' : v === 'niet-nodig' ? 'Overbodig in nieuwe architectuur' : 'Nog niet geïmplementeerd'}
          </span>
        ))}
      </div>

      {/* Script blokken */}
      {SCRIPTS.map((script) => (
        <div key={script.naam} className="table-wrapper" style={{ marginBottom: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 20px',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h)', letterSpacing: '-0.2px' }}>
              {script.naam}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {script.label}
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th style={{ width: '34%' }}>Functie</th>
                <th style={{ width: '14%' }}>Status</th>
                <th style={{ width: '52%' }}>Notitie</th>
              </tr>
            </thead>
            <tbody>
              {script.functies.map((f, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-h)', fontWeight: 500, verticalAlign: 'top' }}>
                    {f.naam}
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <Badge v={f.status} />
                  </td>
                  <td style={{ color: 'var(--text-dim)', fontSize: 12, verticalAlign: 'top' }}>
                    {f.notitie}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
