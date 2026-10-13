-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PLANNED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ObjectKind" AS ENUM ('STANDARD', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ArtifactKind" AS ENUM ('SCREENSHOT', 'DOM_SNAPSHOT', 'HAR', 'TRACE', 'REPORT', 'OTHER');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptureSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'PLANNED',
    "targetBaseUrl" TEXT NOT NULL,
    "authorizationRef" TEXT NOT NULL,
    "scopeNotes" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaptureSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screen" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "title" TEXT,
    "metadata" JSONB,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Screen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataObject" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "apiName" TEXT NOT NULL,
    "label" TEXT,
    "kind" "ObjectKind" NOT NULL DEFAULT 'STANDARD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataField" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "apiName" TEXT NOT NULL,
    "label" TEXT,
    "dataType" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "picklist" JSONB,

    CONSTRAINT "DataField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessRule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "screenId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "screenId" TEXT,
    "kind" "ArtifactKind" NOT NULL,
    "path" TEXT NOT NULL,
    "sha256" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");

-- CreateIndex
CREATE INDEX "CaptureSession_projectId_idx" ON "CaptureSession"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Screen_sessionId_route_key" ON "Screen"("sessionId", "route");

-- CreateIndex
CREATE UNIQUE INDEX "DataObject_projectId_apiName_key" ON "DataObject"("projectId", "apiName");

-- CreateIndex
CREATE UNIQUE INDEX "DataField_objectId_apiName_key" ON "DataField"("objectId", "apiName");

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_sourceId_targetId_name_key" ON "Relationship"("sourceId", "targetId", "name");

-- CreateIndex
CREATE INDEX "BusinessRule_projectId_idx" ON "BusinessRule"("projectId");

-- CreateIndex
CREATE INDEX "Artifact_sessionId_idx" ON "Artifact"("sessionId");

-- AddForeignKey
ALTER TABLE "CaptureSession" ADD CONSTRAINT "CaptureSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screen" ADD CONSTRAINT "Screen_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CaptureSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataObject" ADD CONSTRAINT "DataObject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataField" ADD CONSTRAINT "DataField_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "DataObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "DataObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessRule" ADD CONSTRAINT "BusinessRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessRule" ADD CONSTRAINT "BusinessRule_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "Screen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CaptureSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "Screen"("id") ON DELETE SET NULL ON UPDATE CASCADE;
