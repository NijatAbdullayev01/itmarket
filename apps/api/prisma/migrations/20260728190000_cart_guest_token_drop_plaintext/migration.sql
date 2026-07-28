-- Close cart guest-token dual-read window: scrub any leftover plaintext.
-- Access requires guest_token_hash (see assertCartGuestAccess).
UPDATE "carts"
SET "guest_token" = NULL
WHERE "guest_token" IS NOT NULL;
