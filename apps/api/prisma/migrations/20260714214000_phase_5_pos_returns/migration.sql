-- AlterEnum
ALTER TYPE "InventoryMovementType" ADD VALUE 'RETURN';

-- AlterEnum
ALTER TYPE "CashMovementType" ADD VALUE 'REFUND';

-- CreateTable
CREATE TABLE "pos_returns" (
    "id" UUID NOT NULL,
    "return_number" TEXT NOT NULL,
    "sale_id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "staff_user_id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "refund_amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AZN',
    "external_terminal_reference" TEXT,
    "restocked_to_inventory" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_return_items" (
    "id" UUID NOT NULL,
    "return_id" UUID NOT NULL,
    "sale_item_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(18,2) NOT NULL,
    "line_total" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AZN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pos_returns_return_number_key" ON "pos_returns"("return_number");

-- CreateIndex
CREATE UNIQUE INDEX "pos_returns_shift_id_idempotency_key_key" ON "pos_returns"("shift_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "pos_returns_sale_id_created_at_idx" ON "pos_returns"("sale_id", "created_at");

-- CreateIndex
CREATE INDEX "pos_returns_shift_id_created_at_idx" ON "pos_returns"("shift_id", "created_at");

-- CreateIndex
CREATE INDEX "pos_returns_staff_user_id_created_at_idx" ON "pos_returns"("staff_user_id", "created_at");

-- CreateIndex
CREATE INDEX "pos_return_items_return_id_idx" ON "pos_return_items"("return_id");

-- CreateIndex
CREATE INDEX "pos_return_items_sale_item_id_idx" ON "pos_return_items"("sale_item_id");

-- CreateIndex
CREATE INDEX "pos_return_items_variant_id_idx" ON "pos_return_items"("variant_id");

-- AddForeignKey
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "pos_sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "cash_shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_return_items" ADD CONSTRAINT "pos_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "pos_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_return_items" ADD CONSTRAINT "pos_return_items_sale_item_id_fkey" FOREIGN KEY ("sale_item_id") REFERENCES "pos_sale_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_return_items" ADD CONSTRAINT "pos_return_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain constraints.
ALTER TABLE "pos_returns"
  ADD CONSTRAINT "pos_returns_currency_check" CHECK ("currency" = 'AZN'),
  ADD CONSTRAINT "pos_returns_refund_amount_check" CHECK ("refund_amount" >= 0);

ALTER TABLE "pos_return_items"
  ADD CONSTRAINT "pos_return_items_quantity_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "pos_return_items_currency_check" CHECK ("currency" = 'AZN'),
  ADD CONSTRAINT "pos_return_items_unit_price_check" CHECK ("unit_price" >= 0),
  ADD CONSTRAINT "pos_return_items_line_total_check" CHECK ("line_total" >= 0);

CREATE TRIGGER "pos_returns_immutable"
BEFORE UPDATE OR DELETE ON "pos_returns"
FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();

CREATE TRIGGER "pos_return_items_immutable"
BEFORE UPDATE OR DELETE ON "pos_return_items"
FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
