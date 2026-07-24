-- CreateTable
CREATE TABLE "storefront_banners" (
    "id" UUID NOT NULL,
    "alt_text" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "image_object_key" TEXT NOT NULL,
    "image_mime_type" TEXT NOT NULL,
    "image_byte_size" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storefront_banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "storefront_banners_status_sort_order_idx" ON "storefront_banners"("status", "sort_order");
