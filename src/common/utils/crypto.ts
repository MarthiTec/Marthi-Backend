import * as bcrypt from 'bcryptjs';

export async function hashPassword(password: string, saltRounds: number) {
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
