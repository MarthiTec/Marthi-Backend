-- Align PlanId/ModuleId with frontend bronze/silver/golden and fiscal/ecommerce.
-- Postgres forbids subqueries in ALTER COLUMN ... USING, so module arrays
-- are converted via a temporary column.

DO $$ BEGIN
  CREATE TYPE "plan_id_new" AS ENUM ('bronze', 'silver', 'golden');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "module_id_new" AS ENUM ('totem', 'os', 'erp', 'fiscal', 'ecommerce');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_type t ON t.oid = a.atttypid
    WHERE c.relname = 'store_entitlements'
      AND a.attname = 'plan'
      AND NOT a.attisdropped
      AND t.typname = 'plan_id'
  ) THEN
    ALTER TABLE "store_entitlements"
      ALTER COLUMN "plan" TYPE "plan_id_new"
      USING (
        CASE "plan"::text
          WHEN 'start' THEN 'bronze'
          WHEN 'growth' THEN 'silver'
          WHEN 'scale' THEN 'golden'
          ELSE "plan"::text
        END
      )::"plan_id_new";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_type t ON t.oid = a.atttypid
    WHERE c.relname = 'partner_signups'
      AND a.attname = 'plan'
      AND NOT a.attisdropped
      AND t.typname = 'plan_id'
  ) THEN
    ALTER TABLE "partner_signups"
      ALTER COLUMN "plan" TYPE "plan_id_new"
      USING (
        CASE "plan"::text
          WHEN 'start' THEN 'bronze'
          WHEN 'growth' THEN 'silver'
          WHEN 'scale' THEN 'golden'
          ELSE "plan"::text
        END
      )::"plan_id_new";
  END IF;
END $$;

ALTER TABLE "store_entitlements" ADD COLUMN IF NOT EXISTS "modules_new" "module_id_new"[];

UPDATE "store_entitlements"
SET "modules_new" = ARRAY(
  SELECT DISTINCT CASE x
    WHEN 'presales' THEN 'erp'
    ELSE x
  END::"module_id_new"
  FROM unnest(COALESCE("modules"::text[], ARRAY[]::text[])) AS x
  WHERE CASE x WHEN 'presales' THEN 'erp' ELSE x END IN ('totem', 'os', 'erp', 'fiscal', 'ecommerce')
);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    WHERE c.relname = 'store_entitlements'
      AND a.attname = 'modules'
      AND NOT a.attisdropped
  ) AND EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    WHERE c.relname = 'store_entitlements'
      AND a.attname = 'modules_new'
      AND NOT a.attisdropped
  ) THEN
    ALTER TABLE "store_entitlements" DROP COLUMN "modules";
    ALTER TABLE "store_entitlements" RENAME COLUMN "modules_new" TO "modules";
  END IF;
END $$;

ALTER TABLE "partner_signups" ADD COLUMN IF NOT EXISTS "modules_new" "module_id_new"[];

UPDATE "partner_signups"
SET "modules_new" = ARRAY(
  SELECT DISTINCT CASE x
    WHEN 'presales' THEN 'erp'
    ELSE x
  END::"module_id_new"
  FROM unnest(COALESCE("modules"::text[], ARRAY[]::text[])) AS x
  WHERE CASE x WHEN 'presales' THEN 'erp' ELSE x END IN ('totem', 'os', 'erp', 'fiscal', 'ecommerce')
);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    WHERE c.relname = 'partner_signups'
      AND a.attname = 'modules'
      AND NOT a.attisdropped
  ) AND EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    WHERE c.relname = 'partner_signups'
      AND a.attname = 'modules_new'
      AND NOT a.attisdropped
  ) THEN
    ALTER TABLE "partner_signups" DROP COLUMN "modules";
    ALTER TABLE "partner_signups" RENAME COLUMN "modules_new" TO "modules";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_id_new') THEN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_id') THEN
      DROP TYPE "plan_id";
    END IF;
    ALTER TYPE "plan_id_new" RENAME TO "plan_id";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'module_id_new') THEN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'module_id') THEN
      DROP TYPE "module_id";
    END IF;
    ALTER TYPE "module_id_new" RENAME TO "module_id";
  END IF;
END $$;
