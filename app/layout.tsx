// FILE: layout.tsx
// AANGEMAAKT: 25-03-2026 10:00
// VERSIE: 1
// GEWIJZIGD: 02-04-2026 10:00
//
// WIJZIGINGEN (25-03-2026 14:00):
// - Database migrations aangeroepen bij app-start
// - Navigatiebalk vervangen door sidebar + main layout
// - Sidebar component geïmporteerd
// WIJZIGINGEN (02-04-2026 10:00):
// - BackupCheck component toegevoegd voor melding bij nieuwere backup

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import BackupCheck from "@/components/BackupCheck";
import UpdateMelding from "@/components/UpdateMelding";
import UpdatePopup from "@/components/UpdatePopup";
import LoadingScreen from "@/components/LoadingScreen";
import { SidebarProvider } from "@/lib/sidebar-context";
import "./globals.css";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FBS App",
  description: "Financieel beheer en categorisatie",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <LoadingScreen>
          <UpdatePopup />
          <SidebarProvider>
            <div className="app">
              <Sidebar />
              <main className="main">
                <UpdateMelding />
                {children}
              </main>
            </div>
            <BackupCheck />
          </SidebarProvider>
        </LoadingScreen>
      </body>
    </html>
  );
}
