// FILE: Sidebar.tsx
// AANGEMAAKT: 25-03-2026 14:00
// VERSIE: 1
// GEWIJZIGD: 29-03-2026 14:30
//
// WIJZIGINGEN (25-03-2026 17:30):
// - Initiële aanmaak: sidebar navigatie met logo, nav-items en footer
// - Ontwikkelaar-sectie toegevoegd met /scriptstatus link
// - /categorisatie nav-item toegevoegd tussen Transacties en Importeer CSV
// WIJZIGINGEN (26-03-2026 19:00):
// - Inklapbare sidebar: toggle knop, width 60px/220px, CSS transitie
// - Toggle staat opgeslagen in localStorage ('sidebar-collapsed')
// - Tooltip via title attribuut op iconen bij ingeklapte staat
// - Labels en logotekst verborgen bij ingeklapte staat
// WIJZIGINGEN (27-03-2026 10:30):
// - Automatisch inklappen bij viewport < 1200px via resize listener
// - Handmatige override respecteert gebruikerskeuze tot viewport >200px verschuift
// - manualOverrideRef slaat viewport-breedte op van laatste handmatige toggle
// WIJZIGINGEN (29-03-2026 07:00):
// - Resize listener vervangen door ResizeObserver op document.body
// - Toggle knop vervangen door ronde 28px knop die half buiten de sidebar hangt (right: -14px)
// - ResizeObserver past threshold altijd toe bij resize (manual override niet meer blokkend)
// - Mount-effect zet geen manualOverride meer vanuit stored pref; resize overschrijft altijd
// - tableRequiredWidth alleen gezet bij overflow (fix in TransactiesTabel): circulaire drempel opgelost

'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/lib/sidebar-context';
import { APP_VERSION } from '@/lib/version';

const navItems = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    href: '/vaste-lasten',
    label: 'Vaste Lasten',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    href: '/transacties',
    label: 'Transacties',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
  },
  {
    href: '/categorisatie',
    label: 'Categorisatie',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
        <line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
    ),
  },
  {
    href: '/import',
    label: 'Importeer CSV',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    ),
  },
  {
    href: '/instellingen',
    label: 'Instellingen',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

function FbsLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="fbsGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5c7cfa"/>
          <stop offset="100%" stopColor="#9b6ffa"/>
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="10" fill="url(#fbsGrad)"/>
      <rect x="8" y="22" width="6" height="10" rx="1.5" fill="white" opacity="0.7"/>
      <rect x="17" y="16" width="6" height="16" rx="1.5" fill="white" opacity="0.85"/>
      <rect x="26" y="10" width="6" height="22" rx="1.5" fill="white"/>
      <path d="M8 20 L14 14 L22 18 L32 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.35"/>
    </svg>
  );
}

function SectionLabsLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="slGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c6ffa"/>
          <stop offset="100%" stopColor="#5c7cfa"/>
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="10" fill="url(#slGrad)"/>
      <path d="M8 8 L16 8 L8 16 Z" fill="white" fillOpacity="0.18"/>
      <path d="M10 24.5 C10 22.8 11.3 21.5 13.5 21.5 C15.2 21.5 16.4 22.2 17 23.2 L15.4 24.1 C15.1 23.5 14.4 23.1 13.5 23.1 C12.6 23.1 11.9 23.6 11.9 24.4 C11.9 25.2 12.6 25.6 14 26 C15.8 26.6 17.1 27.3 17.1 29 C17.1 30.8 15.7 32 13.4 32 C11.5 32 10.1 31.2 9.5 29.9 L11.1 29 C11.5 29.8 12.3 30.4 13.5 30.4 C14.6 30.4 15.2 29.9 15.2 29.1 C15.2 28.3 14.5 27.9 13 27.4 C11.3 26.9 10 26.1 10 24.5 Z" fill="white"/>
      <path d="M19 21.7 L20.9 21.7 L20.9 30.3 L25.5 30.3 L25.5 32 L19 32 Z" fill="white"/>
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed, tableRequiredWidth } = useSidebar();
  const manualOverrideRef = useRef<number | null>(null);
  const tableReqWidthRef = useRef(tableRequiredWidth);
  const pathnameRef = useRef(pathname);
  const tableWidthInitializedRef = useRef(false);

  useEffect(() => { tableReqWidthRef.current = tableRequiredWidth; }, [tableRequiredWidth]);
  useEffect(() => {
    pathnameRef.current = pathname;
    if (pathname !== '/transacties') tableWidthInitializedRef.current = false;
  }, [pathname]);

  // Op mount: stored pref gebruiken als initiële staat (geen manual override — resize overschrijft altijd)
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored !== null) {
      setCollapsed(stored === 'true');
    } else {
      setCollapsed(window.innerWidth < 1200);
    }
  }, []);

  // ResizeObserver op document.body: auto-collapse/-expand altijd op basis van schermbreedte
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? window.innerWidth;
      const threshold = tableReqWidthRef.current > 0 && pathnameRef.current === '/transacties'
        ? tableReqWidthRef.current + 220
        : 1200;
      manualOverrideRef.current = null;
      setCollapsed(w < threshold);
    });
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  // Auto-collapse/-expand wanneer tableRequiredWidth verandert (pagina laadt/kolommen wisselen)
  useEffect(() => {
    if (pathname !== '/transacties' || tableRequiredWidth === 0) return;
    if (!tableWidthInitializedRef.current) {
      // Eerste keer: stored-pref override negeren, auto-collapse altijd toepassen
      tableWidthInitializedRef.current = true;
      manualOverrideRef.current = null;
      setCollapsed(window.innerWidth < tableRequiredWidth + 220);
      return;
    }
    if (manualOverrideRef.current !== null) {
      if (Math.abs(window.innerWidth - manualOverrideRef.current) < 200) return;
      manualOverrideRef.current = null;
    }
    setCollapsed(window.innerWidth < tableRequiredWidth + 220);
  }, [tableRequiredWidth, pathname]);

  function toggle() {
    manualOverrideRef.current = window.innerWidth;
    setCollapsed(c => {
      const next = !c;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  }

  const navCls = (href: string) =>
    `nav-item${pathname === href ? ' active' : ''}${collapsed ? ' nav-item-collapsed' : ''}`;

  return (
    <div style={{ position: 'relative', width: collapsed ? 60 : 220, transition: 'width 0.2s ease', flexShrink: 0, height: '100%' }}>
    <nav
      className="sidebar"
      style={{ width: '100%', overflow: 'hidden', height: '100%' }}
    >
      {/* Logo */}
      <div className="sidebar-logo" style={{ justifyContent: collapsed ? 'center' : undefined, padding: collapsed ? '0 12px 24px' : undefined }}>
        <FbsLogo />
        {!collapsed && (
          <div className="sidebar-logo-tekst">
            <span>Financieel Beheer</span>
            <small>Systeem</small>
          </div>
        )}
      </div>

      {/* Navigatie */}
      {navItems.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          title={collapsed ? label : undefined}
          className={navCls(href)}
        >
          {icon}
          {!collapsed && label}
        </Link>
      ))}

      {/* Ontwikkeling sectie */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        {!collapsed && (
          <div style={{ padding: '6px 20px 4px', fontSize: 10, fontWeight: 600, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
            Ontwikkeling
          </div>
        )}
        <Link
          href="/scriptstatus"
          title={collapsed ? 'Scriptstatus' : undefined}
          className={navCls('/scriptstatus')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
          {!collapsed && 'Scriptstatus'}
        </Link>
      </div>

      {/* Footer */}
      <div className="sidebar-footer" style={{ justifyContent: collapsed ? 'center' : undefined }}>
        <SectionLabsLogo />
        {!collapsed && <span>Section Labs</span>}
        {!collapsed && <span style={{ fontSize: 9, color: 'var(--text-dim)', opacity: 0.5, marginLeft: 'auto' }}>v{APP_VERSION}</span>}
      </div>
    </nav>
    {/* Toggle knop — ronde knop half buiten de sidebar */}
    <button
      onClick={toggle}
      title={collapsed ? 'Uitklappen' : 'Inklappen'}
      style={{
        position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%)',
        width: 28, height: 28, padding: 0,
        border: '1px solid var(--border)', borderRadius: '50%',
        background: 'var(--bg-card)',
        color: 'var(--text-dim)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, zIndex: 10,
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
      }}
    >
      {collapsed ? '›' : '‹'}
    </button>
    </div>
  );
}
