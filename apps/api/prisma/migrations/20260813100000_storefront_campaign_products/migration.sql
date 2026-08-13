-- CreateEnum
CREATE TYPE "StorefrontCampaignKind" AS ENUM ('WEEKLY_DEAL');

-- CreateTable
CREATE TABLE "storefront_campaign_products" (
    "id" UUID NOT NULL,
    "kind" "StorefrontCampaignKind" NOT NULL,
    "product_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storefront_campaign_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "storefront_campaign_products_kind_product_id_key" ON "storefront_campaign_products"("kind", "product_id");

-- CreateIndex
CREATE INDEX "storefront_campaign_products_kind_sort_order_idx" ON "storefront_campaign_products"("kind", "sort_order");

-- AddForeignKey
ALTER TABLE "storefront_campaign_products" ADD CONSTRAINT "storefront_campaign_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
