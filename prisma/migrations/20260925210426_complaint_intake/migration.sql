-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_conversationId_fkey";

-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "channel" TEXT,
ADD COLUMN     "language" TEXT,
ALTER COLUMN "conversationId" DROP NOT NULL;

-- Backfill: every complaint before this migration came from a chat
-- conversation, so take the channel of that conversation's latest inbound
-- message at or before the complaint was filed.
UPDATE "Complaint" c
SET "channel" = (
    SELECT m."channel"
    FROM "Message" m
    WHERE m."conversationId" = c."conversationId"
      AND m."direction" = 'INBOUND'
      AND m."createdAt" <= c."createdAt"
    ORDER BY m."createdAt" DESC
    LIMIT 1
);
UPDATE "Complaint" SET "channel" = 'unknown' WHERE "channel" IS NULL;

ALTER TABLE "Complaint" ALTER COLUMN "channel" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Complaint_channel_idx" ON "Complaint"("channel");

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
