-- AlterTable
ALTER TABLE "notification_outbox" ADD COLUMN "attempt_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "notification_outbox" ADD COLUMN "next_attempt_at" TIMESTAMP(3);
ALTER TABLE "notification_outbox" ADD COLUMN "last_error" TEXT;

-- CreateIndex
CREATE INDEX "notification_outbox_status_next_attempt_at_created_at_idx" ON "notification_outbox"("status", "next_attempt_at", "created_at");
