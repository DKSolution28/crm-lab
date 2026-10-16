// Picklists observées dans Setup › Object Manager › Account (spec-accounts.md §1).
// Les valeurs API Prisma (sans espace) sont associées à leur libellé observé.

export type PicklistOption<T extends string = string> = {
  value: T;
  label: string;
  active: boolean;
};

const option = <T extends string>(value: T, label: string, active = true): PicklistOption<T> => ({
  value,
  label,
  active,
});

export const ACCOUNT_TYPE_OPTIONS = [
  option("Analyst", "Analyst"),
  option("Competitor", "Competitor"),
  option("Customer", "Customer"),
  option("Integrator", "Integrator"),
  option("Investor", "Investor"),
  option("Partner", "Partner"),
  option("Press", "Press"),
  option("Prospect", "Prospect"),
  option("Reseller", "Reseller"),
  option("Other", "Other"),
] as const;

export const INDUSTRY_OPTIONS = [
  option("Agriculture", "Agriculture"),
  option("Apparel", "Apparel"),
  option("Banking", "Banking"),
  option("Biotechnology", "Biotechnology"),
  option("Chemicals", "Chemicals"),
  option("Communications", "Communications"),
  option("Construction", "Construction"),
  option("Consulting", "Consulting"),
  option("Education", "Education"),
  option("Electronics", "Electronics"),
  option("Energy", "Energy"),
  option("Engineering", "Engineering"),
  option("Entertainment", "Entertainment"),
  option("Environmental", "Environmental"),
  option("Finance", "Finance"),
  option("FoodBeverage", "Food & Beverage"),
  option("Government", "Government"),
  option("Healthcare", "Healthcare"),
  option("Hospitality", "Hospitality"),
  option("Insurance", "Insurance"),
  option("Machinery", "Machinery"),
  option("Manufacturing", "Manufacturing"),
  option("Media", "Media"),
  option("NotForProfit", "Not For Profit"),
  option("Other", "Other"),
  option("Recreation", "Recreation"),
  option("Retail", "Retail"),
  option("Shipping", "Shipping"),
  option("Technology", "Technology"),
  option("Telecommunications", "Telecommunications"),
  option("Transportation", "Transportation"),
  option("Utilities", "Utilities"),
  option("AerospaceDefense", "Aerospace & Defense", false),
  option("BusinessServices", "Business Services", false),
  option("Advertising", "Advertising", false),
] as const;

export const ACCOUNT_SOURCE_OPTIONS = [
  option("Advertisement", "Advertisement"),
  option("EmployeeReferral", "Employee Referral"),
  option("ExternalReferral", "External Referral"),
  option("Partner", "Partner"),
  option("PublicRelations", "Public Relations"),
  option("SeminarInternal", "Seminar - Internal"),
  option("SeminarPartner", "Seminar - Partner"),
  option("TradeShow", "Trade Show"),
  option("Web", "Web"),
  option("WordOfMouth", "Word of mouth"),
  option("Other", "Other"),
] as const;

export const RATING_OPTIONS = [option("Hot", "Hot"), option("Warm", "Warm"), option("Cold", "Cold")] as const;

export const OWNERSHIP_OPTIONS = [
  option("Public", "Public"),
  option("Private", "Private"),
  option("Subsidiary", "Subsidiary"),
  option("Other", "Other"),
] as const;

export type AccountTypeValue = (typeof ACCOUNT_TYPE_OPTIONS)[number]["value"];
export type IndustryValue = (typeof INDUSTRY_OPTIONS)[number]["value"];
export type AccountSourceValue = (typeof ACCOUNT_SOURCE_OPTIONS)[number]["value"];
export type RatingValue = (typeof RATING_OPTIONS)[number]["value"];
export type OwnershipValue = (typeof OWNERSHIP_OPTIONS)[number]["value"];

export const PICKLISTS = {
  type: ACCOUNT_TYPE_OPTIONS,
  industry: INDUSTRY_OPTIONS,
  accountSource: ACCOUNT_SOURCE_OPTIONS,
  rating: RATING_OPTIONS,
  ownership: OWNERSHIP_OPTIONS,
} as const;

export type PicklistName = keyof typeof PICKLISTS;

export const picklistLabel = (name: PicklistName, value: string | null | undefined): string => {
  if (!value) return "";
  const found = (PICKLISTS[name] as readonly PicklistOption[]).find((o) => o.value === value);
  return found?.label ?? value;
};

export const isPicklistValue = (name: PicklistName, value: string): boolean =>
  (PICKLISTS[name] as readonly PicklistOption[]).some((o) => o.value === value);

export const isActivePicklistValue = (name: PicklistName, value: string): boolean =>
  (PICKLISTS[name] as readonly PicklistOption[]).some((o) => o.value === value && o.active);

// ---------------------------------------------------------------------------
// Pays et États/Provinces (déduit) : l'observation montre que State/Province
// dépend de Country (picklists d'adresse activées), sans que la liste complète
// ait été capturée. Sous-ensemble représentatif ; les codes suivent ISO 3166.
// ---------------------------------------------------------------------------

export type StateOption = { code: string; label: string };
export type CountryOption = { code: string; label: string; states: StateOption[] };

const s = (code: string, label: string): StateOption => ({ code, label });

export const COUNTRY_OPTIONS: CountryOption[] = [
  {
    code: "US",
    label: "United States",
    states: [
      s("CA", "California"),
      s("CO", "Colorado"),
      s("FL", "Florida"),
      s("GA", "Georgia"),
      s("IL", "Illinois"),
      s("MA", "Massachusetts"),
      s("NY", "New York"),
      s("OR", "Oregon"),
      s("TX", "Texas"),
      s("WA", "Washington"),
    ],
  },
  {
    code: "CA",
    label: "Canada",
    states: [
      s("AB", "Alberta"),
      s("BC", "British Columbia"),
      s("ON", "Ontario"),
      s("QC", "Quebec"),
    ],
  },
  {
    code: "FR",
    label: "France",
    states: [],
  },
  {
    code: "DE",
    label: "Germany",
    states: [],
  },
  {
    code: "GB",
    label: "United Kingdom",
    states: [],
  },
  {
    code: "CI",
    label: "Côte d'Ivoire",
    states: [],
  },
  {
    code: "SN",
    label: "Senegal",
    states: [],
  },
  {
    code: "MA",
    label: "Morocco",
    states: [],
  },
];

export const findCountry = (code: string | null | undefined): CountryOption | undefined =>
  code ? COUNTRY_OPTIONS.find((c) => c.code === code) : undefined;

export const findState = (countryCode: string | null | undefined, stateCode: string | null | undefined) =>
  findCountry(countryCode)?.states.find((st) => st.code === stateCode);

export const countryLabel = (code: string | null | undefined): string => findCountry(code)?.label ?? "";
export const stateLabel = (countryCode: string | null | undefined, stateCode: string | null | undefined): string =>
  findState(countryCode, stateCode)?.label ?? "";
