// FILE: schema.ts
// AANGEMAAKT: 25-03-2026 10:00
// VERSIE: 1
// GEWIJZIGD: 26-03-2026 17:00
//
// WIJZIGINGEN (25-03-2026 18:30):
// - Initiële aanmaak: TypeScript types voor imports en transacties
// - TransactieType herzien: normaal-af/bij + omboeking-af/bij (vast/spaar/overig/omboeking vervallen)
// WIJZIGINGEN (26-03-2026 17:00):
// - Velden handmatig_gecategoriseerd en originele_datum toegevoegd aan Transactie interface

export type TransactieType = 'normaal-af' | 'normaal-bij' | 'omboeking-af' | 'omboeking-bij';
export type TransactieStatus = 'nieuw' | 'verwerkt';

export interface Import {
  id: number;
  bestandsnaam: string;
  geimporteerd_op: string;
  aantal_transacties: number;
}

export interface Transactie {
  id: number;
  import_id: number;

  // Rabobank CSV kolommen
  iban_bban: string | null;
  munt: string | null;
  bic: string | null;
  volgnummer: string | null;
  datum: string | null;
  rentedatum: string | null;
  bedrag: number | null;
  saldo_na_trn: number | null;
  tegenrekening_iban_bban: string | null;
  naam_tegenpartij: string | null;
  naam_uiteindelijke_partij: string | null;
  naam_initierende_partij: string | null;
  bic_tegenpartij: string | null;
  code: string | null;
  batch_id: string | null;
  transactiereferentie: string | null;
  machtigingskenmerk: string | null;
  incassant_id: string | null;
  betalingskenmerk: string | null;
  omschrijving_1: string | null;
  omschrijving_2: string | null;
  omschrijving_3: string | null;
  reden_retour: string | null;
  oorspr_bedrag: number | null;
  oorspr_munt: string | null;
  koers: number | null;

  // App-velden
  type: TransactieType;
  status: TransactieStatus;
  categorie_id: number | null;
  handmatig_gecategoriseerd: number;
  originele_datum: string | null;
}
