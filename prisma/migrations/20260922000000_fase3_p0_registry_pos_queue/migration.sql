-- P0: registry (sellers/suppliers/employees + ACL) — fila totem já usa pos_tickets.

CREATE TYPE "employee_role" AS ENUM ('admin', 'manager', 'operator', 'seller');

CREATE TYPE "access_area" AS ENUM (
  'totem',
  'pdv',
  'os',
  'erp_customers',
  'erp_stock',
  'erp_attrs',
  'erp_prices',
  'erp_payments',
  'erp_finance',
  'erp_sellers',
  'erp_suppliers',
  'erp_employees',
  'erp_audit',
  'erp_invoices',
  'erp_fiscal',
  'ecommerce',
  'erp_plan'
);

CREATE TABLE "sellers" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "document" TEXT NOT NULL DEFAULT '',
  "commission_percent" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "employee_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_sellers_store_name" ON "sellers"("store_id", "name");

ALTER TABLE "sellers"
  ADD CONSTRAINT "sellers_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "suppliers" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "trade_name" TEXT NOT NULL DEFAULT '',
  "document" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "city" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_suppliers_store_name" ON "suppliers"("store_id", "name");

ALTER TABLE "suppliers"
  ADD CONSTRAINT "suppliers_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "employees" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "document" TEXT NOT NULL DEFAULT '',
  "role" "employee_role" NOT NULL DEFAULT 'operator',
  "is_system_user" BOOLEAN NOT NULL DEFAULT false,
  "user_email" TEXT NOT NULL DEFAULT '',
  "access_areas" "access_area"[],
  "active" BOOLEAN NOT NULL DEFAULT true,
  "seller_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_employees_store_name" ON "employees"("store_id", "name");
CREATE INDEX "idx_employees_store_email" ON "employees"("store_id", "user_email");

ALTER TABLE "employees"
  ADD CONSTRAINT "employees_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
