// Conflit d'écriture. Un lead déjà converti répond 409 ; `conversion` est
// présent quand l'instantané de la conversion est connu.
export type LeadConversionConflict = {
  accountId: string | null;
  contactId: string | null;
  opportunityId: string | null;
  convertedAt: string;
};

export class ConflictError extends Error {
  readonly conversion?: LeadConversionConflict;

  constructor(message = "This lead is already converted.", conversion?: LeadConversionConflict) {
    super(message);
    this.name = "ConflictError";
    this.conversion = conversion;
  }
}
