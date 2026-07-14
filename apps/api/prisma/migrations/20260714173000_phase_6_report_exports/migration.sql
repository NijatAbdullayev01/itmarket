CREATE TYPE "ReportExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TYPE "ReportExportType" AS ENUM ('SALES', 'LOW_STOCK', 'INVENTORY_MOVEMENTS');

CREATE TABLE "report_exports" (
  "id" UUID NOT NULL,
  "requested_by_staff_id" UUID NOT NULL,
  "report_type" "ReportExportType" NOT NULL,
  "status" "ReportExportStatus" NOT NULL DEFAULT 'PENDING',
  "file_name" TEXT NOT NULL,
  "content_type" TEXT NOT NULL DEFAULT 'text/csv',
  "filters" JSONB NOT NULL,
  "row_count" INTEGER,
  "content" TEXT,
  "error_message" TEXT,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "report_exports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "report_exports_requested_by_staff_id_created_at_idx"
  ON "report_exports"("requested_by_staff_id", "created_at");

CREATE INDEX "report_exports_status_created_at_idx"
  ON "report_exports"("status", "created_at");

CREATE INDEX "report_exports_report_type_created_at_idx"
  ON "report_exports"("report_type", "created_at");

ALTER TABLE "report_exports"
  ADD CONSTRAINT "report_exports_requested_by_staff_id_fkey"
  FOREIGN KEY ("requested_by_staff_id")
  REFERENCES "staff_users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
