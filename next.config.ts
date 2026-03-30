// FILE: next.config.ts
// AANGEMAAKT: 26-03-2026 00:00
// VERSIE: 1
// GEWIJZIGD: 26-03-2026 00:00
//
// WIJZIGINGEN (26-03-2026 00:00):
// - ngrok-skip-browser-warning header toegevoegd aan alle responses

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
