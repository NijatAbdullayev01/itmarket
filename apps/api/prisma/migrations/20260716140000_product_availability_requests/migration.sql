-- CreateEnum
CREATE TYPE "ProductAvailabilityRequestType" AS ENUM ('STOCK_ALERT', 'PREORDER');

-- CreateEnum
CREATE TYPE "ProductAvailabilityRequestStatus" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "product_availability_requests" (
    "id" UUID NOT NULL,
    "type" "ProductAvailabilityRequestType" NOT NULL,
    "status" "ProductAvailabilityRequestStatus" NOT NULL DEFAULT 'PENDING',
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "product_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "customer_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "fulfilled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_availability_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_availability_requests_variant_id_type_status_idx" ON "product_availability_requests"("variant_id", "type", "status");

-- CreateIndex
CREATE INDEX "product_availability_requests_status_created_at_idx" ON "product_availability_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "product_availability_requests_phone_created_at_idx" ON "product_availability_requests"("phone", "created_at");

-- AddForeignKey
ALTER TABLE "product_availability_requests" ADD CONSTRAINT "product_availability_requests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_availability_requests" ADD CONSTRAINT "product_availability_requests_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_availability_requests" ADD CONSTRAINT "product_availability_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
