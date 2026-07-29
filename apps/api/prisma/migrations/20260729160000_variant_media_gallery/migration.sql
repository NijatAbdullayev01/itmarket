-- AlterTable: allow multiple images per variant (drop 1:1 unique)
DROP INDEX IF EXISTS "product_variant_media_variant_id_key";

-- AlterTable
ALTER TABLE "product_variant_media" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_variant_media_variant_id_sort_order_idx" ON "product_variant_media"("variant_id", "sort_order");
