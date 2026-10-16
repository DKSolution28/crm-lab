-- CreateEnum
CREATE TYPE "Salutation" AS ENUM ('Mr', 'Ms', 'Dr', 'Mx');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('New', 'Working', 'Unqualified', 'Converted');

-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('Qualification', 'Proposal', 'Negotiation', 'ClosedWon', 'ClosedLost');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NotStarted', 'InProgress', 'Completed');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('Low', 'Normal', 'High');

-- CreateEnum
CREATE TYPE "RecentObject" AS ENUM ('Account', 'Contact', 'Lead', 'Opportunity');

-- AlterTable
-- Audit columns are added nullable, backfilled from ownerId, then constrained.
ALTER TABLE "Contact" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "description" VARCHAR(32000),
ADD COLUMN     "lastActivityDate" TIMESTAMP(3),
ADD COLUMN     "lastModifiedById" TEXT,
ADD COLUMN     "mailingCity" TEXT,
ADD COLUMN     "mailingCountry" TEXT,
ADD COLUMN     "mailingCountryCode" TEXT,
ADD COLUMN     "mailingPostalCode" TEXT,
ADD COLUMN     "mailingState" TEXT,
ADD COLUMN     "mailingStateCode" TEXT,
ADD COLUMN     "mailingStreet" TEXT,
ADD COLUMN     "reportsToId" TEXT,
ADD COLUMN     "salutation" "Salutation";

UPDATE "Contact" SET "createdById" = "ownerId", "lastModifiedById" = "ownerId";

ALTER TABLE "Contact" ALTER COLUMN "createdById" SET NOT NULL,
ALTER COLUMN "lastModifiedById" SET NOT NULL;

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "lastModifiedById" TEXT,
ADD COLUMN     "primaryContactId" TEXT,
ADD COLUMN     "probability" INTEGER;

-- Unknown stageName values abort the migration. They are not mapped.
DO $$
DECLARE
  unexpected text;
BEGIN
  SELECT string_agg(DISTINCT "stageName", ', ' ORDER BY "stageName")
    INTO unexpected
  FROM "Opportunity"
  WHERE "stageName" NOT IN ('Qualification', 'Proposal', 'Negotiation', 'ClosedWon', 'ClosedLost');
  IF unexpected IS NOT NULL THEN
    RAISE EXCEPTION 'Opportunity.stageName contains values outside OpportunityStage: %', unexpected;
  END IF;
END $$;

ALTER TABLE "Opportunity" ALTER COLUMN "stageName" SET DATA TYPE "OpportunityStage" USING ("stageName"::"OpportunityStage");

UPDATE "Opportunity" SET "createdById" = "ownerId", "lastModifiedById" = "ownerId";

ALTER TABLE "Opportunity" ALTER COLUMN "createdById" SET NOT NULL,
ALTER COLUMN "lastModifiedById" SET NOT NULL;

