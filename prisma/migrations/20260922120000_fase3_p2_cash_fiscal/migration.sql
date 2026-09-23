-- P2: cash PDV + fiscal catalog + issuer settings + CST/cClassTrib.

CREATE TYPE "cash_session_status" AS ENUM ('open', 'closed');

CREATE TYPE "cash_movement_kind" AS ENUM (
  'open', 'aporte', 'sangria', 'sale', 'exchange', 'vale', 'close', 'drawer'
);

CREATE TYPE "cash_beneficiary_type" AS ENUM ('store', 'employee');

CREATE TYPE "store_credit_status" AS ENUM ('open', 'used', 'cancelled');

CREATE TYPE "cfop_operation" AS ENUM ('in_same', 'in_other', 'out_same', 'out_other', 'other');

CREATE TYPE "fiscal_sefaz_environment" AS ENUM ('homologacao', 'producao');

CREATE TYPE "fiscal_storage_mode" AS ENUM ('local', 'cloud', 'both');

CREATE TYPE "fiscal_doc_family" AS ENUM ('nfe', 'nfce', 'nfse', 'cte', 'mdfe', 'other');

CREATE TYPE "fiscal_tax_sync_source" AS ENUM ('seed', 'api', 'manual');

CREATE TABLE "cash_sessions" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "opened_at" TIMESTAMP(3) NOT NULL,
  "closed_at" TIMESTAMP(3),
  "opening_float" DECIMAL(12,2) NOT NULL,
  "expected_cash" DECIMAL(12,2) NOT NULL,
  "counted_cash" DECIMAL(12,2),
  "difference" DECIMAL(12,2),
  "operator_name" TEXT NOT NULL,
  "status" "cash_session_status" NOT NULL DEFAULT 'open',
  "reopen_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_cash_sessions_store_status" ON "cash_sessions"("store_id", "status");

CREATE UNIQUE INDEX "uq_cash_sessions_open"
  ON "cash_sessions"("store_id")
  WHERE "status" = 'open';

ALTER TABLE "cash_sessions"
  ADD CONSTRAINT "cash_sessions_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "cash_movements" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "kind" "cash_movement_kind" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "reason" TEXT NOT NULL DEFAULT '',
  "beneficiary_type" "cash_beneficiary_type",
  "beneficiary_id" TEXT,
  "beneficiary_name" TEXT NOT NULL DEFAULT '',
  "operator_name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_cash_movements_session" ON "cash_movements"("session_id", "created_at");

ALTER TABLE "cash_movements"
  ADD CONSTRAINT "cash_movements_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "cash_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "store_credits" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "customer_name" TEXT NOT NULL,
  "customer_phone" TEXT NOT NULL DEFAULT '',
  "amount" DECIMAL(12,2) NOT NULL,
  "remaining" DECIMAL(12,2) NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "operator_name" TEXT NOT NULL,
  "status" "store_credit_status" NOT NULL DEFAULT 'open',
  "order_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "store_credits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_store_credits_code" ON "store_credits"("store_id", "code");
CREATE INDEX "idx_store_credits_store" ON "store_credits"("store_id", "status");

ALTER TABLE "store_credits"
  ADD CONSTRAINT "store_credits_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "exchange_records" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "customer_name" TEXT NOT NULL,
  "customer_phone" TEXT NOT NULL DEFAULT '',
  "return_lines" JSONB NOT NULL,
  "out_lines" JSONB NOT NULL,
  "return_total" DECIMAL(12,2) NOT NULL,
  "out_total" DECIMAL(12,2) NOT NULL,
  "cash_delta" DECIMAL(12,2) NOT NULL,
  "credit_id" TEXT,
  "note" TEXT NOT NULL DEFAULT '',
  "operator_name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exchange_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_exchanges_store" ON "exchange_records"("store_id", "created_at" DESC);

ALTER TABLE "exchange_records"
  ADD CONSTRAINT "exchange_records_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "exchange_records"
  ADD CONSTRAINT "exchange_records_credit_id_fkey"
  FOREIGN KEY ("credit_id") REFERENCES "store_credits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "fiscal_classifications" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ncm" TEXT NOT NULL,
  "cst_icms" TEXT NOT NULL DEFAULT '',
  "c_clas_trib" TEXT NOT NULL DEFAULT '',
  "icms_rate" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "ipi_cst" TEXT NOT NULL DEFAULT '',
  "ipi_rate" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "pis_cst" TEXT NOT NULL DEFAULT '',
  "pis_rate" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "cofins_cst" TEXT NOT NULL DEFAULT '',
  "cofins_rate" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "ibs_rate" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "cbs_rate" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "default_cfop_id" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fiscal_classifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_fiscal_class_store" ON "fiscal_classifications"("store_id", "active");

ALTER TABLE "fiscal_classifications"
  ADD CONSTRAINT "fiscal_classifications_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_items"
  ADD CONSTRAINT "stock_items_fiscal_classification_id_fkey"
  FOREIGN KEY ("fiscal_classification_id") REFERENCES "fiscal_classifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "cfop_codes" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "operation" "cfop_operation" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cfop_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_cfops_store_code" ON "cfop_codes"("store_id", "code");
