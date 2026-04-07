// FILE: page.tsx
// AANGEMAAKT: 25-03-2026 11:30
// VERSIE: 1
// GEWIJZIGD: 29-03-2026 15:00
//
// WIJZIGINGEN (28-03-2026 00:00):
// - VasteLastenConfigBeheer verwijderd uit pagina
// WIJZIGINGEN (29-03-2026 15:00):
// - BackupRestore sectie toegevoegd

import AlgemeneInstellingen from '@/features/instellingen/components/AlgemeneInstellingen';
import DashboardInstellingen from '@/features/instellingen/components/DashboardInstellingen';
import RekeningenBeheer from '@/features/instellingen/components/RekeningenBeheer';
import RekeningGroepenBeheer from '@/features/instellingen/components/RekeningGroepenBeheer';
import BudgettenPotjesBeheer from '@/features/instellingen/components/BudgettenPotjesBeheer';
import VastePostenInstellingen from '@/features/instellingen/components/VastePostenInstellingen';
import BackupRestore from '@/features/instellingen/components/BackupRestore';

export default function InstellingenPage() {
  return (
    <div className="space-y-12 max-w-4xl">
      <h1 className="text-xl font-semibold">Instellingen</h1>
      <AlgemeneInstellingen />
      <DashboardInstellingen />
      <VastePostenInstellingen />
      <RekeningenBeheer />
      <RekeningGroepenBeheer />
      <BudgettenPotjesBeheer />
      <BackupRestore />
    </div>
  );
}
