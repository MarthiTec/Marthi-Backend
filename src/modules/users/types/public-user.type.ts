import { UserRole, UserStatus } from '@prisma/client';

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
