// FILE: UpdatePopup.tsx
// AANGEMAAKT: 04-04-2026 23:30
// VERSIE: 1
// GEWIJZIGD: 05-04-2026 00:15
//
// WIJZIGINGEN (05-04-2026 00:15):
// - Omgebouwd naar /api/updates/check i.p.v. @tauri-apps/api
// WIJZIGINGEN (04-04-2026 23:30):
// - Initieel: Tauri update popup bij opstarten

"use client";
import { useEffect, useState } from "react";

interface UpdateInfo {
  version: string;
  notes: string | null;
}

export default function UpdatePopup() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkWithRetry() {
      for (let i = 0; i < 10; i++) {
        if (cancelled) return;
        try {
          const res = await fetch("/api/updates/check");
          const data = await res.json();
          if (data.updateBeschikbaar) {
            setUpdate({ version: data.nieuwste, notes: data.changelog });
          }
          return;
        } catch {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    checkWithRetry();
    return () => { cancelled = true; };
  }, []);

  if (!update) return null;

  const lines = update.notes?.split("\n").filter(l => l.trim()) ?? [];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
    }}>
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: "12px", padding: "32px", maxWidth: "480px", width: "90%"
      }}>
        <h2 style={{ margin: "0 0 8px", color: "var(--text)", fontSize: "18px" }}>
          Versie {update.version} beschikbaar
        </h2>
        <ul style={{ margin: "16px 0", padding: "0 0 0 20px", color: "var(--text-muted)", fontSize: "14px" }}>
          {lines.map((line, i) => (
            <li key={i} style={{ marginBottom: "6px" }}>
              {line.replace(/^[-*]\s*/, "")}
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
          <button
            onClick={() => setUpdate(null)}
            style={{
              padding: "8px 20px", borderRadius: "6px",
              background: "transparent", border: "1px solid var(--border)",
              color: "var(--text-muted)", cursor: "pointer", fontSize: "14px"
            }}
          >
            Later
          </button>
          <button
            onClick={() => window.open("https://github.com/NLSection/FBS-App-Main/releases/latest")}
            style={{
              padding: "8px 20px", borderRadius: "6px",
              background: "var(--accent)", border: "none",
              color: "white", cursor: "pointer", fontSize: "14px"
            }}
          >
            Naar download
          </button>
        </div>
      </div>
    </div>
  );
}
