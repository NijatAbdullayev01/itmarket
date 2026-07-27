-- D-011: optional staff TOTP MFA fields (enable per user; not forced until Security sign-off).
ALTER TABLE "staff_users" ADD COLUMN "mfa_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "staff_users" ADD COLUMN "mfa_secret_encrypted" TEXT;
ALTER TABLE "staff_users" ADD COLUMN "mfa_recovery_codes_hash" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
