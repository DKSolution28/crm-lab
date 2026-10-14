// Données de démonstration synthétiques pour la base CRM Lab locale.
// Aucune donnée réelle : sociétés, personnes et coordonnées sont fictives.
// Exécution : npm run db:seed (idempotent, réinitialise les enregistrements de démo).
import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_TAG = "[demo]";

const users = [
  { alias: "demoadm", firstName: "Demo", lastName: "Admin", role: "ADMIN" as const },
  { alias: "demostd", firstName: "Demo", lastName: "Standard", role: "STANDARD" as const },
];

type SeedAccount = Omit<Prisma.AccountUncheckedCreateInput, "ownerId" | "createdById" | "lastModifiedById"> & {
  owner: string;
  parentName?: string;
  createdDaysAgo?: number;
};

const accounts: SeedAccount[] = [
  {
    name: "Northwind Traders",
    accountNumber: "ACC-1001",
    type: "Customer",
    industry: "Retail",
    rating: "Hot",
    ownership: "Private",
    accountSource: "Web",
    annualRevenue: 48000000,
    numberOfEmployees: 320,
    phone: "+1 555 010 1001",
    website: "https://northwind.example",
    billingStreet: "12 Harbor Way",
    billingCity: "Seattle",
    billingState: "Washington",
    billingStateCode: "WA",
    billingPostalCode: "98101",
    billingCountry: "United States",
    billingCountryCode: "US",
    shippingStreet: "12 Harbor Way",
    shippingCity: "Seattle",
    shippingState: "Washington",
    shippingStateCode: "WA",
    shippingPostalCode: "98101",
    shippingCountry: "United States",
    shippingCountryCode: "US",
    description: `${DEMO_TAG} Distributeur fictif de produits alimentaires.`,
    owner: "demoadm",
    createdDaysAgo: 40,
  },
  {
    name: "Northwind Traders — Pacific Division",
    type: "Customer",
    industry: "Retail",
    rating: "Warm",
    ownership: "Subsidiary",
    annualRevenue: 9000000,
    numberOfEmployees: 60,
    phone: "+1 555 010 1002",
    billingCity: "Portland",
    billingState: "Oregon",
    billingStateCode: "OR",
    billingCountry: "United States",
    billingCountryCode: "US",
    description: `${DEMO_TAG} Filiale fictive (hiérarchie).`,
    owner: "demoadm",
    parentName: "Northwind Traders",
    createdDaysAgo: 30,
  },
  {
    name: "Lumen Biotech",
    type: "Prospect",
    industry: "Biotechnology",
    rating: "Warm",
    accountSource: "TradeShow",
    annualRevenue: 12500000,
    numberOfEmployees: 85,
    phone: "+1 555 010 2001",
    website: "https://lumen-bio.example",
    billingCity: "Boston",
    billingState: "Massachusetts",
    billingStateCode: "MA",
    billingCountry: "United States",
    billingCountryCode: "US",
    description: `${DEMO_TAG} Prospect fictif en biotechnologie.`,
    owner: "demostd",
    createdDaysAgo: 12,
  },
  {
    name: "Atelier Soleil",
    type: "Customer",
    industry: "Apparel",
    rating: "Hot",
    accountSource: "Partner",
    annualRevenue: 3200000,
    numberOfEmployees: 24,
    phone: "+33 1 55 01 03 01",
    website: "https://atelier-soleil.example",
    billingStreet: "8 rue des Lilas",
    billingCity: "Lyon",
    billingPostalCode: "69001",
    billingCountry: "France",
    billingCountryCode: "FR",
    description: `${DEMO_TAG} Marque de vêtements fictive.`,
    owner: "demostd",
    createdDaysAgo: 9,
  },
  {
    name: "Baobab Logistics",
    type: "Partner",
    industry: "Transportation",
    rating: "Warm",
    accountSource: "ExternalReferral",
    annualRevenue: 7800000,
    numberOfEmployees: 140,
    phone: "+225 27 20 01 04 01",
    website: "https://baobab-logistics.example",
    billingCity: "Abidjan",
    billingCountry: "Côte d'Ivoire",
    billingCountryCode: "CI",
    description: `${DEMO_TAG} Transporteur fictif.`,
    owner: "demoadm",
    createdDaysAgo: 6,
  },
  {
    name: "Granite Peak Energy",
    type: "Customer",
    industry: "Energy",
    rating: "Cold",
    ownership: "Public",
    tickerSymbol: "GPE",
    accountSource: "Advertisement",
    annualRevenue: 210000000,
    numberOfEmployees: 1900,
    phone: "+1 555 010 5001",
    website: "https://granitepeak.example",
    billingCity: "Denver",
    billingState: "Colorado",
    billingStateCode: "CO",
    billingCountry: "United States",
    billingCountryCode: "US",
    description: `${DEMO_TAG} Énergéticien fictif coté.`,
    owner: "demoadm",
    createdDaysAgo: 25,
  },
  {
    name: "Maple Leaf Consulting",
    type: "Reseller",
    industry: "Consulting",
    rating: "Warm",
    accountSource: "EmployeeReferral",
    annualRevenue: 5400000,
    numberOfEmployees: 45,
    phone: "+1 555 010 6001",
    billingCity: "Toronto",
    billingState: "Ontario",
    billingStateCode: "ON",
    billingCountry: "Canada",
    billingCountryCode: "CA",
    description: `${DEMO_TAG} Cabinet de conseil fictif.`,
    owner: "demostd",
    createdDaysAgo: 3,
  },
  {
    name: "Rheinwerk Maschinen",
    type: "Competitor",
    industry: "Machinery",
    ownership: "Private",
    annualRevenue: 66000000,
    numberOfEmployees: 410,
    phone: "+49 30 010 7001",
    website: "https://rheinwerk.example",
    billingCity: "Berlin",
    billingCountry: "Germany",
    billingCountryCode: "DE",
    description: `${DEMO_TAG} Concurrent fictif.`,
    owner: "demoadm",
    createdDaysAgo: 18,
  },
  {
    name: "Teranga Media",
    type: "Prospect",
    industry: "Media",
    rating: "Hot",
    accountSource: "SeminarPartner",
    annualRevenue: 1500000,
    numberOfEmployees: 18,
    phone: "+221 33 010 8001",
    billingCity: "Dakar",
    billingCountry: "Senegal",
    billingCountryCode: "SN",
    description: `${DEMO_TAG} Média fictif.`,
    owner: "demostd",
    createdDaysAgo: 1,
  },
  {
    name: "Harbor Lights Hospitality",
    type: "Customer",
    industry: "Hospitality",
    rating: "Warm",
    accountSource: "WordOfMouth",
    annualRevenue: 23000000,
    numberOfEmployees: 260,
    phone: "+44 20 010 9001",
    website: "https://harborlights.example",
    billingCity: "London",
    billingCountry: "United Kingdom",
    billingCountryCode: "GB",
    isBuyer: true,
    description: `${DEMO_TAG} Groupe hôtelier fictif.`,
    owner: "demoadm",
    createdDaysAgo: 0,
  },
  {
    name: "Casa Atlas Construction",
    type: "Investor",
    industry: "Construction",
    annualRevenue: 31000000,
    numberOfEmployees: 500,
    phone: "+212 5 010 1101",
    billingCity: "Casablanca",
    billingCountry: "Morocco",
    billingCountryCode: "MA",
    description: `${DEMO_TAG} Constructeur fictif.`,
    owner: "demostd",
    createdDaysAgo: 14,
  },
  {
    name: "Pixel & Pine Studio",
    type: "Analyst",
    industry: "Technology",
    rating: "Cold",
    accountSource: "PublicRelations",
    annualRevenue: 900000,
    numberOfEmployees: 9,
    phone: "+1 555 010 1201",
    website: "https://pixelpine.example",
    billingCity: "Austin",
    billingState: "Texas",
    billingStateCode: "TX",
    billingCountry: "United States",
    billingCountryCode: "US",
    description: `${DEMO_TAG} Studio fictif.`,
    owner: "demoadm",
    createdDaysAgo: 2,
  },
];

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

