-- Restore default homepage hero banners if they were archived.
UPDATE "storefront_banners"
SET
  "status" = 'ACTIVE',
  "placement" = 'HOME_HERO',
  "updated_at" = CURRENT_TIMESTAMP
WHERE "image_object_key" IN (
  '/images/hero/tech-banner.png',
  '/images/hero/installment-banner.png'
)
AND "status" = 'ARCHIVED';
