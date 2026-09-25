-- Complainants get a random reference number (e.g. "7K3Q-9P2M") instead
-- of a sequential ticket number.
ALTER TABLE "Complaint" ADD COLUMN "reference" TEXT;

-- Backfill existing complaints with references in the same format the app
-- generates (see src/complaints/complaint-reference.ts).
DO $$
DECLARE
  alphabet CONSTANT TEXT := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  complaint RECORD;
  ref TEXT;
BEGIN
  FOR complaint IN SELECT "id" FROM "Complaint" LOOP
    LOOP
      ref := '';
      FOR i IN 1..8 LOOP
        ref := ref || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
        IF i = 4 THEN
          ref := ref || '-';
        END IF;
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "Complaint" WHERE "reference" = ref);
    END LOOP;
    UPDATE "Complaint" SET "reference" = ref WHERE "id" = complaint."id";
  END LOOP;
END $$;

ALTER TABLE "Complaint" ALTER COLUMN "reference" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_reference_key" ON "Complaint"("reference");

-- AlterTable
ALTER TABLE "Complaint" DROP COLUMN "ticket";
