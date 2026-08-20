-- Baku free delivery threshold: orders under 1500 AZN are paid; 1500+ are free.
UPDATE "delivery_zones"
SET "free_delivery_minimum" = 1500.00
WHERE "code" = 'BAKU';

