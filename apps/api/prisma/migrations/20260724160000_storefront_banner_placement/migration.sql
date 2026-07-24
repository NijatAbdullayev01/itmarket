-- CreateEnum
CREATE TYPE "StorefrontBannerPlacement" AS ENUM ('HOME_HERO');

-- AlterTable
ALTER TABLE "storefront_banners" ADD COLUMN "placement" "StorefrontBannerPlacement" NOT NULL DEFAULT 'HOME_HERO';

-- DropIndex
DROP INDEX IF EXISTS "storefront_banners_status_sort_order_idx";

-- CreateIndex
CREATE INDEX "storefront_banners_placement_status_sort_order_idx" ON "storefront_banners"("placement", "status", "sort_order");

-- Ensure default homepage hero banners exist (idempotent).
INSERT INTO "storefront_banners" (
  "id",
  "placement",
  "alt_text",
  "href",
  "image_object_key",
  "image_mime_type",
  "image_byte_size",
  "sort_order",
  "status",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  'HOME_HERO',
  'TCL 50 UHD 4K televizor — yeni kolleksiya',
  '/?sort=newest',
  '/images/hero/tech-banner.png',
  'image/png',
  14401,
  0,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "storefront_banners"
  WHERE "image_object_key" = '/images/hero/tech-banner.png'
);

INSERT INTO "storefront_banners" (
  "id",
  "placement",
  "alt_text",
  "href",
  "image_object_key",
  "image_mime_type",
  "image_byte_size",
  "sort_order",
  "status",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  'HOME_HERO',
  'iPhone taksit kampaniyası',
  '/?sort=price',
  '/images/hero/installment-banner.png',
  'image/png',
  131303,
  1,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "storefront_banners"
  WHERE "image_object_key" = '/images/hero/installment-banner.png'
);
