-- POS launcher channels: distinguish card / transfer / Wolt / Birmarket on sales + daily ledger.

CREATE TYPE "PosSaleChannel" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'WOLT', 'BIRMARKET');

ALTER TABLE "pos_sales"
ADD COLUMN "channel" "PosSaleChannel";

-- Backfill from payment method (historical marketplace sales were stored as CARD).
UPDATE "pos_sales"
SET "channel" = CASE
  WHEN "payment_method" = 'CASH' THEN 'CASH'::"PosSaleChannel"
  ELSE 'CARD'::"PosSaleChannel"
END
WHERE "channel" IS NULL;

ALTER TABLE "pos_sales"
ALTER COLUMN "channel" SET NOT NULL;

ALTER TABLE "pos_sales"
ALTER COLUMN "channel" SET DEFAULT 'CASH'::"PosSaleChannel";

CREATE INDEX "pos_sales_register_id_channel_created_at_idx"
ON "pos_sales"("register_id", "channel", "created_at");

ALTER TABLE "pos_daily_ledgers"
ADD COLUMN "transfer_sales" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "wolt_sales" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "birmarket_sales" DECIMAL(18,2) NOT NULL DEFAULT 0;
