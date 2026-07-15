ALTER TABLE "orders"
ADD COLUMN "checkout_idempotency_key" TEXT;

CREATE UNIQUE INDEX "orders_checkout_idempotency_key_key"
ON "orders"("checkout_idempotency_key");
