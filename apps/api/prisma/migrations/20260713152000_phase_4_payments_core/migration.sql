-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'INSTALLMENT');

-- CreateEnum
CREATE TYPE "NotificationOutboxStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AZN',
    "provider_payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_attempts" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "provider_payment_id" TEXT,
    "provider_checkout_token" TEXT NOT NULL,
    "provider_checkout_url" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "installment_months" INTEGER,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AZN',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "provider_payment_id" TEXT,
    "event_type" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amount" DECIMAL(18,2),
    "currency" TEXT,
    "order_number" TEXT,
    "raw_payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_outbox" (
    "id" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "NotificationOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_payment_id_key" ON "payments"("provider_payment_id");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE INDEX "payments_provider_provider_payment_id_idx" ON "payments"("provider", "provider_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_provider_payment_id_key" ON "payment_attempts"("provider_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_provider_checkout_token_key" ON "payment_attempts"("provider_checkout_token");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_payment_id_idempotency_key_key" ON "payment_attempts"("payment_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "payment_attempts_status_created_at_idx" ON "payment_attempts"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_event_id_key" ON "payment_events"("provider_event_id");

-- CreateIndex
CREATE INDEX "payment_events_payment_id_created_at_idx" ON "payment_events"("payment_id", "created_at");

-- CreateIndex
CREATE INDEX "payment_events_provider_payment_id_idx" ON "payment_events"("provider_payment_id");

-- CreateIndex
CREATE INDEX "notification_outbox_status_created_at_idx" ON "notification_outbox"("status", "created_at");

-- CreateIndex
CREATE INDEX "notification_outbox_reference_type_reference_id_created_at_idx" ON "notification_outbox"("reference_type", "reference_id", "created_at");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Domain constraints that Prisma cannot express.
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_currency_check" CHECK ("currency" = 'AZN'),
  ADD CONSTRAINT "payments_amount_check" CHECK ("amount" >= 0);

ALTER TABLE "payment_attempts"
  ADD CONSTRAINT "payment_attempts_currency_check" CHECK ("currency" = 'AZN'),
  ADD CONSTRAINT "payment_attempts_amount_check" CHECK ("amount" >= 0),
  ADD CONSTRAINT "payment_attempts_installment_months_check" CHECK ("installment_months" IS NULL OR "installment_months" > 0);

ALTER TABLE "payment_events"
  ADD CONSTRAINT "payment_events_amount_check" CHECK ("amount" IS NULL OR "amount" >= 0);

CREATE TRIGGER "payments_immutable_delete"
BEFORE DELETE ON "payments"
FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();

CREATE TRIGGER "payment_events_immutable"
BEFORE UPDATE OR DELETE ON "payment_events"
FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
