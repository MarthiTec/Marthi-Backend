import { Injectable } from '@nestjs/common';
import {
  Prisma,
  StockInvoice,
  StockInvoiceKind,
  StockInvoiceLine,
  StockInvoiceStatus,
} from '@prisma/client';
import { conflict, notFound, validation } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { iso, isoRequired, money } from '../../common/utils/money';
import { optionalText } from '../../common/utils/phone';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AddStockInvoiceLineDto,
  CreateStockInvoiceDto,
  UpdateStockInvoiceDto,
} from './dto/stock-invoice.dto';

type InvoiceRow = StockInvoice & { lines: StockInvoiceLine[] };

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toLineJson(row: StockInvoiceLine) {
  return {
    id: row.id,
    stockId: row.stockId,
    name: row.name,
    qty: row.qty,
    unitCost: money(row.unitCost),
    unitPrice: money(row.unitPrice),
  };
}

function toInvoiceJson(row: InvoiceRow) {
  return {
    id: row.id,
    kind: row.kind,
    number: row.number,
    status: row.status,
    documentPurpose: row.documentPurpose,
    supplierId: row.supplierId ?? '',
    customerName: row.customerName,
    issuedAt: row.issuedAt,
    notes: row.notes,
    lines: row.lines.map(toLineJson),
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
    postedAt: iso(row.postedAt),
  };
}

