-- Baku free delivery threshold: orders under 500 AZN are paid; 500+ are free.
UPDATE "delivery_zones"
SET "free_delivery_minimum" = 500.00
WHERE "code" = 'BAKU';
