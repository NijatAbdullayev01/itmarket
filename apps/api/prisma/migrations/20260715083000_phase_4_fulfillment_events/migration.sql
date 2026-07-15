-- CreateTable
CREATE TABLE "fulfillment_events" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_status" "OrderStatus" NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL,
    "fulfillment_status" "FulfillmentStatus" NOT NULL,
    "event_type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actor_staff_id" UUID,
    "payload" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fulfillment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fulfillment_events_order_id_created_at_idx" ON "fulfillment_events"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "fulfillment_events_event_type_created_at_idx" ON "fulfillment_events"("event_type", "created_at");

-- AddForeignKey
ALTER TABLE "fulfillment_events" ADD CONSTRAINT "fulfillment_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "fulfillment_events_immutable"
BEFORE UPDATE OR DELETE ON "fulfillment_events"
FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
