-- Align PlanId/ModuleId with frontend bronze/silver/golden and fiscal/ecommerce.

CREATE TYPE "plan_id_new" AS ENUM ('bronze', 'silver', 'golden');
CREATE TYPE "module_id_new" AS ENUM ('totem', 'os', 'erp', 'fiscal', 'ecommerce');

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

ALTER TABLE "store_entitlements"
  ALTER COLUMN "modules" TYPE "module_id_new"[]
  USING (
    COALESCE((
      SELECT ARRAY_AGG(DISTINCT mapped::"module_id_new")
      FROM (
        SELECT CASE x
          WHEN 'presales' THEN 'erp'
          ELSE x
        END AS mapped
        FROM unnest(COALESCE("modules"::text[], ARRAY[]::text[])) AS x
      ) s
    ), ARRAY[]::"module_id_new"[])
  );

ALTER TABLE "partner_signups"
  ALTER COLUMN "modules" TYPE "module_id_new"[]
  USING (
    COALESCE((
      SELECT ARRAY_AGG(DISTINCT mapped::"module_id_new")
      FROM (
        SELECT CASE x
          WHEN 'presales' THEN 'erp'
          ELSE x
        END AS mapped
        FROM unnest(COALESCE("modules"::text[], ARRAY[]::text[])) AS x
      ) s
    ), ARRAY[]::"module_id_new"[])
  );

DROP TYPE "plan_id";
ALTER TYPE "plan_id_new" RENAME TO "plan_id";

DROP TYPE "module_id";
ALTER TYPE "module_id_new" RENAME TO "module_id";
