-- AlterEnum
ALTER TYPE "InventoryMovementType" ADD VALUE 'SALE';

-- CreateEnum
CREATE TYPE "CashShiftStatus" AS ENUM ('OPEN', 'CLOSING', 'CLOSED');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('OPENING_FLOAT', 'CASH_IN', 'CASH_OUT', 'SALE');

-- CreateTable
CREATE TABLE "cash_registers" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location_id" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_shifts" (
    "id" UUID NOT NULL,
    "register_id" UUID NOT NULL,
    "staff_user_id" UUID NOT NULL,
    "opening_float" DECIMAL(18,2) NOT NULL,
    "expected_cash" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "counted_cash" DECIMAL(18,2),
    "discrepancy" DECIMAL(18,2),
    "status" "CashShiftStatus" NOT NULL DEFAULT 'OPEN',
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closing_started_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "actor_staff_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_sales" (
    "id" UUID NOT NULL,
    "sale_number" TEXT NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "shift_id" UUID NOT NULL,
    "register_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "staff_user_id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "discount_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AZN',
    "payment_method" "PaymentMethod" NOT NULL,
    "external_terminal_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_sale_items" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "product_name" TEXT NOT NULL,
    "variant_name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(18,2) NOT NULL,
    "discount_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AZN',
    "attributes_snapshot" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_payments" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AZN',
    "terminal_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_registers_code_key" ON "cash_registers"("code");

-- CreateIndex
CREATE INDEX "cash_registers_location_id_active_idx" ON "cash_registers"("location_id", "active");

-- CreateIndex
CREATE INDEX "cash_shifts_register_id_status_idx" ON "cash_shifts"("register_id", "status");

-- CreateIndex
CREATE INDEX "cash_shifts_staff_user_id_status_idx" ON "cash_shifts"("staff_user_id", "status");

-- CreateIndex
CREATE INDEX "cash_movements_shift_id_created_at_idx" ON "cash_movements"("shift_id", "created_at");

-- CreateIndex
CREATE INDEX "cash_movements_actor_staff_id_created_at_idx" ON "cash_movements"("actor_staff_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "pos_sales_sale_number_key" ON "pos_sales"("sale_number");

-- CreateIndex
CREATE UNIQUE INDEX "pos_sales_receipt_number_key" ON "pos_sales"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "pos_sales_shift_id_idempotency_key_key" ON "pos_sales"("shift_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "pos_sales_register_id_created_at_idx" ON "pos_sales"("register_id", "created_at");

-- CreateIndex
CREATE INDEX "pos_sales_location_id_created_at_idx" ON "pos_sales"("location_id", "created_at");

-- CreateIndex
CREATE INDEX "pos_sales_staff_user_id_created_at_idx" ON "pos_sales"("staff_user_id", "created_at");

-- CreateIndex
CREATE INDEX "pos_sale_items_sale_id_idx" ON "pos_sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "pos_sale_items_variant_id_idx" ON "pos_sale_items"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "pos_payments_sale_id_key" ON "pos_payments"("sale_id");

-- CreateIndex
CREATE INDEX "pos_payments_method_created_at_idx" ON "pos_payments"("method", "created_at");

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "cash_registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "cash_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_actor_staff_id_fkey" FOREIGN KEY ("actor_staff_id") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "cash_shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "cash_registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sale_items" ADD CONSTRAINT "pos_sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "pos_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sale_items" ADD CONSTRAINT "pos_sale_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_payments" ADD CONSTRAINT "pos_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "pos_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Domain constraints.
ALTER TABLE "cash_shifts"
  ADD CONSTRAINT "cash_shifts_opening_float_check" CHECK ("opening_float" >= 0),
  ADD CONSTRAINT "cash_shifts_expected_cash_check" CHECK ("expected_cash" >= 0),
  ADD CONSTRAINT "cash_shifts_counted_cash_check" CHECK ("counted_cash" IS NULL OR "counted_cash" >= 0);

ALTER TABLE "cash_movements"
  ADD CONSTRAINT "cash_movements_amount_check" CHECK ("amount" > 0);

ALTER TABLE "pos_sales"
  ADD CONSTRAINT "pos_sales_currency_check" CHECK ("currency" = 'AZN'),
  ADD CONSTRAINT "pos_sales_subtotal_check" CHECK ("subtotal" >= 0),
  ADD CONSTRAINT "pos_sales_discount_total_check" CHECK ("discount_total" >= 0),
  ADD CONSTRAINT "pos_sales_tax_total_check" CHECK ("tax_total" >= 0),
  ADD CONSTRAINT "pos_sales_grand_total_check" CHECK ("grand_total" >= 0),
  ADD CONSTRAINT "pos_sales_totals_consistency_check" CHECK ("grand_total" = ("subtotal" - "discount_total" + "tax_total"));

ALTER TABLE "pos_sale_items"
  ADD CONSTRAINT "pos_sale_items_quantity_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "pos_sale_items_currency_check" CHECK ("currency" = 'AZN'),
  ADD CONSTRAINT "pos_sale_items_unit_price_check" CHECK ("unit_price" >= 0),
  ADD CONSTRAINT "pos_sale_items_discount_total_check" CHECK ("discount_total" >= 0),
  ADD CONSTRAINT "pos_sale_items_tax_total_check" CHECK ("tax_total" >= 0),
  ADD CONSTRAINT "pos_sale_items_line_total_check" CHECK ("line_total" >= 0);

ALTER TABLE "pos_payments"
  ADD CONSTRAINT "pos_payments_currency_check" CHECK ("currency" = 'AZN'),
  ADD CONSTRAINT "pos_payments_amount_check" CHECK ("amount" >= 0);

CREATE TRIGGER "cash_movements_immutable"
BEFORE UPDATE OR DELETE ON "cash_movements"
FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();

CREATE TRIGGER "pos_sales_immutable"
BEFORE UPDATE OR DELETE ON "pos_sales"
FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();

CREATE TRIGGER "pos_sale_items_immutable"
BEFORE UPDATE OR DELETE ON "pos_sale_items"
FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();

CREATE TRIGGER "pos_payments_immutable"
BEFORE UPDATE OR DELETE ON "pos_payments"
FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
