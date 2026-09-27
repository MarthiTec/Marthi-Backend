import { Injectable } from '@nestjs/common';
import { Prisma, PromoCampaign } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { notFound } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { isoRequired, money } from '../../common/utils/money';
import {
  CreatePromoCampaignDto,
  UpdatePromoCampaignDto,
} from './dto/promotion.dto';

export function toCampaignJson(row: PromoCampaign) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    active: row.active,
    priority: row.priority,
    criteria: (row.criteria as Record<string, unknown>) ?? {},
    discountPercent: row.discountPercent
      ? Number(row.discountPercent)
      : undefined,
    discountAmount: row.discountAmount ? money(row.discountAmount) : undefined,
    promoPrice: row.promoPrice ? money(row.promoPrice) : undefined,
    tiers: (row.tiers as any[]) ?? [],
    buyQty: row.buyQty ?? undefined,
    payQty: row.payQty ?? undefined,
    giftStockId: row.giftStockId ?? undefined,
    giftMinQty: row.giftMinQty ?? undefined,
    startDate: row.startDate ? isoRequired(row.startDate) : undefined,
    endDate: row.endDate ? isoRequired(row.endDate) : undefined,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
  };
}

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listCampaigns(storeId: string, activeOnly = false) {
    const where: Prisma.PromoCampaignWhereInput = { storeId };
    if (activeOnly) {
      where.active = true;
    }
    const rows = await this.prisma.promoCampaign.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(toCampaignJson);
  }

  async getCampaign(storeId: string, id: string) {
    const row = await this.prisma.promoCampaign.findFirst({
      where: { id, storeId },
    });
    if (!row) throw notFound('Campanha promocional não encontrada.');
    return toCampaignJson(row);
  }

  async createCampaign(storeId: string, dto: CreatePromoCampaignDto) {
    const row = await this.prisma.promoCampaign.create({
      data: {
        id: prefixedId('PRM'),
        storeId,
        name: dto.name.trim(),
        kind: dto.kind,
        active: dto.active ?? true,
        priority: dto.priority ?? 0,
        criteria: dto.criteria ?? {},
        discountPercent: dto.discountPercent ?? null,
        discountAmount: dto.discountAmount ?? null,
        promoPrice: dto.promoPrice ?? null,
        tiers: dto.tiers ?? [],
        buyQty: dto.buyQty ?? null,
        payQty: dto.payQty ?? null,
        giftStockId: dto.giftStockId ?? null,
        giftMinQty: dto.giftMinQty ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
    return toCampaignJson(row);
  }

  async updateCampaign(
    storeId: string,
    id: string,
    dto: UpdatePromoCampaignDto,
  ) {
    await this.getCampaign(storeId, id);
    const row = await this.prisma.promoCampaign.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.criteria !== undefined ? { criteria: dto.criteria } : {}),
        ...(dto.discountPercent !== undefined
          ? { discountPercent: dto.discountPercent }
          : {}),
        ...(dto.discountAmount !== undefined
          ? { discountAmount: dto.discountAmount }
          : {}),
        ...(dto.promoPrice !== undefined ? { promoPrice: dto.promoPrice } : {}),
        ...(dto.tiers !== undefined ? { tiers: dto.tiers } : {}),
        ...(dto.buyQty !== undefined ? { buyQty: dto.buyQty } : {}),
        ...(dto.payQty !== undefined ? { payQty: dto.payQty } : {}),
        ...(dto.giftStockId !== undefined
          ? { giftStockId: dto.giftStockId }
          : {}),
        ...(dto.giftMinQty !== undefined ? { giftMinQty: dto.giftMinQty } : {}),
        ...(dto.startDate !== undefined
          ? { startDate: dto.startDate ? new Date(dto.startDate) : null }
          : {}),
        ...(dto.endDate !== undefined
          ? { endDate: dto.endDate ? new Date(dto.endDate) : null }
          : {}),
      },
    });
    return toCampaignJson(row);
  }

  async deleteCampaign(storeId: string, id: string) {
    await this.getCampaign(storeId, id);
    await this.prisma.promoCampaign.delete({ where: { id } });
    return { success: true };
  }
}
