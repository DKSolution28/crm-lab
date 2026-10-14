// Consultations récentes. La clé Account `userId_accountId` reste l'upsert
// des comptes. Les autres objets ont leur propre clé unique.
import type { Prisma, RecentObject } from "@prisma/client";
import type { CurrentUser } from "../auth/current-user";
import { prisma } from "../prisma";

export type DbClient = Prisma.TransactionClient | typeof prisma;

export const recordRecentView = async (
  objectType: RecentObject,
  recordId: string,
  user: CurrentUser,
  db: DbClient = prisma,
) => {
  const client = db as Prisma.TransactionClient;
  const viewedAt = new Date();
  switch (objectType) {
    case "Account":
      await client.recentlyViewed.upsert({
        where: { userId_accountId: { userId: user.id, accountId: recordId } },
        update: { viewedAt },
        create: { userId: user.id, objectType: "Account", accountId: recordId },
      });
      return;
    case "Contact":
      await client.recentlyViewed.upsert({
        where: { userId_contactId: { userId: user.id, contactId: recordId } },
        update: { viewedAt },
        create: { userId: user.id, objectType: "Contact", contactId: recordId },
      });
      return;
    case "Lead":
      await client.recentlyViewed.upsert({
        where: { userId_leadId: { userId: user.id, leadId: recordId } },
        update: { viewedAt },
        create: { userId: user.id, objectType: "Lead", leadId: recordId },
      });
      return;
    case "Opportunity":
      await client.recentlyViewed.upsert({
        where: { userId_opportunityId: { userId: user.id, opportunityId: recordId } },
        update: { viewedAt },
        create: { userId: user.id, objectType: "Opportunity", opportunityId: recordId },
      });
      return;
    default: {
      const unexpected: never = objectType;
      throw new Error(`Unsupported recent object type: ${unexpected}`);
    }
  }
};
