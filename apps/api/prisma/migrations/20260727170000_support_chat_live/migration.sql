-- CreateEnum
CREATE TYPE "SupportChatSenderType" AS ENUM ('CUSTOMER', 'STAFF');

-- AlterTable
ALTER TABLE "support_messages"
ADD COLUMN "guest_token_hash" TEXT,
ADD COLUMN "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "support_chat_messages" (
    "id" UUID NOT NULL,
    "thread_id" UUID NOT NULL,
    "sender_type" "SupportChatSenderType" NOT NULL,
    "staff_user_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_chat_messages_pkey" PRIMARY KEY ("id")
);

-- Backfill first customer message from existing thread body
INSERT INTO "support_chat_messages" ("id", "thread_id", "sender_type", "body", "created_at")
SELECT gen_random_uuid(), "id", 'CUSTOMER', "body", "created_at"
FROM "support_messages";

UPDATE "support_messages" AS t
SET "last_message_at" = t."created_at";

-- CreateIndex
CREATE INDEX "support_chat_messages_thread_id_created_at_idx" ON "support_chat_messages"("thread_id", "created_at");

-- CreateIndex
CREATE INDEX "support_messages_status_last_message_at_idx" ON "support_messages"("status", "last_message_at");

-- AddForeignKey
ALTER TABLE "support_chat_messages" ADD CONSTRAINT "support_chat_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "support_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_chat_messages" ADD CONSTRAINT "support_chat_messages_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
