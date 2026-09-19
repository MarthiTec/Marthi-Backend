-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "plan_id" AS ENUM ('start', 'growth', 'scale');

-- CreateEnum
CREATE TYPE "module_id" AS ENUM ('totem', 'presales', 'os', 'erp');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('cnpj', 'cpf');

-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('google', 'password');

-- CreateEnum
CREATE TYPE "product_status" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "stock_kind" AS ENUM ('part', 'device', 'supply');

-- CreateEnum
CREATE TYPE "stock_condition" AS ENUM ('new', 'used', 'refurbished');

-- CreateEnum
CREATE TYPE "payment_type" AS ENUM ('cash', 'pix', 'debit', 'credit', 'other');

-- CreateEnum
CREATE TYPE "ticket_source" AS ENUM ('totem', 'manual');

-- CreateEnum
CREATE TYPE "ticket_status" AS ENUM ('open', 'sold', 'cancelled');

-- CreateEnum
CREATE TYPE "finance_type" AS ENUM ('in', 'out');

-- CreateEnum
CREATE TYPE "finance_source" AS ENUM ('manual', 'pos', 'os_part', 'os_purchase', 'os_revenue', 'os_reversal');

-- CreateEnum
CREATE TYPE "os_status" AS ENUM ('open', 'diagnosis', 'waiting', 'progress', 'ready', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "os_priority" AS ENUM ('low', 'normal', 'high');

-- CreateEnum
CREATE TYPE "asset_disposition" AS ENUM ('customer', 'purchased', 'scrapped');

-- CreateEnum
CREATE TYPE "os_line_kind" AS ENUM ('part', 'labor');

-- CreateEnum
CREATE TYPE "totem_mode" AS ENUM ('kiosk', 'catalog');

-- CreateEnum
CREATE TYPE "signup_status" AS ENUM ('pending', 'contacted', 'converted');

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "trade_name" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "document_type" "document_type" NOT NULL,
    "document" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "zip_code" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT NOT NULL DEFAULT '',
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" CHAR(2) NOT NULL,
    "segment" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "picture" TEXT,
    "provider" "auth_provider" NOT NULL,
    "password_hash" TEXT,
    "google_sub" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operator_profiles" (
    "user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Operador',
    "photo" TEXT,

    CONSTRAINT "operator_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "store_entitlements" (
    "store_id" TEXT NOT NULL,
    "plan" "plan_id" NOT NULL,
    "modules" "module_id"[],

    CONSTRAINT "store_entitlements_pkey" PRIMARY KEY ("store_id")
);

-- CreateTable
CREATE TABLE "totem_settings" (
    "store_id" TEXT NOT NULL,
    "mode" "totem_mode" NOT NULL DEFAULT 'kiosk',

    CONSTRAINT "totem_settings_pkey" PRIMARY KEY ("store_id")
);

