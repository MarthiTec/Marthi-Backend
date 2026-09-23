-- P3: CRM MVP + ecommerce channel/listing/order stubs (sem OAuth / sem pedidos fake).

CREATE TYPE "crm_stage" AS ENUM ('leads', 'waiting', 'attending', 'payment', 'won', 'lost');

CREATE TYPE "crm_lead_source" AS ENUM ('demo', 'partner', 'contact', 'manual', 'careers');

CREATE TYPE "crm_activity_kind" AS ENUM ('activity', 'comment', 'message', 'schedule', 'task', 'system');

CREATE TYPE "crm_message_kind" AS ENUM ('lead', 'sellers');

CREATE TYPE "ecommerce_channel_id" AS ENUM ('mercadolivre', 'shopee', 'ifood', 'amazon', 'tray');

CREATE TYPE "ecommerce_channel_kind" AS ENUM ('marketplace', 'hub');

CREATE TYPE "ecommerce_connection_status" AS ENUM ('disconnected', 'connecting', 'connected', 'error');

CREATE TYPE "ecommerce_listing_status" AS ENUM ('active', 'paused', 'error', 'draft');

CREATE TYPE "ecommerce_order_status" AS ENUM ('new', 'paid', 'shipped', 'delivered', 'cancelled');

CREATE TABLE "crm_leads" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL DEFAULT '',
  "whatsapp" TEXT NOT NULL DEFAULT '',
  "source" "crm_lead_source" NOT NULL,
  "interest" TEXT NOT NULL DEFAULT '',
  "value" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "stage" "crm_stage" NOT NULL DEFAULT 'leads',
  "owner_seller_id" TEXT,
  "owner_name" TEXT NOT NULL DEFAULT '',
  "claimed_at" TIMESTAMP(3),
  "notes" TEXT NOT NULL DEFAULT '',
  "external_ref" TEXT,
  "customer_id" TEXT,
  "paid_at" TIMESTAMP(3),
  "graduation" TEXT NOT NULL DEFAULT '',
  "polo" TEXT NOT NULL DEFAULT '',
  "source_info" TEXT NOT NULL DEFAULT '',
  "hide_contact" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "crm_leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_crm_leads_store_stage" ON "crm_leads"("store_id", "stage");
CREATE INDEX "idx_crm_leads_owner" ON "crm_leads"("store_id", "owner_seller_id");

ALTER TABLE "crm_leads"
  ADD CONSTRAINT "crm_leads_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "crm_activities" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "kind" "crm_activity_kind" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "from_seller_id" TEXT,
  "from_name" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "due_at" TIMESTAMP(3),
  CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_crm_activities_lead" ON "crm_activities"("lead_id", "created_at" DESC);

ALTER TABLE "crm_activities"
  ADD CONSTRAINT "crm_activities_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "crm_messages" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "kind" "crm_message_kind" NOT NULL,
  "lead_id" TEXT,
  "seller_pair_key" TEXT,
  "from_seller_id" TEXT,
  "from_name" TEXT NOT NULL DEFAULT '',
  "from_lead" BOOLEAN NOT NULL DEFAULT false,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "crm_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_crm_messages_store" ON "crm_messages"("store_id", "kind", "created_at");
CREATE INDEX "idx_crm_messages_lead" ON "crm_messages"("lead_id", "created_at");
CREATE INDEX "idx_crm_messages_pair" ON "crm_messages"("seller_pair_key", "created_at");

ALTER TABLE "crm_messages"
  ADD CONSTRAINT "crm_messages_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "crm_messages"
  ADD CONSTRAINT "crm_messages_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "crm_seller_profiles" (
  "seller_id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "handle" TEXT NOT NULL,
  "bio" TEXT NOT NULL DEFAULT '',
  "avatar_url" TEXT NOT NULL DEFAULT '',
  "cover_url" TEXT NOT NULL DEFAULT '',
  "city" TEXT NOT NULL DEFAULT '',
  "specialty" TEXT NOT NULL DEFAULT 'Comercial',
  "whatsapp" TEXT NOT NULL DEFAULT '',
  "instagram" TEXT NOT NULL DEFAULT '',
  "linkedin" TEXT NOT NULL DEFAULT '',
  "website" TEXT NOT NULL DEFAULT '',
  "public_profile" BOOLEAN NOT NULL DEFAULT true,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "crm_seller_profiles_pkey" PRIMARY KEY ("seller_id")
);

CREATE UNIQUE INDEX "uq_crm_profiles_handle" ON "crm_seller_profiles"("store_id", "handle");

ALTER TABLE "crm_seller_profiles"
  ADD CONSTRAINT "crm_seller_profiles_seller_id_fkey"
  FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_seller_profiles"
  ADD CONSTRAINT "crm_seller_profiles_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ecommerce_channel_states" (
  "store_id" TEXT NOT NULL,
  "channel_id" "ecommerce_channel_id" NOT NULL,
  "kind" "ecommerce_channel_kind" NOT NULL DEFAULT 'marketplace',
  "status" "ecommerce_connection_status" NOT NULL DEFAULT 'disconnected',
  "store_name" TEXT NOT NULL DEFAULT '',
  "last_sync_at" TIMESTAMP(3),
  "message" TEXT NOT NULL DEFAULT '',
  "credentials_enc" TEXT NOT NULL DEFAULT '',
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ecommerce_channel_states_pkey" PRIMARY KEY ("store_id", "channel_id")
);

ALTER TABLE "ecommerce_channel_states"
  ADD CONSTRAINT "ecommerce_channel_states_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ecommerce_listings" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "channel_id" "ecommerce_channel_id" NOT NULL,
  "stock_id" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sku" TEXT NOT NULL DEFAULT '',
  "price" DECIMAL(12,2) NOT NULL,
  "qty" INTEGER NOT NULL,
  "images" TEXT[],
  "status" "ecommerce_listing_status" NOT NULL DEFAULT 'draft',
  "synced_at" TIMESTAMP(3),
  "message" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ecommerce_listings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_ecom_listings_channel" ON "ecommerce_listings"("store_id", "channel_id");

ALTER TABLE "ecommerce_listings"
  ADD CONSTRAINT "ecommerce_listings_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ecommerce_listings"
  ADD CONSTRAINT "ecommerce_listings_channel_fkey"
  FOREIGN KEY ("store_id", "channel_id") REFERENCES "ecommerce_channel_states"("store_id", "channel_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ecommerce_listings"
  ADD CONSTRAINT "ecommerce_listings_stock_id_fkey"
  FOREIGN KEY ("stock_id") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ecommerce_orders" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "channel_id" "ecommerce_channel_id" NOT NULL,
  "external_id" TEXT NOT NULL,
  "customer_name" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "status" "ecommerce_order_status" NOT NULL DEFAULT 'new',
  "stock_id" TEXT,
  "listing_id" TEXT,
  "qty" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ecommerce_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_ecom_orders_channel" ON "ecommerce_orders"("store_id", "channel_id");

ALTER TABLE "ecommerce_orders"
  ADD CONSTRAINT "ecommerce_orders_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ecommerce_orders"
  ADD CONSTRAINT "ecommerce_orders_channel_fkey"
  FOREIGN KEY ("store_id", "channel_id") REFERENCES "ecommerce_channel_states"("store_id", "channel_id") ON DELETE RESTRICT ON UPDATE CASCADE;
