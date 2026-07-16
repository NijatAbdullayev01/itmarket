-- CreateEnum
CREATE TYPE "CreditApplicationStatus" AS ENUM ('PENDING', 'PROCESSING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "credit_applications" (
    "id" UUID NOT NULL,
    "fin_code" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "cart_id" UUID,
    "customer_id" UUID,
    "status" "CreditApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_applications_status_created_at_idx" ON "credit_applications"("status", "created_at");

-- CreateIndex
CREATE INDEX "credit_applications_phone_created_at_idx" ON "credit_applications"("phone", "created_at");

-- CreateIndex
CREATE INDEX "credit_applications_product_id_created_at_idx" ON "credit_applications"("product_id", "created_at");

-- AddForeignKey
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
