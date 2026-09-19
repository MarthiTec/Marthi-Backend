export function prefixedId(prefix: string) {
  const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${prefix}-${token.toUpperCase()}`;
}

export const DEMO_STORE_ID = 'STR-CELL-PONTO';
