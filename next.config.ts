// FILE: next.config.ts
// AANGEMAAKT: 26-03-2026 00:00
// VERSIE: 1
// GEWIJZIGD: 04-04-2026 22:30
//
// WIJZIGINGEN (04-04-2026 22:30):
// - output: 'standalone' toegevoegd voor Tauri bundeling

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'ngrok-skip-browser-warning',
            value: 'true',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
