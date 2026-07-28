-- Migrate legacy plaintext cart guest tokens to hash-at-rest storage.
-- Uses pgcrypto digest to match Node createHash('sha256').digest('hex').
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE "carts"
SET
  "guest_token_hash" = encode(digest("guest_token", 'sha256'), 'hex'),
  "guest_token" = NULL
WHERE
  "guest_token" IS NOT NULL
  AND "guest_token_hash" IS NULL;
