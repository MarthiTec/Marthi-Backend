-- P4: audit log + totem click analytics.

CREATE TYPE "audit_kind" AS ENUM ('access', 'action');

CREATE TABLE "audit_entries" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "kind" "audit_kind" NOT NULL,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actor_name" TEXT NOT NULL,
  "actor_email" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "detail" TEXT NOT NULL DEFAULT '',
  "path" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "audit_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_audit_store_at" ON "audit_entries"("store_id", "at" DESC);
CREATE INDEX "idx_audit_store_kind" ON "audit_entries"("store_id", "kind");

ALTER TABLE "audit_entries"
  ADD CONSTRAINT "audit_entries_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "totem_click_events" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "product_name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "totem_click_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_totem_clicks_store" ON "totem_click_events"("store_id", "created_at" DESC);

ALTER TABLE "totem_click_events"
  ADD CONSTRAINT "totem_click_events_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
