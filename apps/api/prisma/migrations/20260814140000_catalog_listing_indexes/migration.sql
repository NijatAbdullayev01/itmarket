-- CreateIndex
CREATE INDEX "products_status_created_at_idx" ON "products"("status", "created_at");

-- CreateIndex
CREATE INDEX "product_variants_status_price_idx" ON "product_variants"("status", "price");
