-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STANDARD');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('Analyst', 'Competitor', 'Customer', 'Integrator', 'Investor', 'Partner', 'Press', 'Prospect', 'Reseller', 'Other');

-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('Agriculture', 'Apparel', 'Banking', 'Biotechnology', 'Chemicals', 'Communications', 'Construction', 'Consulting', 'Education', 'Electronics', 'Energy', 'Engineering', 'Entertainment', 'Environmental', 'Finance', 'FoodBeverage', 'Government', 'Healthcare', 'Hospitality', 'Insurance', 'Machinery', 'Manufacturing', 'Media', 'NotForProfit', 'Other', 'Recreation', 'Retail', 'Shipping', 'Technology', 'Telecommunications', 'Transportation', 'Utilities', 'AerospaceDefense', 'BusinessServices', 'Advertising');

-- CreateEnum
CREATE TYPE "AccountSource" AS ENUM ('Advertisement', 'EmployeeReferral', 'ExternalReferral', 'Partner', 'PublicRelations', 'SeminarInternal', 'SeminarPartner', 'TradeShow', 'Web', 'WordOfMouth', 'Other');

-- CreateEnum
CREATE TYPE "Rating" AS ENUM ('Hot', 'Warm', 'Cold');

-- CreateEnum
CREATE TYPE "Ownership" AS ENUM ('Public', 'Private', 'Subsidiary', 'Other');

-- CreateEnum
CREATE TYPE "ListViewVisibility" AS ENUM ('PRIVATE', 'EVERYONE');

-- CreateEnum
CREATE TYPE "ListViewScope" AS ENUM ('ALL', 'MINE', 'RECENT', 'NEW_THIS_WEEK');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STANDARD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pinnedAccountViewId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountNumber" VARCHAR(40),
    "site" VARCHAR(80),
    "accountSource" "AccountSource",
    "annualRevenue" DECIMAL(18,0),
    "type" "AccountType",
    "industry" "Industry",
    "ownership" "Ownership",
    "rating" "Rating",
    "description" VARCHAR(32000),
    "website" VARCHAR(255),
    "tickerSymbol" VARCHAR(20),
    "sic" VARCHAR(20),
    "sicDesc" VARCHAR(80),
    "jigsaw" VARCHAR(20),
    "tier" VARCHAR(2),
    "numberOfEmployees" INTEGER,
    "isBuyer" BOOLEAN NOT NULL DEFAULT false,
    "isCustomerPortal" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "fax" TEXT,
    "billingStreet" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingStateCode" TEXT,
    "billingPostalCode" TEXT,
    "billingCountry" TEXT,
    "billingCountryCode" TEXT,
    "shippingStreet" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingStateCode" TEXT,
    "shippingPostalCode" TEXT,
    "shippingCountry" TEXT,
    "shippingCountryCode" TEXT,
    "parentId" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "lastModifiedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActivityDate" TIMESTAMP(3),

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListView" (
    "id" TEXT NOT NULL,
    "objectType" TEXT NOT NULL DEFAULT 'Account',
    "developerName" TEXT,
    "label" TEXT NOT NULL,
    "visibility" "ListViewVisibility" NOT NULL DEFAULT 'PRIVATE',
    "scope" "ListViewScope" NOT NULL DEFAULT 'ALL',
    "columns" TEXT[],
    "sortField" TEXT,
    "sortDirection" TEXT DEFAULT 'asc',
    "filters" JSONB NOT NULL DEFAULT '[]',
    "filterLogic" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecentlyViewed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecentlyViewed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "title" TEXT,
    "accountId" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stageName" TEXT NOT NULL,
    "amount" DECIMAL(18,2),
    "closeDate" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_alias_key" ON "User"("alias");

-- CreateIndex
CREATE INDEX "Account_name_idx" ON "Account"("name");

-- CreateIndex
CREATE INDEX "Account_ownerId_idx" ON "Account"("ownerId");

-- CreateIndex
CREATE INDEX "Account_parentId_idx" ON "Account"("parentId");

-- CreateIndex
CREATE INDEX "Account_createdAt_idx" ON "Account"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ListView_developerName_key" ON "ListView"("developerName");

-- CreateIndex
CREATE INDEX "ListView_objectType_ownerId_idx" ON "ListView"("objectType", "ownerId");

-- CreateIndex
CREATE INDEX "RecentlyViewed_userId_viewedAt_idx" ON "RecentlyViewed"("userId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecentlyViewed_userId_accountId_key" ON "RecentlyViewed"("userId", "accountId");

-- CreateIndex
CREATE INDEX "Contact_accountId_idx" ON "Contact"("accountId");

-- CreateIndex
CREATE INDEX "Opportunity_accountId_idx" ON "Opportunity"("accountId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_pinnedAccountViewId_fkey" FOREIGN KEY ("pinnedAccountViewId") REFERENCES "ListView"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListView" ADD CONSTRAINT "ListView_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentlyViewed" ADD CONSTRAINT "RecentlyViewed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentlyViewed" ADD CONSTRAINT "RecentlyViewed_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
