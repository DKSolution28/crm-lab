import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Fictitious demo data only; no records copied from a real org.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: "demo.owner@example.com" },
    update: {},
    create: { email: "demo.owner@example.com", name: "Demo Owner" },
  });

  const account = await prisma.account.upsert({
    where: { salesforceId: "001DEMO000000001" },
    update: {},
    create: {
      salesforceId: "001DEMO000000001",
      name: "Acme Demo Corp",
      industry: "Manufacturing",
      billingCity: "Paris",
      billingCountry: "France",
      ownerId: owner.id,
    },
  });

  const contact = await prisma.contact.upsert({
    where: { salesforceId: "003DEMO000000001" },
    update: {},
    create: {
      salesforceId: "003DEMO000000001",
      firstName: "Camille",
      lastName: "Martin",
      email: "camille.martin@example.com",
      title: "Responsable achats",
      accountId: account.id,
    },
  });

  await prisma.opportunity.upsert({
    where: { salesforceId: "006DEMO000000001" },
    update: {},
    create: {
      salesforceId: "006DEMO000000001",
      name: "Acme - Renouvellement licences",
      stage: "PROPOSAL",
      amount: "25000.00",
      probability: 60,
      accountId: account.id,
      ownerId: owner.id,
    },
  });

  await prisma.lead.upsert({
    where: { salesforceId: "00QDEMO000000001" },
    update: {},
    create: {
      salesforceId: "00QDEMO000000001",
      lastName: "Durand",
      company: "Globex Demo",
      status: "WORKING",
      ownerId: owner.id,
    },
  });

  await prisma.case.upsert({
    where: { caseNumber: "00001001" },
    update: {},
    create: {
      caseNumber: "00001001",
      subject: "Accès au portail",
      priority: "HIGH",
      accountId: account.id,
      contactId: contact.id,
      ownerId: owner.id,
    },
  });
}

main()
  .then(() => console.log("Seed completed"))
  .finally(() => prisma.$disconnect());
