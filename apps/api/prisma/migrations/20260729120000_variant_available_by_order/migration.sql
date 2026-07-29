-- Staff-controlled "Sifarişlə" CTA for out-of-stock variants.
ALTER TABLE "product_variants" ADD COLUMN "available_by_order" BOOLEAN NOT NULL DEFAULT false;
