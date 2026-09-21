import { Injectable } from '@nestjs/common';
import {
  FinanceSource,
  FinanceType,
  SalesOrder,
  SalesOrderLine,
  TicketStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { conflict, notFound } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { isoRequired, money, roundMoney } from '../../common/utils/money';
import { AuthUser } from '../auth/types/auth.types';
import { CustomersService } from '../customers/customers.service';
import { ClosePosSaleDto } from './dto/close-pos-sale.dto';

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
    createdAt: isoRequired(row.createdAt),
  };
  if (withLines) {
    json.lines = (row.lines ?? []).map((line) => ({
      id: line.id,
      stockId: line.stockId,
      name: line.name,
      qty: line.qty,
      unitPrice: money(line.unitPrice),
      imei: line.imei,
    }));
  }
  return json;
}

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
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
    const subtotal = dto.lines.reduce(
      (sum, line) => sum + line.unitPrice * line.qty,
      0,
    );
    const amount = roundMoney(Math.max(0, subtotal - dto.discount + dto.surcharge));
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
          ticketId = ticket?.id ?? null;
        }

        const customer = await this.customers.upsertFromPos(tx, storeId, {
          name: dto.customerName,
          phone: dto.customerPhone,
          document: dto.customerDocument,
        });

        for (const line of dto.lines) {
          const stock = await tx.stockItem.findFirst({
            where: { id: line.stockId, storeId },
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
            data: { qty: stock.qty - line.qty, imei: nextImei },
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
            lines: {
              create: dto.lines.map((line) => ({
                id: prefixedId('SOL'),
                stockId: line.stockId,
                name: line.name,
                qty: line.qty,
                unitPrice: line.unitPrice,
                imei: line.imei ?? '',
              })),
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

        return created;
      },
      { timeout: 15000 },
    );

    return toOrderJson(order, true);
  }
}
