-- CreateTable
CREATE TABLE "ProspectEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProspectEvent_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProspectEvent_prospectId_idx" ON "ProspectEvent"("prospectId");

-- CreateIndex
CREATE INDEX "ProspectEvent_createdAt_idx" ON "ProspectEvent"("createdAt");
