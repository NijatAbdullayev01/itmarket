-- Empty strings are NOT NULL in PostgreSQL and were counted by the active
-- barcode partial unique index, blocking multiple variants without barcodes.
UPDATE "product_variants"
SET "barcode" = NULL
WHERE "barcode" IS NOT NULL AND btrim("barcode") = '';
