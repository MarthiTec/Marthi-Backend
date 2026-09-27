import { Injectable } from '@nestjs/common';
import {
  FinanceSource,
  FinanceType,
  PosTicket,
  PosTicketAttribute,
  Prisma,
  SalesOrder,
  SalesOrderLine,
  TicketSource,
  TicketStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { conflict, notFound } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { isoRequired, money, roundMoney } from '../../common/utils/money';
import { AuthUser } from '../auth/types/auth.types';
import { CashService } from '../cash/cash.service';
import { CustomersService } from '../customers/customers.service';
import { ClosePosSaleDto } from './dto/close-pos-sale.dto';
import { CreatePosTicketDto, PatchPosTicketDto } from './dto/pos-ticket.dto';

type OrderRow = SalesOrder & { lines?: SalesOrderLine[] };

export function toOrderJson(row: OrderRow, withLines = false) {
  const json: Record<string, unknown> = {
    id: row.id,
    ticketId: row.ticketId,
    customerId: row.customerId,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerDocument: row.customerDocument,
    productName: row.productName,
    amount: money(row.amount),
    discount: money(row.discount),
    surcharge: money(row.surcharge),
    status: row.status,
    payment: row.payment,
    paymentMethodId: row.paymentMethodId,
    priceTableId: row.priceTableId,
    sellerId: row.sellerId,
    sellerName: row.sellerName,
    idempotencyKey: row.idempotencyKey,
    localId: row.localId,
    cancelledAt: row.cancelledAt ? isoRequired(row.cancelledAt) : null,
    cancelReason: row.cancelReason,
    createdAt: isoRequired(row.createdAt),
  };
  if (withLines) {
    json.lines = (row.lines ?? []).map((line) => ({
      id: line.id,
      stockId: line.stockId,
      name: line.name,
      qty: Number(line.qty),
      unitPrice: money(line.unitPrice),
      imei: line.imei,
      isAdHoc: line.isAdHoc,
      itemType: line.itemType,
    }));
  }
  return json;
}

type TicketRow = PosTicket & { attributes: PosTicketAttribute[] };

export function toTicketJson(row: TicketRow) {
  return {
    id: row.id,
    source: row.source,
    status: row.status,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    productName: row.productName,
    attributes: row.attributes.map((item) => ({
      id: item.attributeId,
      name: item.name,
      value: item.value,
    })),
    color: row.color,
    storage: row.storage,
    fulfillment: row.fulfillment,
    payment: row.payment,
    installment: row.installment,
    priceLabel: row.priceLabel,
    createdAt: isoRequired(row.createdAt),
    closedAt: row.closedAt ? isoRequired(row.closedAt) : null,
  };
}

const ticketInclude = { attributes: true } as const;

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly cash: CashService,
  ) {}

  async listOrders(storeId: string) {
    const rows = await this.prisma.salesOrder.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toOrderJson(row));
  }

  async getOrder(storeId: string, id: string) {
    const row = await this.prisma.salesOrder.findFirst({
      where: { id, storeId },
      include: { lines: true },
    });
    if (!row) throw notFound('Pedido não encontrado.');
    return toOrderJson(row, true);
  }

  async closeSale(user: AuthUser, dto: ClosePosSaleDto) {
    const storeId = user.storeId;

    if (dto.idempotencyKey) {
      const existing = await this.prisma.salesOrder.findFirst({
        where: { storeId, idempotencyKey: dto.idempotencyKey },
        include: { lines: true },
      });
      if (existing) {
        return toOrderJson(existing, true);
      }
    }

    const subtotal = dto.lines.reduce(
      (sum, line) => sum + line.unitPrice * line.qty,
      0,
    );
    const amount = roundMoney(
      Math.max(0, subtotal - dto.discount + dto.surcharge),
    );
    const summary = dto.lines
      .map((line) => `${line.qty}x ${line.name}`)
      .join(', ');

    const order = await this.prisma.$transaction(
      async (tx) => {
        if (dto.paymentMethodId) {
          const payment = await tx.paymentMethod.findFirst({
            where: { id: dto.paymentMethodId, storeId },
          });
          if (!payment) throw notFound('Forma de pagamento não encontrada.');
        }
        if (dto.priceTableId) {
          const table = await tx.priceTable.findFirst({
            where: { id: dto.priceTableId, storeId },
          });
          if (!table) throw notFound('Tabela de preço não encontrada.');
        }

        let ticketId: string | null = null;
        if (dto.ticketId) {
          const ticket = await tx.posTicket.findFirst({
            where: { id: dto.ticketId, storeId },
          });
          if (!ticket) throw notFound('Ticket não encontrado.');
          if (ticket.status === TicketStatus.cancelled) {
            throw conflict('Ticket cancelado — não dá para fechar a venda.');
          }
          ticketId = ticket.id;
        }

        const customer = await this.customers.upsertFromPos(tx, storeId, {
          name: dto.customerName,
          phone: dto.customerPhone,
          document: dto.customerDocument,
        });

        for (const line of dto.lines) {
          const isAdHoc = Boolean(
            line.isAdHoc || line.itemType === 'ad_hoc' || !line.stockId,
          );
          if (isAdHoc) {
            // Venda avulsa: Não valida no stockItem e não diminui estoque físico
            continue;
          }
          const stock = await tx.stockItem.findFirst({
            where: { id: line.stockId!, storeId },
          });
          if (!stock) {
            throw notFound(`Item de estoque não encontrado: ${line.stockId}`);
          }
          if (stock.qty < line.qty) {
            throw conflict(
              `Estoque insuficiente (${stock.qty} disponível) em ${stock.name}.`,
            );
          }
          const nextImei =
            line.imei && stock.imei === line.imei ? '' : stock.imei;
          await tx.stockItem.update({
            where: { id: stock.id },
            data: { qty: stock.qty - Math.round(line.qty), imei: nextImei },
          });
        }

        const created = await tx.salesOrder.create({
          data: {
            id: prefixedId('PED'),
            storeId,
            ticketId,
            customerId: customer?.id ?? null,
            customerName: dto.customerName.trim() || 'Consumidor Final',
            customerPhone: dto.customerPhone.trim(),
            customerDocument: (dto.customerDocument ?? '').replace(/\D/g, ''),
            productName: summary,
            amount,
            discount: dto.discount,
            surcharge: dto.surcharge,
            status: TicketStatus.sold,
            payment: `${dto.paymentName} · ${dto.priceTableName}`,
            paymentMethodId: dto.paymentMethodId ?? null,
            priceTableId: dto.priceTableId ?? null,
            sellerId: dto.sellerId?.trim() || user.id,
            sellerName: dto.sellerName?.trim() || user.name,
            idempotencyKey: dto.idempotencyKey ?? null,
            localId: dto.localId ?? null,
            lines: {
              create: dto.lines.map((line) => {
                const isAdHoc = Boolean(
                  line.isAdHoc || line.itemType === 'ad_hoc' || !line.stockId,
                );
                return {
                  id: prefixedId('SOL'),
                  stockId: isAdHoc ? null : line.stockId,
                  name: line.name,
                  qty: line.qty,
                  unitPrice: line.unitPrice,
                  imei: line.imei ?? '',
                  isAdHoc,
                  itemType: line.itemType ?? (isAdHoc ? 'ad_hoc' : 'product'),
                };
              }),
            },
          },
          include: { lines: true },
        });

        await tx.financeEntry.create({
          data: {
            id: prefixedId('FIN'),
            storeId,
            type: FinanceType.in,
            label: `Venda ${created.id} · ${summary}`,
            amount,
            source: FinanceSource.pos,
            refId: created.id,
          },
        });

        if (ticketId) {
          await tx.posTicket.update({
            where: { id: ticketId },
            data: { status: TicketStatus.sold, closedAt: new Date() },
          });
        }

        await this.cash.recordSaleInTx(
          tx,
          storeId,
          amount,
          user.name,
          `Venda ${created.id}`,
        );

        return created;
      },
      { timeout: 15000 },
    );

    return toOrderJson(order, true);
  }

  async cancelOrder(user: AuthUser, orderId: string, reason: string) {
    const storeId = user.storeId;
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findFirst({
        where: { id: orderId, storeId },
        include: { lines: true },
      });
      if (!order) throw notFound('Pedido não encontrado.');
      if (order.status === TicketStatus.cancelled) {
        throw conflict('Este pedido já foi cancelado.');
      }

      // 1. Atualiza status do pedido
      const updated = await tx.salesOrder.update({
        where: { id: order.id },
        data: {
          status: TicketStatus.cancelled,
          cancelledAt: new Date(),
          cancelReason: reason,
        },
        include: { lines: true },
      });

      // 2. Lançamento financeiro de estorno
      await tx.financeEntry.create({
        data: {
          id: prefixedId('FIN'),
          storeId,
          type: FinanceType.out,
          label: `Estorno Venda ${order.id} · ${reason}`,
          amount: order.amount,
          source: FinanceSource.pos,
          refId: order.id,
        },
      });

      // 3. Devolução de estoque para itens com cadastro (não avulsos)
      for (const line of order.lines) {
        if (!line.isAdHoc && line.stockId) {
          await tx.stockItem.updateMany({
            where: { id: line.stockId, storeId },
            data: { qty: { increment: Math.round(Number(line.qty)) } },
          });
        }
      }

      return toOrderJson(updated, true);
    });
  }

  async listTickets(storeId: string, status?: TicketStatus) {
    const where: Prisma.PosTicketWhereInput = { storeId };
    if (status) where.status = status;
    const rows = await this.prisma.posTicket.findMany({
      where,
      include: ticketInclude,
      orderBy: { createdAt: 'desc' },
    });
    return { items: rows.map(toTicketJson) };
  }

  async getTicket(storeId: string, id: string) {
    return toTicketJson(await this.findTicket(storeId, id));
  }

  async createManualTicket(storeId: string, dto: CreatePosTicketDto) {
    const row = await this.prisma.posTicket.create({
      data: {
        id: prefixedId('TCK'),
        storeId,
        source: TicketSource.manual,
        customerName: dto.customerName.trim(),
        customerPhone: dto.customerPhone.trim(),
        productName: dto.productName.trim(),
        color: dto.color ?? '',
        storage: dto.storage ?? '',
        fulfillment: dto.fulfillment ?? '',
        payment: dto.payment,
        installment: dto.installment || null,
        priceLabel: dto.priceLabel ?? '',
        attributes: dto.attributes?.length
          ? {
              create: uniqueTicketAttrs(dto.attributes).map((item) => ({
                attributeId: item.id,
                name: item.name,
                value: item.value,
              })),
            }
          : undefined,
      },
      include: ticketInclude,
    });
    return toTicketJson(row);
  }

  async patchTicket(storeId: string, id: string, dto: PatchPosTicketDto) {
    await this.findTicket(storeId, id);
    const closedAt = dto.status === TicketStatus.open ? null : new Date();
    const row = await this.prisma.posTicket.update({
      where: { id },
      data: { status: dto.status, closedAt },
      include: ticketInclude,
    });
    return toTicketJson(row);
  }

  private async findTicket(storeId: string, id: string) {
    const row = await this.prisma.posTicket.findFirst({
      where: { id, storeId },
      include: ticketInclude,
    });
    if (!row) throw notFound('Ticket não encontrado.');
    return row;
  }
}

function uniqueTicketAttrs(
  items: { id: string; name: string; value: string }[],
) {
  const seen = new Set<string>();
  const next: typeof items = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
  }
  return next;
}