@Injectable()
export class StockInvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    storeId: string,
    query: { kind?: StockInvoiceKind; status?: StockInvoiceStatus },
  ) {
    const rows = await this.prisma.stockInvoice.findMany({
      where: {
        storeId,
        ...(query.kind ? { kind: query.kind } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toInvoiceJson);
  }

  async get(storeId: string, id: string) {
    return toInvoiceJson(await this.findOwned(storeId, id));
  }

  async create(storeId: string, dto: CreateStockInvoiceDto) {
    const supplierId = await this.resolveSupplier(
      storeId,
      dto.kind,
      dto.supplierId,
      false,
    );
    const row = await this.prisma.stockInvoice.create({
      data: {
        id: prefixedId(dto.kind === StockInvoiceKind.entry ? 'INV' : 'INV'),
        storeId,
        kind: dto.kind,
        number: optionalText(dto.number) || prefixedId('DOC'),
        documentPurpose: dto.documentPurpose,
        supplierId,
        customerName: optionalText(dto.customerName),
        issuedAt: optionalText(dto.issuedAt) || todayDate(),
        notes: optionalText(dto.notes),
      },
      include: { lines: true },
    });
    return toInvoiceJson(row);
  }

  async update(storeId: string, id: string, dto: UpdateStockInvoiceDto) {
    const current = await this.findOwned(storeId, id);
    if (current.status !== StockInvoiceStatus.draft) {
      throw conflict('Só rascunho pode ser editado.');
    }
    const supplierId =
      dto.supplierId !== undefined
        ? await this.resolveSupplier(storeId, current.kind, dto.supplierId, false)
        : undefined;
    const row = await this.prisma.stockInvoice.update({
      where: { id },
      data: {
        ...(dto.number !== undefined ? { number: dto.number.trim() } : {}),
        ...(dto.documentPurpose !== undefined
          ? { documentPurpose: dto.documentPurpose }
          : {}),
        ...(supplierId !== undefined ? { supplierId } : {}),
        ...(dto.customerName !== undefined
          ? { customerName: optionalText(dto.customerName) }
          : {}),
        ...(dto.issuedAt !== undefined
          ? { issuedAt: optionalText(dto.issuedAt) || todayDate() }
          : {}),
        ...(dto.notes !== undefined ? { notes: optionalText(dto.notes) } : {}),
      },
      include: { lines: true },
    });
    return toInvoiceJson(row);
  }

  async addLine(storeId: string, id: string, dto: AddStockInvoiceLineDto) {
    const current = await this.findOwned(storeId, id);
    if (current.status !== StockInvoiceStatus.draft) {
      throw conflict('Nota já lançada.');
    }
    const stock = await this.prisma.stockItem.findFirst({
      where: { id: dto.stockId, storeId },
    });
    if (!stock) throw validation('Item de estoque não encontrado.');
    const qty = Math.max(1, Math.floor(dto.qty));
    await this.prisma.stockInvoiceLine.create({
      data: {
        id: prefixedId('IL'),
        invoiceId: id,
        stockId: stock.id,
        name: stock.name,
        qty,
        unitCost: dto.unitCost ?? stock.cost,
        unitPrice: dto.unitPrice ?? stock.price,
      },
    });
    return toInvoiceJson(await this.findOwned(storeId, id));
  }

  async removeLine(storeId: string, id: string, lineId: string) {
    const current = await this.findOwned(storeId, id);
    if (current.status !== StockInvoiceStatus.draft) {
      throw conflict('Só rascunho pode ser editado.');
    }
    const line = current.lines.find((item) => item.id === lineId);
    if (!line) throw notFound('Linha não encontrada.');
    await this.prisma.stockInvoiceLine.delete({ where: { id: lineId } });
    return toInvoiceJson(await this.findOwned(storeId, id));
  }

  async post(storeId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.stockInvoice.findFirst({
        where: { id, storeId },
        include: { lines: true },
      });
      if (!current) throw notFound('Nota não encontrada.');
      if (current.status !== StockInvoiceStatus.draft) {
        throw conflict('Nota já processada.');
      }
      if (current.lines.length === 0) {
        throw validation('Inclua ao menos um item.');
      }
      if (current.kind === StockInvoiceKind.entry && !current.supplierId) {
        throw validation('Informe o fornecedor na entrada.');
      }
      if (current.supplierId) {
        const supplier = await tx.supplier.findFirst({
          where: { id: current.supplierId, storeId },
        });
        if (!supplier) throw validation('Fornecedor inválido.');
      }
      const direction = current.kind === StockInvoiceKind.entry ? 1 : -1;
      await this.applyStockDelta(
        tx,
        current.lines,
        direction,
        current.kind === StockInvoiceKind.entry,
      );
      const row = await tx.stockInvoice.update({
        where: { id },
        data: { status: StockInvoiceStatus.posted, postedAt: new Date() },
        include: { lines: true },
      });
      return toInvoiceJson(row);
    });
  }

  async cancel(storeId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.stockInvoice.findFirst({
        where: { id, storeId },
        include: { lines: true },
      });
      if (!current) throw notFound('Nota não encontrada.');
      if (current.status === StockInvoiceStatus.cancelled) {
        throw conflict('Já cancelada.');
      }
      if (current.status === StockInvoiceStatus.posted) {
        const reverse = current.kind === StockInvoiceKind.entry ? -1 : 1;
        await this.applyStockDelta(tx, current.lines, reverse, false);
      }
      const row = await tx.stockInvoice.update({
        where: { id },
        data: { status: StockInvoiceStatus.cancelled },
        include: { lines: true },
      });
      return toInvoiceJson(row);
    });
  }

  private async applyStockDelta(
    tx: Prisma.TransactionClient,
    lines: StockInvoiceLine[],
    direction: 1 | -1,
    updateCost: boolean,
  ) {
    for (const line of lines) {
      const stock = await tx.stockItem.findFirst({ where: { id: line.stockId } });
      if (!stock) throw validation('Item de estoque não encontrado.');
      const nextQty = stock.qty + direction * line.qty;
      if (nextQty < 0) {
        throw conflict('Estoque insuficiente.', {
          stockId: stock.id,
          available: stock.qty,
          requested: line.qty,
        });
      }
      await tx.stockItem.update({
        where: { id: stock.id },
        data: {
          qty: nextQty,
          ...(updateCost ? { cost: line.unitCost } : {}),
        },
      });
    }
  }

  private async findOwned(storeId: string, id: string) {
    const row = await this.prisma.stockInvoice.findFirst({
      where: { id, storeId },
      include: { lines: true },
    });
    if (!row) throw notFound('Nota não encontrada.');
    return row;
  }

  private async resolveSupplier(
    storeId: string,
    kind: StockInvoiceKind,
    supplierId: string | undefined,
    required: boolean,
  ) {
    const id = emptyToNull(supplierId);
    if (!id) {
      if (required && kind === StockInvoiceKind.entry) {
        throw validation('Informe o fornecedor na entrada.');
      }
      return null;
    }
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, storeId },
    });
    if (!supplier) throw validation('Fornecedor inválido.');
    return supplier.id;
  }
}
