-- CreateEnum
CREATE TYPE "SupportMessageStatus" AS ENUM ('PENDING', 'OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "support_messages" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "body" TEXT NOT NULL,
    "status" "SupportMessageStatus" NOT NULL DEFAULT 'PENDING',
    "page_path" TEXT,
    "customer_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_messages_status_created_at_idx" ON "support_messages"("status", "created_at");

-- CreateIndex
CREATE INDEX "support_messages_phone_created_at_idx" ON "support_messages"("phone", "created_at");

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
