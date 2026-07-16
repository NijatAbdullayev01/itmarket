CREATE TABLE "customer_password_resets" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_password_resets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_password_resets_token_hash_key" ON "customer_password_resets"("token_hash");

CREATE INDEX "customer_password_resets_customer_id_expires_at_idx" ON "customer_password_resets"("customer_id", "expires_at");

ALTER TABLE "customer_password_resets" ADD CONSTRAINT "customer_password_resets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