-- AlterTable
ALTER TABLE "RecentlyViewed" ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "leadId" TEXT,
ADD COLUMN     "objectType" "RecentObject" NOT NULL DEFAULT 'Account',
ADD COLUMN     "opportunityId" TEXT,
ALTER COLUMN "accountId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "description" VARCHAR(32000),
    "status" "LeadStatus" NOT NULL DEFAULT 'New',
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "lastModifiedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "convertedAt" TIMESTAMP(3),
    "convertedAccountId" TEXT,
    "convertedContactId" TEXT,
    "convertedOpportunityId" TEXT,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" VARCHAR(32000),
    "status" "TaskStatus" NOT NULL DEFAULT 'NotStarted',
    "priority" "TaskPriority" NOT NULL DEFAULT 'Normal',
    "dueDate" DATE,
    "completedAt" TIMESTAMP(3),
    "assigneeId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "accountId" TEXT,
    "contactId" TEXT,
    "leadId" TEXT,
    "opportunityId" TEXT,
    "createdById" TEXT NOT NULL,
    "lastModifiedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_ownerId_idx" ON "Lead"("ownerId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_convertedAt_idx" ON "Lead"("convertedAt");

-- CreateIndex
CREATE INDEX "Lead_convertedAccountId_idx" ON "Lead"("convertedAccountId");

-- CreateIndex
CREATE INDEX "Lead_convertedContactId_idx" ON "Lead"("convertedContactId");

-- CreateIndex
CREATE INDEX "Task_accountId_idx" ON "Task"("accountId");

-- CreateIndex
CREATE INDEX "Task_contactId_idx" ON "Task"("contactId");

-- CreateIndex
CREATE INDEX "Task_leadId_idx" ON "Task"("leadId");

-- CreateIndex
CREATE INDEX "Task_opportunityId_idx" ON "Task"("opportunityId");

-- CreateIndex
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");

-- CreateIndex
CREATE INDEX "Task_ownerId_idx" ON "Task"("ownerId");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Contact_ownerId_idx" ON "Contact"("ownerId");

-- CreateIndex
CREATE INDEX "Contact_reportsToId_idx" ON "Contact"("reportsToId");

-- CreateIndex
CREATE INDEX "Contact_lastName_idx" ON "Contact"("lastName");

-- CreateIndex
CREATE INDEX "Opportunity_ownerId_idx" ON "Opportunity"("ownerId");

-- CreateIndex
CREATE INDEX "Opportunity_stageName_idx" ON "Opportunity"("stageName");

-- CreateIndex
CREATE INDEX "Opportunity_primaryContactId_idx" ON "Opportunity"("primaryContactId");

-- CreateIndex
CREATE INDEX "Opportunity_closeDate_idx" ON "Opportunity"("closeDate");

-- CreateIndex
CREATE UNIQUE INDEX "RecentlyViewed_userId_contactId_key" ON "RecentlyViewed"("userId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "RecentlyViewed_userId_leadId_key" ON "RecentlyViewed"("userId", "leadId");

-- CreateIndex
CREATE UNIQUE INDEX "RecentlyViewed_userId_opportunityId_key" ON "RecentlyViewed"("userId", "opportunityId");

-- AddForeignKey
ALTER TABLE "RecentlyViewed" ADD CONSTRAINT "RecentlyViewed_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentlyViewed" ADD CONSTRAINT "RecentlyViewed_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentlyViewed" ADD CONSTRAINT "RecentlyViewed_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedAccountId_fkey" FOREIGN KEY ("convertedAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedContactId_fkey" FOREIGN KEY ("convertedContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedOpportunityId_fkey" FOREIGN KEY ("convertedOpportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A converted lead may lose a target id in tests (ON DELETE SET NULL). Idempotence depends on convertedAt.
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_conversion_check" CHECK (
  ("status" = 'Converted' AND "convertedAt" IS NOT NULL)
  OR ("status" <> 'Converted' AND "convertedAt" IS NULL
      AND "convertedAccountId" IS NULL
      AND "convertedContactId" IS NULL
      AND "convertedOpportunityId" IS NULL)
);

ALTER TABLE "Task" ADD CONSTRAINT "Task_one_parent_check" CHECK (
  (CASE WHEN "accountId" IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN "contactId" IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN "leadId" IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN "opportunityId" IS NOT NULL THEN 1 ELSE 0 END)
  = 1
);

ALTER TABLE "RecentlyViewed" ADD CONSTRAINT "RecentlyViewed_target_check" CHECK (
  ("objectType" = 'Account' AND "accountId" IS NOT NULL AND "contactId" IS NULL AND "leadId" IS NULL AND "opportunityId" IS NULL)
  OR ("objectType" = 'Contact' AND "contactId" IS NOT NULL AND "accountId" IS NULL AND "leadId" IS NULL AND "opportunityId" IS NULL)
  OR ("objectType" = 'Lead' AND "leadId" IS NOT NULL AND "accountId" IS NULL AND "contactId" IS NULL AND "opportunityId" IS NULL)
  OR ("objectType" = 'Opportunity' AND "opportunityId" IS NOT NULL AND "accountId" IS NULL AND "contactId" IS NULL AND "leadId" IS NULL)
);
