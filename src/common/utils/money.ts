import { Prisma } from '@prisma/client';

export function money(
  value: Prisma.Decimal | number | string | null | undefined,
): number {
  if (value == null || value === '') return 0;
  return Number(value);
}

export function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function iso(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined;
}

export function isoRequired(value: Date): string {
  return value.toISOString();
}
