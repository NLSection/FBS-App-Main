// FILE: ImportForm.tsx
// AANGEMAAKT: 25-03-2026 10:30
// VERSIE: 1
// GEWIJZIGD: 25-03-2026 18:30
//
// WIJZIGINGEN (25-03-2026 17:30):
// - Initiële aanmaak: formulier voor CSV-import met resultaatweergave
// - overgeslagen-teller toegevoegd aan resultaatweergave
// - gecategoriseerd + ongecategoriseerd toegevoegd aan resultaatweergave
// WIJZIGINGEN (25-03-2026 18:30):
// - ImportResultaat bijgewerkt naar nieuw type systeem

'use client';

import { useRef, useState } from 'react';

interface ImportResultaat {
  importId: number;
  aantalNormaalAf: number;
  aantalNormaalBij: number;
  aantalOmboekingAf: number;
  aantalOmboekingBij: number;
  totaal: number;
  overgeslagen: number;
  gecategoriseerd: number;
  ongecategoriseerd: number;
}

export default function ImportForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [bezig, setBezig] = useState(false);
  const [resultaten, setResultaten] = useState<ImportResultaat[] | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const bestanden = inputRef.current?.files;
    if (!bestanden || bestanden.length === 0) {
      setFout('Selecteer minimaal één CSV-bestand.');
      return;
    }

    setBezig(true);
    setFout(null);
    setResultaten(null);

    const formData = new FormData();
    for (const bestand of bestanden) {
      formData.append('files', bestand);
    }

    try {
      const res = await fetch('/api/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setFout(data.error ?? 'Import mislukt.');
      } else {
        setResultaten(data.resultaten);
      }
    } catch {
      setFout('Verbindingsfout — import niet voltooid.');
    } finally {
      setBezig(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">CSV-bestanden</label>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          multiple
          className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
      </div>

      <button
        type="submit"
        disabled={bezig}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {bezig ? 'Importeren…' : 'Importeer'}
      </button>

      {fout && (
        <p role="alert" className="text-red-600 text-sm">
          {fout}
        </p>
      )}

      {resultaten && (
        <ul className="text-sm space-y-2">
          {resultaten.map((r) => (
            <li key={r.importId} className="border rounded p-3 bg-green-50">
              <p className="font-medium mb-1">
                Import #{r.importId} — {r.totaal - r.overgeslagen} opgeslagen
                {r.overgeslagen > 0 && (
                  <span className="ml-2 text-yellow-700 font-normal">({r.overgeslagen} overgeslagen)</span>
                )}
              </p>
              <ul className="space-y-0.5 text-gray-600">
                <li>Normaal AF: {r.aantalNormaalAf}</li>
                <li>Normaal BIJ: {r.aantalNormaalBij}</li>
                <li>Omboeking AF: {r.aantalOmboekingAf}</li>
                <li>Omboeking BIJ: {r.aantalOmboekingBij}</li>
              </ul>
              <ul className="space-y-0.5 text-gray-500 text-xs mt-1 pt-1 border-t border-gray-200">
                <li>Gecategoriseerd: {r.gecategoriseerd}</li>
                <li>Ongecategoriseerd: {r.ongecategoriseerd}</li>
              </ul>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
