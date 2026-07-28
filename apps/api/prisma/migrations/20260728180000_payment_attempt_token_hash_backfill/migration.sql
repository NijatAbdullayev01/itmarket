-- Hash remaining plaintext payment attempt capability tokens at rest.
-- Already-hashed rows are 64-char hex and must not be double-hashed
-- (that would invalidate client-held opaque tokens).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE "payment_attempts"
SET "provider_checkout_token" = encode(digest("provider_checkout_token", 'sha256'), 'hex')
WHERE "provider_checkout_token" !~* '^[0-9a-f]{64}$';
