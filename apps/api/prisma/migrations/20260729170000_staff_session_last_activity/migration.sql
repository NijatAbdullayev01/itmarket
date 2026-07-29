-- Staff inactivity timeout: slide last_activity_at on authenticated use.
ALTER TABLE "staff_sessions"
  ADD COLUMN "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