async function main() {
  const userIds = new Map<string, string>();
  for (const user of users) {
    const record = await prisma.user.upsert({ where: { alias: user.alias }, update: user, create: user });
    userIds.set(user.alias, record.id);
  }

  // Réinitialise uniquement les enregistrements de démonstration.
  await prisma.opportunity.deleteMany({ where: { account: { description: { startsWith: DEMO_TAG } } } });
  await prisma.contact.deleteMany({ where: { account: { description: { startsWith: DEMO_TAG } } } });
  await prisma.account.deleteMany({ where: { description: { startsWith: DEMO_TAG } } });

  const accountIds = new Map<string, string>();
  for (const seed of accounts) {
    const { owner, parentName, createdDaysAgo, ...data } = seed;
    const ownerId = userIds.get(owner)!;
    const record = await prisma.account.create({
      data: {
        ...data,
        ownerId,
        createdById: ownerId,
        lastModifiedById: ownerId,
        parentId: parentName ? accountIds.get(parentName) : undefined,
        createdAt: daysAgo(createdDaysAgo ?? 0),
        lastActivityDate: createdDaysAgo && createdDaysAgo > 5 ? daysAgo(createdDaysAgo - 5) : null,
      },
    });
    accountIds.set(seed.name, record.id);
  }

  const contacts = [
    { account: "Northwind Traders", firstName: "Ada", lastName: "Demo-Lovelace", title: "Purchasing Lead", email: "ada@northwind.example" },
    { account: "Northwind Traders", firstName: "Grace", lastName: "Demo-Hopper", title: "Operations", email: "grace@northwind.example" },
    { account: "Lumen Biotech", firstName: "Linus", lastName: "Demo-Pauling", title: "Lab Director", email: "linus@lumen-bio.example" },
    { account: "Atelier Soleil", firstName: "Coco", lastName: "Demo-Chanelle", title: "Founder", email: "coco@atelier-soleil.example" },
  ];
  for (const contact of contacts) {
    const { account, ...data } = contact;
    const accountId = accountIds.get(account)!;
    const ownerId = userIds.get(accounts.find((a) => a.name === account)!.owner)!;
    await prisma.contact.create({ data: { ...data, accountId, ownerId } });
  }

  const opportunities = [
    { account: "Northwind Traders", name: "Northwind — Renewal FY27", stageName: "Negotiation", amount: 240000, closeInDays: 30 },
    { account: "Lumen Biotech", name: "Lumen — Pilot program", stageName: "Qualification", amount: 60000, closeInDays: 75 },
    { account: "Harbor Lights Hospitality", name: "Harbor Lights — Rollout", stageName: "Proposal", amount: 180000, closeInDays: 45 },
  ];
  for (const opportunity of opportunities) {
    const { account, closeInDays, ...data } = opportunity;
    const accountId = accountIds.get(account)!;
    const ownerId = userIds.get(accounts.find((a) => a.name === account)!.owner)!;
    await prisma.opportunity.create({ data: { ...data, accountId, ownerId, closeDate: new Date(Date.now() + closeInDays * 86_400_000) } });
  }

  // Quelques consultations récentes pour la vue Recently Viewed de l'administrateur.
  const admin = userIds.get("demoadm")!;
  for (const name of ["Northwind Traders", "Lumen Biotech", "Harbor Lights Hospitality"]) {
    await prisma.recentlyViewed.upsert({
      where: { userId_accountId: { userId: admin, accountId: accountIds.get(name)! } },
      update: { viewedAt: new Date() },
      create: { userId: admin, accountId: accountIds.get(name)! },
    });
  }

  console.log(`Seeded ${users.length} users, ${accounts.length} accounts, ${contacts.length} contacts, ${opportunities.length} opportunities.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