CREATE INDEX "idx_cfops_store" ON "cfop_codes"("store_id", "active");

ALTER TABLE "cfop_codes"
  ADD CONSTRAINT "cfop_codes_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "fecp_rules" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "uf" CHAR(2) NOT NULL,
  "description" TEXT NOT NULL,
  "rate" DECIMAL(6,2) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fecp_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_fecps_store_uf" ON "fecp_rules"("store_id", "uf");

ALTER TABLE "fecp_rules"
  ADD CONSTRAINT "fecp_rules_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "fiscal_issuer_settings" (
  "store_id" TEXT NOT NULL,
  "emitente_name" TEXT NOT NULL DEFAULT '',
  "cnpj" TEXT NOT NULL DEFAULT '',
  "ie" TEXT NOT NULL DEFAULT '',
  "im" TEXT NOT NULL DEFAULT '',
  "c_mun" TEXT NOT NULL DEFAULT '3304557',
  "municipio" TEXT NOT NULL DEFAULT 'Rio de Janeiro',
  "uf" CHAR(2) NOT NULL DEFAULT 'RJ',
  "certificate_file_name" TEXT NOT NULL DEFAULT '',
  "certificate_base64" TEXT NOT NULL DEFAULT '',
  "certificate_password_enc" TEXT NOT NULL DEFAULT '',
  "csc_id" TEXT NOT NULL DEFAULT '',
  "csc_token_enc" TEXT NOT NULL DEFAULT '',
  "environment" "fiscal_sefaz_environment" NOT NULL DEFAULT 'homologacao',
  "nfe_series" TEXT NOT NULL DEFAULT '1',
  "nfce_series" TEXT NOT NULL DEFAULT '1',
  "nfse_series" TEXT NOT NULL DEFAULT '1',
  "cte_series" TEXT NOT NULL DEFAULT '1',
  "mdfe_series" TEXT NOT NULL DEFAULT '1',
  "cbs_rate_base" DECIMAL(6,2) NOT NULL DEFAULT 0.9,
  "ibs_rate_base" DECIMAL(6,2) NOT NULL DEFAULT 0.1,
  "issqn_rate_default" DECIMAL(6,2) NOT NULL DEFAULT 5,
  "issqn_retained_rate" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "issqn_municipal_code" TEXT NOT NULL DEFAULT '',
  "storage_mode" "fiscal_storage_mode" NOT NULL DEFAULT 'both',
  "local_root_path" TEXT NOT NULL DEFAULT 'C:\Marthi\Fiscal',
  "local_xml_path" TEXT NOT NULL DEFAULT 'C:\Marthi\Fiscal\XML',
  "local_log_path" TEXT NOT NULL DEFAULT 'C:\Marthi\Fiscal\LOG',
  "local_pdf_path" TEXT NOT NULL DEFAULT 'C:\Marthi\Fiscal\PDF',
  "local_pdv_path" TEXT NOT NULL DEFAULT 'C:\Marthi\Fiscal\PDV',
  "cloud_enabled" BOOLEAN NOT NULL DEFAULT true,
  "cloud_bucket_hint" TEXT NOT NULL DEFAULT 'marthi-fiscal',
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fiscal_issuer_settings_pkey" PRIMARY KEY ("store_id")
);

ALTER TABLE "fiscal_issuer_settings"
  ADD CONSTRAINT "fiscal_issuer_settings_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "fiscal_log_entries" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "family" "fiscal_doc_family" NOT NULL,
  "action" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "ref_id" TEXT,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fiscal_log_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_fiscal_logs_store" ON "fiscal_log_entries"("store_id", "at" DESC);

ALTER TABLE "fiscal_log_entries"
  ADD CONSTRAINT "fiscal_log_entries_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "fiscal_cst_codes" (
  "store_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "fiscal_cst_codes_pkey" PRIMARY KEY ("store_id", "code")
);

ALTER TABLE "fiscal_cst_codes"
  ADD CONSTRAINT "fiscal_cst_codes_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "fiscal_cclass_tribs" (
  "store_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cst_code" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "link_lc" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "fiscal_cclass_tribs_pkey" PRIMARY KEY ("store_id", "code")
);

ALTER TABLE "fiscal_cclass_tribs"
  ADD CONSTRAINT "fiscal_cclass_tribs_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "fiscal_tax_tables_meta" (
  "store_id" TEXT NOT NULL,
  "last_sync_at" TIMESTAMP(3),
  "last_sync_source" "fiscal_tax_sync_source" NOT NULL DEFAULT 'seed',
  "last_sync_message" TEXT NOT NULL DEFAULT '',
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fiscal_tax_tables_meta_pkey" PRIMARY KEY ("store_id")
);

ALTER TABLE "fiscal_tax_tables_meta"
  ADD CONSTRAINT "fiscal_tax_tables_meta_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
