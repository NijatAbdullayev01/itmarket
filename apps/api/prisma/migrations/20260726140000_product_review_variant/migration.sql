-- Bind product reviews to the purchased variant (not the whole product).
ALTER TABLE "product_reviews" ADD COLUMN "variant_id" UUID;

UPDATE "product_reviews" AS pr
SET "variant_id" = oi."variant_id"
FROM "order_items" AS oi
WHERE oi."id" = pr."order_item_id";

ALTER TABLE "product_reviews" ALTER COLUMN "variant_id" SET NOT NULL;

CREATE INDEX "product_reviews_variant_id_published_created_at_idx"
  ON "product_reviews"("variant_id", "published", "created_at");

ALTER TABLE "product_reviews"
  ADD CONSTRAINT "product_reviews_variant_id_fkey"
  FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
