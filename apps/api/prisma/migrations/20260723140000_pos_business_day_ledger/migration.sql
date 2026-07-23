-- Implicit Asia/Baku business-day shifts + daily POS ledger (single register).

ALTER TABLE "cash_shifts"
ADD COLUMN "business_date" DATE;

-- Backfill from opened_at in Asia/Baku.
UPDATE "cash_shifts"
SET "business_date" = (("opened_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baku')::date
WHERE "business_date" IS NULL;

-- Deduplicate same register+day: keep earliest OPEN/CLOSING if any, else earliest row.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY register_id, business_date
      ORDER BY
        CASE status
          WHEN 'OPEN' THEN 0
          WHEN 'CLOSING' THEN 1
          ELSE 2
        END,
        opened_at ASC,
        id ASC
    ) AS rn
  FROM "cash_shifts"
)
UPDATE "cash_shifts" AS cs
SET
  "status" = 'CLOSED',
  "closed_at" = COALESCE(cs."closed_at", NOW()),
  "closing_started_at" = COALESCE(cs."closing_started_at", NOW()),
  "counted_cash" = COALESCE(cs."counted_cash", cs."expected_cash"),
  "discrepancy" = COALESCE(cs."discrepancy", 0),
  "business_date" = cs."business_date" - ((ranked.rn - 1) * INTERVAL '1 day')
FROM ranked
WHERE cs.id = ranked.id
  AND ranked.rn > 1;

ALTER TABLE "cash_shifts"
ALTER COLUMN "business_date" SET NOT NULL;

CREATE UNIQUE INDEX "cash_shifts_register_id_business_date_key"
ON "cash_shifts"("register_id", "business_date");

CREATE INDEX "cash_shifts_business_date_status_idx"
ON "cash_shifts"("business_date", "status");

CREATE TABLE "pos_daily_ledgers" (
    "id" UUID NOT NULL,
    "register_id" UUID NOT NULL,
    "business_date" DATE NOT NULL,
    "cash_sales" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "card_sales" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "installment_sales" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cash_refunds" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "card_refunds" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "installment_refunds" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sale_count" INTEGER NOT NULL DEFAULT 0,
    "return_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_daily_ledgers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pos_daily_ledgers_register_id_business_date_key"
ON "pos_daily_ledgers"("register_id", "business_date");

CREATE UNIQUE INDEX "pos_daily_ledgers_business_date_key"
ON "pos_daily_ledgers"("business_date");

CREATE INDEX "pos_daily_ledgers_register_id_business_date_idx"
ON "pos_daily_ledgers"("register_id", "business_date");

ALTER TABLE "pos_daily_ledgers"
ADD CONSTRAINT "pos_daily_ledgers_register_id_fkey"
FOREIGN KEY ("register_id") REFERENCES "cash_registers"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
