-- Fase 2: drift Customer/Stock/SalesOrder/WorkOrder/Totem + filhos OS.
-- Fotos e assinatura em TEXT (data URL JPEG/PNG, MVP). Limite de tamanho no DTO.

CREATE TYPE "quote_status" AS ENUM ('none', 'draft', 'sent', 'approved', 'rejected');
CREATE TYPE "work_order_photo_kind" AS ENUM ('entry', 'exit', 'other');
CREATE TYPE "checklist_mark" AS ENUM ('unchecked', 'ok', 'fail', 'na');

ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "zip_code" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "street" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "number" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "complement" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "neighborhood" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "state" VARCHAR(2) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "idx_customers_store_name" ON "customers"("store_id", "name");

ALTER TABLE "totem_settings"
  ADD COLUMN IF NOT EXISTS "exit_password" TEXT NOT NULL DEFAULT 'cellponto',
  ADD COLUMN IF NOT EXISTS "share_stock_with_erp" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "stock_items"
  ADD COLUMN IF NOT EXISTS "color" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "capacity" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "show_on_totem" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "supplier_id" TEXT,
  ADD COLUMN IF NOT EXISTS "fiscal_classification_id" TEXT,
  ADD COLUMN IF NOT EXISTS "warehouse_id" TEXT,
  ADD COLUMN IF NOT EXISTS "track_lot" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_kit" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "idx_stock_barcode" ON "stock_items"("store_id", "barcode");

CREATE TABLE IF NOT EXISTS "stock_item_images" (
  "id" TEXT NOT NULL,
  "stock_id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "sort" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "stock_item_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_stock_images_stock" ON "stock_item_images"("stock_id");

DO $$ BEGIN
  ALTER TABLE "stock_item_images"
    ADD CONSTRAINT "stock_item_images_stock_id_fkey"
    FOREIGN KEY ("stock_id") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "sales_orders"
  ADD COLUMN IF NOT EXISTS "customer_document" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "seller_id" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "seller_name" TEXT NOT NULL DEFAULT '';

ALTER TABLE "work_orders"
  ADD COLUMN IF NOT EXISTS "customer_document" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "customer_email" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "item_brand" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "item_model" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "item_color" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "device_password" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "accessories" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "condition_on_entry" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "diagnosis" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "estimated_ready_at" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "seller_id" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "parts" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "quote_status" "quote_status" NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "quote_notes" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "quote_valid_until" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "quote_sent_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "quote_decided_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "customer_signature" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "customer_signed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "customer_signed_name" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "progress_started_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "idx_os_store_technician" ON "work_orders"("store_id", "technician");

CREATE TABLE IF NOT EXISTS "work_order_photos" (
  "id" TEXT NOT NULL,
  "work_order_id" TEXT NOT NULL,
  "kind" "work_order_photo_kind" NOT NULL,
  "data_url" TEXT NOT NULL,
  "caption" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_os_photos_order" ON "work_order_photos"("work_order_id");

DO $$ BEGIN
  ALTER TABLE "work_order_photos"
    ADD CONSTRAINT "work_order_photos_work_order_id_fkey"
    FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "work_order_checklist_items" (
  "id" TEXT NOT NULL,
  "work_order_id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "mark" "checklist_mark" NOT NULL DEFAULT 'unchecked',
  "note" TEXT NOT NULL DEFAULT '',
  "sort" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "work_order_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_os_checklist_order" ON "work_order_checklist_items"("work_order_id");

DO $$ BEGIN
  ALTER TABLE "work_order_checklist_items"
    ADD CONSTRAINT "work_order_checklist_items_work_order_id_fkey"
    FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_attributes_store" ON "product_attributes"("store_id");
