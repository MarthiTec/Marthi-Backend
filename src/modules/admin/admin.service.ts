import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../auth/types/auth.types';
import { summarizeCompanyUsers } from './company-user-summary';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async companyUsers(user: AuthUser) {
    const staffEmail = this.config.get<string>('AUTH_MARTHI_EMAIL')?.trim().toLowerCase();
    if (!staffEmail || user.email.trim().toLowerCase() !== staffEmail) {
      throw new ForbiddenException('Acesso exclusivo à administração Marthi.');
    }
    // One consistent snapshot: concurrent status changes cannot mix totals.
    const [stores, employees, accounts] = await this.prisma.$transaction([
      this.prisma.store.findMany({ select: { id: true, tradeName: true }, orderBy: [{ tradeName: 'asc' }, { id: 'asc' }] }),
      this.prisma.employee.findMany({
        where: { isSystemUser: true },
        select: { storeId: true, userEmail: true, email: true, active: true, isSystemUser: true },
      }),
      this.prisma.user.findMany({ select: { storeId: true, email: true } }),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return summarizeCompanyUsers(stores, employees, accounts);
  }
}

