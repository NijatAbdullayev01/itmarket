-- Baku standard delivery fee: 10 AZN (paid when order is below free threshold).
UPDATE "delivery_zones"
SET "fee" = 10.00
WHERE "code" = 'BAKU';
