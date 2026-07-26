-- AlterTable
ALTER TABLE "categories" ADD COLUMN "description" TEXT;

-- AlterTable
ALTER TABLE "brands" ADD COLUMN "description" TEXT,
ADD COLUMN "seo_title" TEXT,
ADD COLUMN "seo_description" TEXT;
