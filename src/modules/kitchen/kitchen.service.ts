import { Injectable } from '@nestjs/common';
import {
  CardapioOrderStatus,
  KitchenTableStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { conflict, notFound } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { isoRequired, money } from '../../common/utils/money';
import {
  CreateKitchenTableDto,
  UpdateKitchenOrderStatusDto,
  UpdateKitchenTableDto,
} from './dto/kitchen.dto';

@Injectable()
export class KitchenService {
  constructor(private readonly prisma: PrismaService) {}

  // =================== KDS ORDERS ===================

  async listOrders(storeId: string, status?: CardapioOrderStatus) {
    const where: Prisma.CardapioOrderWhereInput = { storeId };
    if (status) {
      where.status = status;
    } else {
      where.status = {
        in: [
          CardapioOrderStatus.pending,
          CardapioOrderStatus.confirmed,
          CardapioOrderStatus.preparing,
          CardapioOrderStatus.ready,
        ],
      };
    }

    const rows = await this.prisma.cardapioOrder.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((r) => ({
      ...r,
      subtotal: money(r.subtotal),
      deliveryFee: money(r.deliveryFee),
      totalAmount: money(r.totalAmount),
      changeFor: r.changeFor ? money(r.changeFor) : undefined,
      createdAt: isoRequired(r.createdAt),
      updatedAt: isoRequired(r.updatedAt),
    }));
  }

  async updateOrderStatus(
    storeId: string,
    id: string,
    dto: UpdateKitchenOrderStatusDto,
  ) {
    const current = await this.prisma.cardapioOrder.findFirst({
      where: { id, storeId },
    });
    if (!current) throw notFound('Pedido não encontrado na cozinha.');

    const row = await this.prisma.cardapioOrder.update({
      where: { id },
      data: { status: dto.status },
    });

    return {
      ...row,
      subtotal: money(row.subtotal),
      deliveryFee: money(row.deliveryFee),
      totalAmount: money(row.totalAmount),
      changeFor: row.changeFor ? money(row.changeFor) : undefined,
      createdAt: isoRequired(row.createdAt),
      updatedAt: isoRequired(row.updatedAt),
    };
  }

  // =================== TABLES ===================

  async listTables(storeId: string) {
    const rows = await this.prisma.kitchenTable.findMany({
      where: { storeId },
      orderBy: { number: 'asc' },
    });
    return rows.map((r) => ({
      ...r,
      updatedAt: isoRequired(r.updatedAt),
    }));
  }

  async createTable(storeId: string, dto: CreateKitchenTableDto) {
    const existing = await this.prisma.kitchenTable.findFirst({
      where: { storeId, number: dto.number.trim() },
    });
    if (existing) throw conflict(`Mesa ${dto.number} já está cadastrada.`);

    const row = await this.prisma.kitchenTable.create({
      data: {
        id: prefixedId('TBL'),
        storeId,
        number: dto.number.trim(),
        capacity: dto.capacity ?? 4,
        status: dto.status ?? KitchenTableStatus.free,
        notes: dto.notes?.trim() || '',
      },
    });

    return {
      ...row,
      updatedAt: isoRequired(row.updatedAt),
    };
  }

  async updateTable(storeId: string, id: string, dto: UpdateKitchenTableDto) {
    const current = await this.prisma.kitchenTable.findFirst({
      where: { id, storeId },
    });
    if (!current) throw notFound('Mesa não encontrada.');

    if (dto.number !== undefined && dto.number.trim() !== current.number) {
      const conflictCheck = await this.prisma.kitchenTable.findFirst({
        where: { storeId, number: dto.number.trim(), NOT: { id } },
      });
      if (conflictCheck) throw conflict(`Mesa ${dto.number} já existe.`);
    }

    const row = await this.prisma.kitchenTable.update({
      where: { id },
      data: {
        ...(dto.number !== undefined ? { number: dto.number.trim() } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.activeOrder !== undefined
          ? { activeOrder: dto.activeOrder }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes.trim() } : {}),
      },
    });

    return {
      ...row,
      updatedAt: isoRequired(row.updatedAt),
    };
  }
}
