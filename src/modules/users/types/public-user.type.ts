import { User } from '@prisma/client';
import { AuthUser } from '../../auth/types/auth.types';

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    storeId: user.storeId,
    email: user.email,
    name: user.name,
    picture: user.picture,
    provider: user.provider,
  };
}
