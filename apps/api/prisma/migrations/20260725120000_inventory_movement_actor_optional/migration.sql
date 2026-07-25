-- System/customer-driven stock movements (payment capture, customer cancel
-- return) have no staff actor; keep auditability without inventing a fake user.
ALTER TABLE "inventory_movements" ALTER COLUMN "actor_staff_id" DROP NOT NULL;
