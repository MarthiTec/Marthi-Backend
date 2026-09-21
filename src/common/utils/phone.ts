export function digitsOnly(value: string | undefined | null): string {
  return (value ?? '').replace(/\D/g, '');
}

export function optionalText(value: string | undefined | null): string {
  return (value ?? '').trim();
}

export function upperUf(value: string | undefined | null): string {
  return optionalText(value).toUpperCase().slice(0, 2);
}
