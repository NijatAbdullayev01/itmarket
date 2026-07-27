-- AlterTable: new reviews stay unpublished until staff moderation
ALTER TABLE "product_reviews" ALTER COLUMN "published" SET DEFAULT false;
