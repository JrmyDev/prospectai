-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN "callStatus" TEXT;
ALTER TABLE "Prospect" ADD COLUMN "lastCallAt" DATETIME;
ALTER TABLE "Prospect" ADD COLUMN "nextCallAt" DATETIME;
