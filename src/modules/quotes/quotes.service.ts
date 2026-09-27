import { Injectable } from '@nestjs/common';
import { PosQuote, PosQuoteLine, PosQuoteStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { notFound } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { isoRequired, money } from '../../common/utils/money';
import { AuthUser } from '../auth/types/auth.types';
import {
  ConvertQuoteDto,
  CreateQuoteDto,
  UpdateQuoteDto,
  UpdateQuoteStatusDto,
} from './dto/quote.dto';

type QuoteWithLines = PosQuote & { lines?: PosQuoteLine[] };

export function toQuoteJson(row: QuoteWithLines) {
  return {
    id: row.id,
    quoteNumber: row.quoteNumber,
    sequenceNumber: row.sequenceNumber,
    customerId: row.customerId ?? undefined,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    customerDocument: row.customerDocument,
    customerAddress: row.customerAddress || undefined,
    sellerId: row.sellerId,
    sellerName: row.sellerName,
    status: row.status,
    subtotal: money(row.subtotal),
    discount: money(row.discount),
    surcharge: money(row.surcharge),
    totalAmount: money(row.totalAmount),
    validityDays: row.validityDays,
    expiresAt: isoRequired(row.expiresAt),
    priceTableId: row.priceTableId ?? undefined,
    priceTableName: row.priceTableName ?? undefined,
    paymentMethodId: row.paymentMethodId ?? undefined,
    paymentMethodName: row.paymentMethodName ?? undefined,
    notes: row.notes,
    convertedOrderId: row.convertedOrderId ?? undefined,
    history: (row.history as any[]) ?? [],
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
    lines: (row.lines ?? []).map((line) => ({
      id: line.id,
      stockId: line.stockId ?? undefined,
      name: line.name,
      sku: line.sku,
      qty: Number(line.qty),
      basePrice: money(line.basePrice),
      unitPrice: money(line.unitPrice),
      discount: money(line.discount),
      total: money(line.total),
      isAdHoc: line.isAdHoc,
    })),
  };
}

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async listQuotes(
    storeId: string,
    filters?: {
      status?: PosQuoteStatus;
      customerId?: string;
      q?: string;
      from?: string;
      to?: string;
    },
  ) {
    const where: Prisma.PosQuoteWhereInput = { storeId };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters?.q) {
      const q = filters.q.trim();
      where.OR = [
        { quoteNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q } },
        { customerDocument: { contains: q } },
      ];
    }
    if (filters?.from || filters?.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const rows = await this.prisma.posQuote.findMany({
      where,
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => toQuoteJson(row));
  }

  async getQuote(storeId: string, id: string) {
    const row = await this.prisma.posQuote.findFirst({
      where: { id, storeId },
      include: { lines: true },
    });
    if (!row) throw notFound('Orçamento não encontrado.');
    return toQuoteJson(row);
  }

  async createQuote(storeId: string, dto: CreateQuoteDto, user: AuthUser) {
    const nextSeq = await this.getNextSequenceNumber(storeId);
    const quoteNumber = `ORC-${String(nextSeq).padStart(6, '0')}`;
    const validityDays = dto.validityDays ?? 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    const historyEntry = {
      id: prefixedId('QEV'),
      actorName: user.name || 'Operador',
      action: 'criou',
      details: `Orçamento ${quoteNumber} criado com sucesso.`,
      createdAt: new Date().toISOString(),
    };

    const row = await this.prisma.posQuote.create({
      data: {
        id: prefixedId('QUO'),
        storeId,
        quoteNumber,
        sequenceNumber: nextSeq,
        customerId: dto.customerId ?? null,
        customerName: dto.customerName.trim(),
        customerPhone: dto.customerPhone?.trim() || '',
        customerEmail: dto.customerEmail?.trim() || '',
        customerDocument: dto.customerDocument?.trim() || '',
        customerAddress: dto.customerAddress?.trim() || '',
        sellerId: dto.sellerId?.trim() || user.id,
        sellerName: dto.sellerName?.trim() || user.name,
        status: dto.status ?? PosQuoteStatus.open,
        subtotal: dto.subtotal,
        discount: dto.discount ?? 0,
        surcharge: dto.surcharge ?? 0,
        totalAmount: dto.totalAmount,
        validityDays,
        expiresAt,
        priceTableId: dto.priceTableId ?? null,
        priceTableName: dto.priceTableName ?? null,
        paymentMethodId: dto.paymentMethodId ?? null,
        paymentMethodName: dto.paymentMethodName ?? null,
        notes: dto.notes?.trim() || '',
        history: [historyEntry],
        lines: {
          create: dto.lines.map((line) => ({
            id: prefixedId('QLN'),
            stockId: line.stockId ?? null,
            name: line.name.trim(),
            sku: line.sku?.trim() || '',
            qty: line.qty,
            basePrice: line.basePrice,
            unitPrice: line.unitPrice,
            discount: line.discount ?? 0,
            total: line.total,
            isAdHoc: line.isAdHoc ?? false,
          })),
        },
      },
      include: { lines: true },
    });

    return toQuoteJson(row);
  }

  async updateQuote(
    storeId: string,
    id: string,
    dto: UpdateQuoteDto,
    user: AuthUser,
  ) {
    const current = await this.prisma.posQuote.findFirst({
      where: { id, storeId },
      include: { lines: true },
    });
    if (!current) throw notFound('Orçamento não encontrado.');

    const history = (current.history as any[]) || [];
    history.push({
      id: prefixedId('QEV'),
      actorName: user.name || 'Operador',
      action: 'alterou',
      details: 'Valores ou itens do orçamento foram alterados.',
      createdAt: new Date().toISOString(),
    });

    let expiresAt = current.expiresAt;
    if (dto.validityDays !== undefined) {
      expiresAt = new Date(current.createdAt);
      expiresAt.setDate(expiresAt.getDate() + dto.validityDays);
    }

    const row = await this.prisma.$transaction(async (tx) => {
      if (dto.lines) {
        await tx.posQuoteLine.deleteMany({ where: { quoteId: id } });
      }

      return tx.posQuote.update({
        where: { id },
        data: {
          ...(dto.customerName !== undefined
            ? { customerName: dto.customerName.trim() }
            : {}),
          ...(dto.customerPhone !== undefined
            ? { customerPhone: dto.customerPhone.trim() }
            : {}),
          ...(dto.customerEmail !== undefined
            ? { customerEmail: dto.customerEmail.trim() }
            : {}),
          ...(dto.customerDocument !== undefined
            ? { customerDocument: dto.customerDocument.trim() }
            : {}),
          ...(dto.customerAddress !== undefined
            ? { customerAddress: dto.customerAddress.trim() }
            : {}),
          ...(dto.sellerId !== undefined
            ? { sellerId: dto.sellerId.trim() }
            : {}),
          ...(dto.sellerName !== undefined
            ? { sellerName: dto.sellerName.trim() }
            : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.subtotal !== undefined ? { subtotal: dto.subtotal } : {}),
          ...(dto.discount !== undefined ? { discount: dto.discount } : {}),
          ...(dto.surcharge !== undefined ? { surcharge: dto.surcharge } : {}),
          ...(dto.totalAmount !== undefined
            ? { totalAmount: dto.totalAmount }
            : {}),
          ...(dto.validityDays !== undefined
            ? { validityDays: dto.validityDays, expiresAt }
            : {}),
          ...(dto.priceTableId !== undefined
            ? { priceTableId: dto.priceTableId }
            : {}),
          ...(dto.priceTableName !== undefined
            ? { priceTableName: dto.priceTableName }
            : {}),
          ...(dto.paymentMethodId !== undefined
            ? { paymentMethodId: dto.paymentMethodId }
            : {}),
          ...(dto.paymentMethodName !== undefined
            ? { paymentMethodName: dto.paymentMethodName }
            : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes.trim() } : {}),
          history,
          ...(dto.lines
            ? {
                lines: {
                  create: dto.lines.map((line) => ({
                    id: prefixedId('QLN'),
                    stockId: line.stockId ?? null,
                    name: line.name.trim(),
                    sku: line.sku?.trim() || '',
                    qty: line.qty,
                    basePrice: line.basePrice,
                    unitPrice: line.unitPrice,
                    discount: line.discount ?? 0,
                    total: line.total,
                    isAdHoc: line.isAdHoc ?? false,
                  })),
                },
              }
            : {}),
        },
        include: { lines: true },
      });
    });

    return toQuoteJson(row);
  }

  async updateQuoteStatus(
    storeId: string,
    id: string,
    dto: UpdateQuoteStatusDto,
    user: AuthUser,
  ) {
    const current = await this.prisma.posQuote.findFirst({
      where: { id, storeId },
      include: { lines: true },
    });
    if (!current) throw notFound('Orçamento não encontrado.');

    const history = (current.history as any[]) || [];
    history.push({
      id: prefixedId('QEV'),
      actorName: user.name || 'Operador',
      action: dto.action || 'alterou',
      details: dto.details || `Status alterado para ${dto.status}.`,
      createdAt: new Date().toISOString(),
    });

    const updated = await this.prisma.posQuote.update({
      where: { id },
      data: {
        status: dto.status,
        history,
      },
      include: { lines: true },
    });

    return toQuoteJson(updated);
  }

  async duplicateQuote(storeId: string, id: string, user: AuthUser) {
    const source = await this.prisma.posQuote.findFirst({
      where: { id, storeId },
      include: { lines: true },
    });
    if (!source) throw notFound('Orçamento de origem não encontrado.');

    const nextSeq = await this.getNextSequenceNumber(storeId);
    const quoteNumber = `ORC-${String(nextSeq).padStart(6, '0')}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + source.validityDays);

    const history = [
      {
        id: prefixedId('QEV'),
        actorName: user.name || 'Operador',
        action: 'duplicou',
        details: `Duplicado a partir do orçamento ${source.quoteNumber}.`,
        createdAt: new Date().toISOString(),
      },
    ];

    const duplicated = await this.prisma.posQuote.create({
      data: {
        id: prefixedId('QUO'),
        storeId,
        quoteNumber,
        sequenceNumber: nextSeq,
        customerId: source.customerId,
        customerName: source.customerName,
        customerPhone: source.customerPhone,
        customerEmail: source.customerEmail,
        customerDocument: source.customerDocument,
        customerAddress: source.customerAddress,
        sellerId: user.id,
        sellerName: user.name,
        status: PosQuoteStatus.open,
        subtotal: source.subtotal,
        discount: source.discount,
        surcharge: source.surcharge,
        totalAmount: source.totalAmount,
        validityDays: source.validityDays,
        expiresAt,
        priceTableId: source.priceTableId,
        priceTableName: source.priceTableName,
        paymentMethodId: source.paymentMethodId,
        paymentMethodName: source.paymentMethodName,
        notes: source.notes,
        history,
        lines: {
          create: source.lines.map((line) => ({
            id: prefixedId('QLN'),
            stockId: line.stockId,
            name: line.name,
            sku: line.sku,
            qty: line.qty,
            basePrice: line.basePrice,
            unitPrice: line.unitPrice,
            discount: line.discount,
            total: line.total,
            isAdHoc: line.isAdHoc,
          })),
        },
      },
      include: { lines: true },
    });

    return toQuoteJson(duplicated);
  }

  async convertQuote(
    storeId: string,
    id: string,
    dto: ConvertQuoteDto,
    user: AuthUser,
  ) {
    const current = await this.prisma.posQuote.findFirst({
      where: { id, storeId },
      include: { lines: true },
    });
    if (!current) throw notFound('Orçamento não encontrado.');

    const history = (current.history as any[]) || [];
    history.push({
      id: prefixedId('QEV'),
      actorName: user.name || 'Operador',
      action: 'converteu',
      details: `Convertido no pedido de venda ${dto.orderId}.`,
      createdAt: new Date().toISOString(),
    });

    const updated = await this.prisma.posQuote.update({
      where: { id },
      data: {
        status: PosQuoteStatus.converted,
        convertedOrderId: dto.orderId,
        history,
      },
      include: { lines: true },
    });

    return toQuoteJson(updated);
  }

  async deleteQuote(storeId: string, id: string) {
    const current = await this.prisma.posQuote.findFirst({
      where: { id, storeId },
    });
    if (!current) throw notFound('Orçamento não encontrado.');
    await this.prisma.posQuote.delete({ where: { id } });
    return { success: true };
  }

  private async getNextSequenceNumber(storeId: string): Promise<number> {
    const top = await this.prisma.posQuote.findFirst({
      where: { storeId },
      orderBy: { sequenceNumber: 'desc' },
      select: { sequenceNumber: true },
    });
    return (top?.sequenceNumber ?? 0) + 1;
  }
}
