-- P1: finance-book + warehouses/lots/kits/moves + stock invoices.

CREATE TYPE "bank_account_type" AS ENUM ('checking', 'savings', 'cash', 'digital');

CREATE TYPE "bill_status" AS ENUM ('open', 'partial', 'paid', 'cancelled');

CREATE TYPE "treasury_kind" AS ENUM ('transfer', 'deposit', 'withdraw', 'adjustment');

CREATE TYPE "advance_kind" AS ENUM ('customer', 'supplier');

CREATE TYPE "advance_status" AS ENUM ('open', 'applied', 'refunded');

CREATE TYPE "warehouse_move_kind" AS ENUM ('in', 'out', 'transfer', 'adjust');

CREATE TYPE "stock_invoice_kind" AS ENUM ('entry', 'exit');

CREATE TYPE "stock_invoice_status" AS ENUM ('draft', 'posted', 'cancelled');

CREATE TYPE "fiscal_doc_purpose" AS ENUM ('normal', 'devolucao', 'credito_reforma', 'debito_reforma');

CREATE TABLE "bank_accounts" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "bank" TEXT NOT NULL DEFAULT '',
  "agency" TEXT NOT NULL DEFAULT '',
  "number" TEXT NOT NULL DEFAULT '',
  "type" "bank_account_type" NOT NULL,
  "initial_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_bank_accounts_store" ON "bank_accounts"("store_id", "active");

ALTER TABLE "bank_accounts"
  ADD CONSTRAINT "bank_accounts_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "payables" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "supplier_id" TEXT,
  "supplier_name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "due_date" VARCHAR(10) NOT NULL,
  "status" "bill_status" NOT NULL DEFAULT 'open',
  "account_id" TEXT NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "paid_at" TIMESTAMP(3),
  CONSTRAINT "payables_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_payables_store_status" ON "payables"("store_id", "status");
CREATE INDEX "idx_payables_due" ON "payables"("store_id", "due_date");

ALTER TABLE "payables"
  ADD CONSTRAINT "payables_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payables"
  ADD CONSTRAINT "payables_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "receivables" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "customer_name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "received_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "due_date" VARCHAR(10) NOT NULL,
  "status" "bill_status" NOT NULL DEFAULT 'open',
  "account_id" TEXT NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "received_at" TIMESTAMP(3),
  CONSTRAINT "receivables_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_receivables_store_status" ON "receivables"("store_id", "status");
CREATE INDEX "idx_receivables_due" ON "receivables"("store_id", "due_date");

ALTER TABLE "receivables"
  ADD CONSTRAINT "receivables_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "receivables"
  ADD CONSTRAINT "receivables_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "treasury_moves" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "kind" "treasury_kind" NOT NULL,
  "from_account_id" TEXT NOT NULL DEFAULT '',
  "to_account_id" TEXT NOT NULL DEFAULT '',
  "amount" DECIMAL(12,2) NOT NULL,
  "description" TEXT NOT NULL,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "treasury_moves_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_treasury_store_at" ON "treasury_moves"("store_id", "at" DESC);

ALTER TABLE "treasury_moves"
  ADD CONSTRAINT "treasury_moves_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "advance_payments" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "kind" "advance_kind" NOT NULL,
  "party_name" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "used_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "account_id" TEXT NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "status" "advance_status" NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "advance_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_advances_store_status" ON "advance_payments"("store_id", "status");

ALTER TABLE "advance_payments"
  ADD CONSTRAINT "advance_payments_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "advance_payments"
  ADD CONSTRAINT "advance_payments_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "warehouses" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "address" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_warehouses_store_code" ON "warehouses"("store_id", "code");
CREATE INDEX "idx_warehouses_store" ON "warehouses"("store_id", "active");

ALTER TABLE "warehouses"
  ADD CONSTRAINT "warehouses_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_items"
  ADD CONSTRAINT "stock_items_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "product_lots" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "stock_id" TEXT NOT NULL,
  "stock_name" TEXT NOT NULL,
  "lot_number" TEXT NOT NULL,
  "manufacturing_date" TEXT NOT NULL DEFAULT '',
  "expiry_date" TEXT NOT NULL DEFAULT '',
  "qty" INTEGER NOT NULL,
  "supplier_id" TEXT,
  "supplier_name" TEXT NOT NULL DEFAULT '',
  "warehouse_id" TEXT NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_lots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_lots_store_stock" ON "product_lots"("store_id", "stock_id");

