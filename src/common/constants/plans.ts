import { ModuleId, PlanId } from '@prisma/client';

export const GOLDEN_MODULES: ModuleId[] = [
  ModuleId.totem,
  ModuleId.os,
  ModuleId.erp,
  ModuleId.fiscal,
  ModuleId.ecommerce,
];

export function clampModulesForPlan(plan: PlanId, modules: ModuleId[]): ModuleId[] {
  const unique = [...new Set(modules)];
  if (plan === PlanId.golden) return [...GOLDEN_MODULES];
  if (plan === PlanId.bronze) return unique.slice(0, 1);
  return unique.slice(0, 2);
}

export function assertModulesForPlan(plan: PlanId, modules: ModuleId[]): boolean {
  const unique = [...new Set(modules)];
  if (unique.length !== modules.length) return false;
  if (plan === PlanId.bronze) return unique.length === 1;
  if (plan === PlanId.silver) return unique.length >= 1 && unique.length <= 2;
  if (plan === PlanId.golden) {
    return GOLDEN_MODULES.every((item) => unique.includes(item));
  }
  return false;
}