-- CreateTable
CREATE TABLE "partner_signups" (
    "id" TEXT NOT NULL,
    "plan" "plan_id" NOT NULL,
    "modules" "module_id"[],
    "document_type" "document_type" NOT NULL,
    "document" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "zip_code" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT NOT NULL DEFAULT '',
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" CHAR(2) NOT NULL,
    "segment" TEXT NOT NULL DEFAULT '',
    "contact_name" TEXT NOT NULL,
    "contact_role" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "status" "signup_status" NOT NULL DEFAULT 'pending',
    "converted_store_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_signups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "brand_id" TEXT,
    "name" TEXT NOT NULL,
    "status" "product_status" NOT NULL DEFAULT 'active',
    "reference" TEXT,
    "cash_price" DECIMAL(12,2) NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attributes" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "use_on_totem" BOOLEAN NOT NULL DEFAULT true,
    "filter_on_totem" BOOLEAN NOT NULL DEFAULT false,
    "use_on_stock" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attribute_values" (
    "id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "price_delta" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_allowed_values" (
    "product_id" TEXT NOT NULL,
    "value_id" TEXT NOT NULL,

    CONSTRAINT "product_allowed_values_pkey" PRIMARY KEY ("product_id","value_id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phone_digits" TEXT NOT NULL,
    "document" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL DEFAULT '',
    "item_name" TEXT NOT NULL,
    "item_ref" TEXT NOT NULL DEFAULT '',
    "defect" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "technician" TEXT NOT NULL DEFAULT '',
    "priority" "os_priority" NOT NULL DEFAULT 'normal',
    "status" "os_status" NOT NULL DEFAULT 'open',
    "labor" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "asset_disposition" "asset_disposition" NOT NULL DEFAULT 'customer',
    "purchase_cost" DECIMAL(12,2),
    "purchase_at" TIMESTAMP(3),
    "purchase_stock_id" TEXT,
    "purchase_finance_id" TEXT,
    "revenue_finance_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_items" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "product_id" TEXT,
    "source_work_order_id" TEXT,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL DEFAULT '',
    "barcode" TEXT NOT NULL DEFAULT '',
    "imei" TEXT NOT NULL DEFAULT '',
    "qty" INTEGER NOT NULL DEFAULT 0,
    "min_qty" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "kind" "stock_kind" NOT NULL,
    "condition" "stock_condition" NOT NULL DEFAULT 'new',

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_item_attributes" (
    "stock_id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "stock_item_attributes_pkey" PRIMARY KEY ("stock_id","attribute_id")
);

-- CreateTable
CREATE TABLE "price_tables" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "percent" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "price_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "payment_type" NOT NULL,
    "price_table_id" TEXT NOT NULL,
    "max_installments" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_tickets" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "source" "ticket_source" NOT NULL,
    "status" "ticket_status" NOT NULL DEFAULT 'open',
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '',
    "storage" TEXT NOT NULL DEFAULT '',
    "fulfillment" TEXT NOT NULL DEFAULT '',
    "payment" TEXT NOT NULL,
    "installment" TEXT,
    "price_label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "pos_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_ticket_attributes" (
    "ticket_id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "pos_ticket_attributes_pkey" PRIMARY KEY ("ticket_id","attribute_id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "ticket_id" TEXT,
    "customer_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL DEFAULT '',
    "product_name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "surcharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "ticket_status" NOT NULL,
    "payment" TEXT NOT NULL,
    "payment_method_id" TEXT,
    "price_table_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_lines" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "stock_id" TEXT,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "imei" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "sales_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_entries" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "type" "finance_type" NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "source" "finance_source" NOT NULL DEFAULT 'manual',
    "ref_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_lines" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "stock_id" TEXT,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_cost" DECIMAL(12,2) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "kind" "os_line_kind" NOT NULL,
    "finance_id" TEXT,

    CONSTRAINT "work_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_attribute_values_attribute_id_value_key" ON "product_attribute_values"("attribute_id", "value");

-- CreateIndex
CREATE INDEX "idx_customers_store_phone" ON "customers"("store_id", "phone_digits");

-- CreateIndex
CREATE UNIQUE INDEX "customers_store_id_phone_digits_key" ON "customers"("store_id", "phone_digits");

-- CreateIndex
CREATE INDEX "idx_os_store_status" ON "work_orders"("store_id", "status");

-- CreateIndex
CREATE INDEX "idx_stock_store_name" ON "stock_items"("store_id", "name");

-- CreateIndex
CREATE INDEX "idx_stock_sku" ON "stock_items"("store_id", "sku");

-- CreateIndex
CREATE INDEX "idx_tickets_store_status" ON "pos_tickets"("store_id", "status");

-- CreateIndex
CREATE INDEX "idx_orders_store_created" ON "sales_orders"("store_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_finance_store_created" ON "finance_entries"("store_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_profiles" ADD CONSTRAINT "operator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_entitlements" ADD CONSTRAINT "store_entitlements_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "totem_settings" ADD CONSTRAINT "totem_settings_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_signups" ADD CONSTRAINT "partner_signups_converted_store_id_fkey" FOREIGN KEY ("converted_store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "product_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_allowed_values" ADD CONSTRAINT "product_allowed_values_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_allowed_values" ADD CONSTRAINT "product_allowed_values_value_id_fkey" FOREIGN KEY ("value_id") REFERENCES "product_attribute_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_purchase_stock_id_fkey" FOREIGN KEY ("purchase_stock_id") REFERENCES "stock_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_purchase_finance_id_fkey" FOREIGN KEY ("purchase_finance_id") REFERENCES "finance_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_revenue_finance_id_fkey" FOREIGN KEY ("revenue_finance_id") REFERENCES "finance_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_source_work_order_id_fkey" FOREIGN KEY ("source_work_order_id") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_item_attributes" ADD CONSTRAINT "stock_item_attributes_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_item_attributes" ADD CONSTRAINT "stock_item_attributes_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "product_attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_tables" ADD CONSTRAINT "price_tables_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_price_table_id_fkey" FOREIGN KEY ("price_table_id") REFERENCES "price_tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_tickets" ADD CONSTRAINT "pos_tickets_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_ticket_attributes" ADD CONSTRAINT "pos_ticket_attributes_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "pos_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "pos_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_price_table_id_fkey" FOREIGN KEY ("price_table_id") REFERENCES "price_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stock_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_lines" ADD CONSTRAINT "work_order_lines_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_lines" ADD CONSTRAINT "work_order_lines_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stock_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_lines" ADD CONSTRAINT "work_order_lines_finance_id_fkey" FOREIGN KEY ("finance_id") REFERENCES "finance_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_max_installments_check" CHECK ("max_installments" >= 1);
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_qty_check" CHECK ("qty" > 0);
ALTER TABLE "work_order_lines" ADD CONSTRAINT "work_order_lines_qty_check" CHECK ("qty" > 0);
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_amount_check" CHECK ("amount" >= 0);

