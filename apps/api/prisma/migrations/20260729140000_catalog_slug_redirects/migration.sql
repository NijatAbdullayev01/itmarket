-- CreateEnum
CREATE TYPE "CatalogSlugEntityType" AS ENUM ('PRODUCT', 'CATEGORY', 'BRAND');

-- CreateTable
CREATE TABLE "catalog_slug_redirects" (
    "id" UUID NOT NULL,
    "entity_type" "CatalogSlugEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "old_slug" TEXT NOT NULL,
    "new_slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_slug_redirects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_slug_redirects_entity_type_old_slug_key" ON "catalog_slug_redirects"("entity_type", "old_slug");

-- CreateIndex
CREATE INDEX "catalog_slug_redirects_entity_type_new_slug_idx" ON "catalog_slug_redirects"("entity_type", "new_slug");

-- CreateIndex
CREATE INDEX "catalog_slug_redirects_entity_id_idx" ON "catalog_slug_redirects"("entity_id");
