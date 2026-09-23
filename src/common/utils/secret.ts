import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const SALT = 'marthi-fiscal-vault';

function secretKey() {
  const secret =
    process.env.CREDENTIALS_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    'marthi-dev-secret-change-me';
  return scryptSync(secret, SALT, 32);
}

export function encryptSecret(plain: string): string {
  const text = plain.trim();
  if (!text) return '';
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  const raw = payload.trim();
  if (!raw) return '';
  const parts = raw.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') return '';
  try {
    const iv = Buffer.from(parts[1], 'base64');
    const tag = Buffer.from(parts[2], 'base64');
    const data = Buffer.from(parts[3], 'base64');
    const decipher = createDecipheriv('aes-256-gcm', secretKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

export function encryptJson(value: Record<string, string>): string {
  const entries = Object.entries(value).filter(([, item]) => item?.trim());
  if (entries.length === 0) return '';
  return encryptSecret(JSON.stringify(Object.fromEntries(entries)));
}

export function decryptJson(payload: string): Record<string, string> {
  const raw = decryptSecret(payload);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [key, item] of Object.entries(parsed)) {
      if (typeof item === 'string') out[key] = item;
    }
    return out;
  } catch {
    return {};
  }
}
