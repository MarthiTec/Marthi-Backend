import { Injectable } from '@nestjs/common';
import { PaymentMethod, PriceTable, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { conflict, notFound } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { money, roundMoney } from '../../common/utils/money';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/payment.dto';
import {
  CreatePriceTableDto,
  UpdatePriceTableDto,
} from './dto/price-table.dto';

export function toPriceTableJson(row: PriceTable) {
  return {
    id: row.id,
    name: row.name,
    percent: money(row.percent),
    active: row.active,
  };
}

export function toPaymentJson(row: PaymentMethod) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    priceTableId: row.priceTableId,
    maxInstallments: row.maxInstallments,
    active: row.active,
  };
}

export function applyPriceTable(base: number, percent: number) {
  return roundMoney(base * (1 + percent / 100));
}

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  listTables(storeId: string) {
    return this.prisma.priceTable
      .findMany({ where: { storeId }, orderBy: { name: 'asc' } })
      .then((rows) => rows.map(toPriceTableJson));
  }

  async getTable(storeId: string, id: string) {
    return toPriceTableJson(await this.findTable(storeId, id));
  }

  async createTable(storeId: string, dto: CreatePriceTableDto) {
    const row = await this.prisma.priceTable.create({
      data: {
        id: prefixedId('TAB'),
        storeId,
        name: dto.name.trim(),
        percent: dto.percent,
        active: dto.active ?? true,
      },
    });
    return toPriceTableJson(row);
  }

  async updateTable(storeId: string, id: string, dto: UpdatePriceTableDto) {
    await this.findTable(storeId, id);
    const row = await this.prisma.priceTable.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.percent !== undefined ? { percent: dto.percent } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
    return toPriceTableJson(row);
  }

  async removeTable(storeId: string, id: string) {
    await this.findTable(storeId, id);
    const used = await this.prisma.paymentMethod.count({
      where: { priceTableId: id },
    });
    if (used > 0) {
      throw conflict('Tabela vinculada a forma de pagamento.');
    }
    await this.prisma.priceTable.delete({ where: { id } });
    return { id, deleted: true };
  }

  listPayments(storeId: string) {
    return this.prisma.paymentMethod
      .findMany({ where: { storeId }, orderBy: { name: 'asc' } })
      .then((rows) => rows.map(toPaymentJson));
  }

  async getPayment(storeId: string, id: string) {
    return toPaymentJson(await this.findPayment(storeId, id));
  }

  async createPayment(storeId: string, dto: CreatePaymentDto) {
    await this.findTable(storeId, dto.priceTableId);
    const row = await this.prisma.paymentMethod.create({
      data: {
        id: prefixedId('PAY'),
        storeId,
        name: dto.name.trim(),
        type: dto.type,
        priceTableId: dto.priceTableId,
        maxInstallments: dto.maxInstallments,
        active: dto.active ?? true,
      },
    });
    return toPaymentJson(row);
  }

  async updatePayment(storeId: string, id: string, dto: UpdatePaymentDto) {
    await this.findPayment(storeId, id);
    if (dto.priceTableId) await this.findTable(storeId, dto.priceTableId);
    const row = await this.prisma.paymentMethod.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.priceTableId !== undefined
          ? { priceTableId: dto.priceTableId }
          : {}),
        ...(dto.maxInstallments !== undefined
          ? { maxInstallments: dto.maxInstallments }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
    return toPaymentJson(row);
  }

  async removePayment(storeId: string, id: string) {
    await this.findPayment(storeId, id);
    try {
      await this.prisma.paymentMethod.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2003' || error.code === 'P2014')
      ) {
        throw conflict('Forma de pagamento vinculada a pedidos.');
      }
      throw error;
    }
    return { id, deleted: true };
  }

  private async findTable(storeId: string, id: string) {
    const row = await this.prisma.priceTable.findFirst({
      where: { id, storeId },
    });
    if (!row) throw notFound('Tabela de preço não encontrada.');
    return row;
  }

  private async findPayment(storeId: string, id: string) {
    const row = await this.prisma.paymentMethod.findFirst({
      where: { id, storeId },
    });
    if (!row) throw notFound('Forma de pagamento não encontrada.');
    return row;
  }
}