ALTER TABLE "product_lots"
  ADD CONSTRAINT "product_lots_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_lots"
  ADD CONSTRAINT "product_lots_stock_id_fkey"
  FOREIGN KEY ("stock_id") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_lots"
  ADD CONSTRAINT "product_lots_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "product_kits" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT NOT NULL DEFAULT '',
  "parent_stock_id" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_kits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_kits_store" ON "product_kits"("store_id", "active");

ALTER TABLE "product_kits"
  ADD CONSTRAINT "product_kits_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_kits"
  ADD CONSTRAINT "product_kits_parent_stock_id_fkey"
  FOREIGN KEY ("parent_stock_id") REFERENCES "stock_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "product_kit_items" (
  "id" TEXT NOT NULL,
  "kit_id" TEXT NOT NULL,
  "stock_id" TEXT NOT NULL,
  "stock_name" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  CONSTRAINT "product_kit_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_kit_item" ON "product_kit_items"("kit_id", "stock_id");

ALTER TABLE "product_kit_items"
  ADD CONSTRAINT "product_kit_items_kit_id_fkey"
  FOREIGN KEY ("kit_id") REFERENCES "product_kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_kit_items"
  ADD CONSTRAINT "product_kit_items_stock_id_fkey"
  FOREIGN KEY ("stock_id") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "warehouse_moves" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "kind" "warehouse_move_kind" NOT NULL,
  "stock_id" TEXT NOT NULL,
  "stock_name" TEXT NOT NULL,
  "from_warehouse_id" TEXT,
  "to_warehouse_id" TEXT,
  "lot_id" TEXT,
  "qty" INTEGER NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "operator_name" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "warehouse_moves_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_wh_moves_store" ON "warehouse_moves"("store_id", "created_at" DESC);

ALTER TABLE "warehouse_moves"
  ADD CONSTRAINT "warehouse_moves_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "warehouse_moves"
  ADD CONSTRAINT "warehouse_moves_stock_id_fkey"
  FOREIGN KEY ("stock_id") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "warehouse_moves"
  ADD CONSTRAINT "warehouse_moves_from_warehouse_id_fkey"
  FOREIGN KEY ("from_warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "warehouse_moves"
  ADD CONSTRAINT "warehouse_moves_to_warehouse_id_fkey"
  FOREIGN KEY ("to_warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "warehouse_moves"
  ADD CONSTRAINT "warehouse_moves_lot_id_fkey"
  FOREIGN KEY ("lot_id") REFERENCES "product_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "stock_invoices" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "kind" "stock_invoice_kind" NOT NULL,
  "number" TEXT NOT NULL,
  "status" "stock_invoice_status" NOT NULL DEFAULT 'draft',
  "document_purpose" "fiscal_doc_purpose" NOT NULL DEFAULT 'normal',
  "supplier_id" TEXT,
  "customer_name" TEXT NOT NULL DEFAULT '',
  "issued_at" VARCHAR(10) NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "posted_at" TIMESTAMP(3),
  CONSTRAINT "stock_invoices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_stock_invoices_store" ON "stock_invoices"("store_id", "kind", "status");

ALTER TABLE "stock_invoices"
  ADD CONSTRAINT "stock_invoices_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "stock_invoice_lines" (
  "id" TEXT NOT NULL,
  "invoice_id" TEXT NOT NULL,
  "stock_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "unit_cost" DECIMAL(12,2) NOT NULL,
  "unit_price" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "stock_invoice_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_stock_invoice_lines" ON "stock_invoice_lines"("invoice_id");

ALTER TABLE "stock_invoice_lines"
  ADD CONSTRAINT "stock_invoice_lines_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "stock_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_invoice_lines"
  ADD CONSTRAINT "stock_invoice_lines_stock_id_fkey"
  FOREIGN KEY ("stock_id") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
