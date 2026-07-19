ALTER TABLE "categories" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

WITH "ranked" AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "parent_id"
      ORDER BY "name" ASC
    ) - 1 AS "rn"
  FROM "categories"
)
UPDATE "categories"
SET "sort_order" = "ranked"."rn"
FROM "ranked"
WHERE "categories"."id" = "ranked"."id";

CREATE INDEX "categories_parent_id_sort_order_idx" ON "categories"("parent_id", "sort_order");
