import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Demo data loosely modelled on the Salesforce sample org. Idempotent: the
// seed is skipped when accounts already exist.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.account.count();
  if (existing > 0) {
    console.log(`Seed skipped: ${existing} account(s) already present.`);
    return;
  }

  await prisma.account.create({
    data: {
      name: "Edge Communications",
      industry: "Electronics",
      website: "https://edgecomm.example",
      billingCity: "Austin",
      contacts: {
        create: [
          { firstName: "Rose", lastName: "Gonzalez", email: "rose@edgecomm.example", title: "SVP, Procurement" },
          { firstName: "Sean", lastName: "Forbes", email: "sean@edgecomm.example", title: "CFO" },
        ],
      },
      opportunities: {
        create: [
          { name: "Edge Emergency Generator", stage: "CLOSED_WON", amount: 75000, closeDate: new Date("2026-03-15") },
          { name: "Edge SLA", stage: "PROPOSAL", amount: 60000, closeDate: new Date("2026-11-30") },
        ],
      },
    },
  });

  await prisma.account.create({
    data: {
      name: "Burlington Textiles Corp of America",
      industry: "Apparel",
      website: "https://burlington.example",
      billingCity: "Burlington",
      contacts: {
        create: [{ firstName: "Jack", lastName: "Rogers", email: "jack@burlington.example", title: "VP, Facilities" }],
      },
      opportunities: {
        create: [
          { name: "Burlington Textiles Weaving Plant Generator", stage: "NEGOTIATION", amount: 235000, closeDate: new Date("2026-12-10") },
        ],
      },
    },
  });

  await prisma.account.create({
    data: {
      name: "GenePoint",
      industry: "Biotechnology",
      website: "https://genepoint.example",
      billingCity: "Mountain View",
      contacts: {
        create: [{ firstName: "Edna", lastName: "Frank", email: "edna@genepoint.example", title: "VP, Technology" }],
      },
      opportunities: {
        create: [
          { name: "GenePoint Standby Generator", stage: "QUALIFICATION", amount: 85000, closeDate: new Date("2027-01-20") },
          { name: "GenePoint Lab Generators", stage: "PROSPECTING", amount: 60000 },
        ],
      },
    },
  });

  const [accounts, contacts, opportunities] = await Promise.all([
    prisma.account.count(),
    prisma.contact.count(),
    prisma.opportunity.count(),
  ]);
  console.log(`Seeded ${accounts} accounts, ${contacts} contacts, ${opportunities} opportunities.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
