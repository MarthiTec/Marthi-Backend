-- Perfil operador: contato + tema
ALTER TABLE "operator_profiles" ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "operator_profiles" ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "operator_profiles" ADD COLUMN IF NOT EXISTS "address" TEXT NOT NULL DEFAULT '';
ALTER TABLE "operator_profiles" ADD COLUMN IF NOT EXISTS "theme" TEXT NOT NULL DEFAULT 'light';

-- Totem settings: UI completa (antes só mode/exit/share)
ALTER TABLE "totem_settings" ALTER COLUMN "share_stock_with_erp" SET DEFAULT true;
UPDATE "totem_settings" SET "share_stock_with_erp" = true WHERE "share_stock_with_erp" = false;

ALTER TABLE "totem_settings" ADD COLUMN IF NOT EXISTS "vertical" TEXT NOT NULL DEFAULT 'general';
ALTER TABLE "totem_settings" ADD COLUMN IF NOT EXISTS "columns" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "totem_settings" ADD COLUMN IF NOT EXISTS "show_attract_screen" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "totem_settings" ADD COLUMN IF NOT EXISTS "store_name" TEXT NOT NULL DEFAULT 'Sua Loja';
ALTER TABLE "totem_settings" ADD COLUMN IF NOT EXISTS "store_logo" TEXT;
ALTER TABLE "totem_settings" ADD COLUMN IF NOT EXISTS "attract_background" TEXT;
ALTER TABLE "totem_settings" ADD COLUMN IF NOT EXISTS "attract_gradient_color" TEXT NOT NULL DEFAULT '#0f766e';
ALTER TABLE "totem_settings" ADD COLUMN IF NOT EXISTS "attract_layout" TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE "totem_settings" ADD COLUMN IF NOT EXISTS "keyboard_placement" TEXT NOT NULL DEFAULT 'bottom';
ALTER TABLE "totem_settings" ADD COLUMN IF NOT EXISTS "ask_customer_name" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "totem_settings" ADD COLUMN IF NOT EXISTS "offer_fulfillment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "totem_settings" ADD COLUMN IF NOT EXISTS "print_ticket" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "totem_settings" ADD COLUMN IF NOT EXISTS "audio_assist" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "totem_settings" ADD COLUMN IF NOT EXISTS "store_whatsapp" TEXT NOT NULL DEFAULT '';
ALTER TABLE "totem_settings" ADD COLUMN IF NOT EXISTS "notify_customer_on_lead" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "totem_settings" ADD COLUMN IF NOT EXISTS "location_label" TEXT NOT NULL DEFAULT '';
