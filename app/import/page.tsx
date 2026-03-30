// FILE: page.tsx
// AANGEMAAKT: 25-03-2026 11:00
// VERSIE: 1
// GEWIJZIGD: 25-03-2026 11:00
//
// WIJZIGINGEN (25-03-2026 11:00):
// - Initiële aanmaak: importpagina die ImportForm rendert

import ImportForm from "@/features/import/components/ImportForm";

export default function ImportPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">CSV importeren</h1>
      <ImportForm />
    </div>
  );
}
