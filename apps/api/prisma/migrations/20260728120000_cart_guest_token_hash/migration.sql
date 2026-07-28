-- Hash-at-rest for cart guest capability tokens.
-- Existing plaintext rows are dual-read and lazily migrated by the API.
ALTER TABLE "carts" ADD COLUMN IF NOT EXISTS "guest_token_hash" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "carts_guest_token_hash_key" ON "carts"("guest_token_hash");
