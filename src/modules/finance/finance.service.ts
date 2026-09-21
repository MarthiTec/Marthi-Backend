import { Injectable } from '@nestjs/common';
import { FinanceEntry, FinanceSource, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { prefixedId } from '../../common/utils/ids';
import { isoRequired, money } from '../../common/utils/money';
import { CreateFinanceDto } from './dto/finance.dto';

export function toFinanceJson(row: FinanceEntry) {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    amount: money(row.amount),
    createdAt: isoRequired(row.createdAt),
    source: row.source,
    refId: row.refId ?? undefined,
  };
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    storeId: string,
    query: { source?: FinanceSource; from?: string; to?: string },
  ) {
    const where: Prisma.FinanceEntryWhereInput = { storeId };
    if (query.source) where.source = query.source;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) {
        const to = new Date(query.to);
        if (!query.to.includes('T')) to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }
    const rows = await this.prisma.financeEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toFinanceJson);
  }

  async createManual(storeId: string, dto: CreateFinanceDto) {
    const row = await this.prisma.financeEntry.create({
      data: {
        id: prefixedId('FIN'),
        storeId,
        type: dto.type,
        amount: dto.amount,
        label: dto.label.trim(),
        source: FinanceSource.manual,
      },
    });
    return toFinanceJson(row);
  }
}
