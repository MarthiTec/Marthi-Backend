import { Injectable } from '@nestjs/common';
import {
  Prisma,
  StockCondition,
  StockItem,
  StockItemAttribute,
  StockItemImage,
  StockKind,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { conflict, notFound, validation } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { money } from '../../common/utils/money';
import { optionalText } from '../../common/utils/phone';
import { CreateStockDto, UpdateStockDto } from './dto/stock.dto';

const ATTR_COR = 'ATTR-COR';
const ATTR_CAP = 'ATTR-CAP';

type StockRow = StockItem & {
  attributes: StockItemAttribute[];
  images: StockItemImage[];
};

export function toStockJson(row: StockRow) {
  const attrs: Record<string, string> = {};
  for (const item of row.attributes) attrs[item.attributeId] = item.value;
  const images = [...row.images]
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.url);
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    imei: row.imei,
    color: row.color || attrs[ATTR_COR] || '',
    capacity: row.capacity || attrs[ATTR_CAP] || '',
    attrs,
    qty: row.qty,
    minQty: row.minQty,
    cost: money(row.cost),
    price: money(row.price),
    kind: row.kind,
    condition: row.condition,
    sourceWorkOrderId: row.sourceWorkOrderId ?? undefined,
    showOnTotem: row.showOnTotem,
    images,
    supplierId: row.supplierId ?? undefined,
    fiscalClassificationId: row.fiscalClassificationId ?? undefined,
    warehouseId: row.warehouseId ?? undefined,
    trackLot: row.trackLot,
    isKit: row.isKit,
  };
}

const stockInclude = {
  attributes: true,
  images: { orderBy: { sort: 'asc' as const } },
};

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    storeId: string,
    query: {
      kind?: StockKind;
      condition?: StockCondition;
      q?: string;
      low?: string | boolean;
    },
  ) {
    const where: Prisma.StockItemWhereInput = { storeId };
    if (query.kind) where.kind = query.kind;
    if (query.condition) where.condition = query.condition;
    const needle = query.q?.trim();
    if (needle) {
      where.OR = [
        { name: { contains: needle, mode: 'insensitive' } },
        { sku: { contains: needle, mode: 'insensitive' } },
        { barcode: { contains: needle, mode: 'insensitive' } },
        { imei: { contains: needle, mode: 'insensitive' } },
        { id: { equals: needle } },
      ];
    }

    const rows = await this.prisma.stockItem.findMany({
      where,
      include: stockInclude,
      orderBy: { name: 'asc' },
    });

    const low =
      query.low === true || query.low === 'true' || query.low === '1';
    const filtered = low
      ? rows.filter((item) => item.qty <= item.minQty)
      : rows;
    return filtered.map(toStockJson);
  }

  async lookup(storeId: string, code: string) {
    const needle = code.trim();
    if (!needle) throw notFound('Informe o código de busca.');

    const exact = await this.prisma.stockItem.findFirst({
      where: {
        storeId,
        OR: [
          { id: needle },
          { sku: needle },
          { barcode: needle },
          { imei: needle },
        ],
      },
      include: stockInclude,
    });
    if (exact) return toStockJson(exact);

    const named = await this.prisma.stockItem.findMany({
      where: {
        storeId,
        name: { contains: needle, mode: 'insensitive' },
      },
      include: stockInclude,
    });
    if (named.length === 1) return toStockJson(named[0]);
    if (named.length === 0) throw notFound('Item de estoque não encontrado.');
    throw conflict('Mais de um item corresponde ao nome. Use SKU, código ou ID.', {
      count: named.length,
    });
  }

  async get(storeId: string, id: string) {
    return toStockJson(await this.findOwned(storeId, id));
  }

  async create(storeId: string, dto: CreateStockDto) {
    await this.assertWarehouse(storeId, dto.warehouseId);
    await this.assertFiscalClassification(storeId, dto.fiscalClassificationId);
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.stockItem.create({
        data: {
          id: prefixedId('STK'),
          storeId,
          name: dto.name.trim(),
          kind: dto.kind,
          sku: optionalText(dto.sku),
          barcode: optionalText(dto.barcode),
          imei: optionalText(dto.imei),
          color: optionalText(dto.color),
          capacity: optionalText(dto.capacity),
          qty: dto.qty ?? 0,
          minQty: dto.minQty ?? 0,
          cost: dto.cost ?? 0,
          price: dto.price ?? 0,
          condition: dto.condition ?? StockCondition.new,
          showOnTotem: dto.showOnTotem ?? false,
          supplierId: emptyToNull(dto.supplierId),
          fiscalClassificationId: emptyToNull(dto.fiscalClassificationId),
          warehouseId: emptyToNull(dto.warehouseId),
          trackLot: dto.trackLot ?? false,
          isKit: dto.isKit ?? false,
        },
      });
      await this.syncAttrs(tx, storeId, created.id, dto.attrs);
      await this.syncImages(tx, created.id, dto.images);
      return tx.stockItem.findFirstOrThrow({
        where: { id: created.id },
        include: stockInclude,
      });
    });
    return toStockJson(row);
  }

  async update(storeId: string, id: string, dto: UpdateStockDto) {
    await this.findOwned(storeId, id);
    if (dto.warehouseId !== undefined) {
      await this.assertWarehouse(storeId, dto.warehouseId);
    }
    if (dto.fiscalClassificationId !== undefined) {
      await this.assertFiscalClassification(storeId, dto.fiscalClassificationId);
    }
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.stockItem.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
          ...(dto.sku !== undefined ? { sku: optionalText(dto.sku) } : {}),
          ...(dto.barcode !== undefined
            ? { barcode: optionalText(dto.barcode) }
            : {}),
          ...(dto.imei !== undefined ? { imei: optionalText(dto.imei) } : {}),
          ...(dto.color !== undefined ? { color: optionalText(dto.color) } : {}),
          ...(dto.capacity !== undefined
            ? { capacity: optionalText(dto.capacity) }
            : {}),
          ...(dto.qty !== undefined ? { qty: dto.qty } : {}),
          ...(dto.minQty !== undefined ? { minQty: dto.minQty } : {}),
          ...(dto.cost !== undefined ? { cost: dto.cost } : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.condition !== undefined ? { condition: dto.condition } : {}),
          ...(dto.showOnTotem !== undefined
            ? { showOnTotem: dto.showOnTotem }
            : {}),
          ...(dto.supplierId !== undefined
            ? { supplierId: emptyToNull(dto.supplierId) }
            : {}),
          ...(dto.fiscalClassificationId !== undefined
            ? { fiscalClassificationId: emptyToNull(dto.fiscalClassificationId) }
            : {}),
          ...(dto.warehouseId !== undefined
            ? { warehouseId: emptyToNull(dto.warehouseId) }
            : {}),
          ...(dto.trackLot !== undefined ? { trackLot: dto.trackLot } : {}),
          ...(dto.isKit !== undefined ? { isKit: dto.isKit } : {}),
        },
      });
      if (dto.attrs) await this.syncAttrs(tx, storeId, id, dto.attrs);
      if (dto.images) await this.syncImages(tx, id, dto.images);
      return tx.stockItem.findFirstOrThrow({
        where: { id },
        include: stockInclude,
      });
    });
    return toStockJson(row);
  }

  async remove(storeId: string, id: string) {
    await this.findOwned(storeId, id);
    try {
      await this.prisma.stockItem.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw conflict('Item vinculado a pedido ou OS — não pode ser removido.');
      }
      throw error;
    }
    return { id, deleted: true };
  }

  private async assertFiscalClassification(
    storeId: string,
    fiscalClassificationId?: string | null,
  ) {
    const id = emptyToNull(fiscalClassificationId);
    if (!id) return;
    const row = await this.prisma.fiscalClassification.findFirst({
      where: { id, storeId },
    });
    if (!row) throw validation('Classificação fiscal inválida.');
  }

  private async assertWarehouse(storeId: string, warehouseId?: string | null) {
    const id = emptyToNull(warehouseId);
    if (!id) return;
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, storeId },
    });
    if (!warehouse) throw validation('Almoxarifado inválido.');
  }

  private async findOwned(storeId: string, id: string) {
    const row = await this.prisma.stockItem.findFirst({
      where: { id, storeId },
      include: stockInclude,
    });
    if (!row) throw notFound('Item de estoque não encontrado.');
    return row;
  }

  private async syncAttrs(
    tx: Prisma.TransactionClient,
    storeId: string,
    stockId: string,
    attrs?: Record<string, string>,
  ) {
    if (!attrs) return;
    await tx.stockItemAttribute.deleteMany({ where: { stockId } });
    const entries = Object.entries(attrs).filter(([, value]) => value?.trim());
    if (entries.length === 0) return;
    const ids = entries.map(([attributeId]) => attributeId);
    const found = await tx.productAttribute.findMany({
      where: { storeId, id: { in: ids } },
      select: { id: true },
    });
    const allowed = new Set(found.map((item) => item.id));
    await tx.stockItemAttribute.createMany({
      data: entries
        .filter(([attributeId]) => allowed.has(attributeId))
        .map(([attributeId, value]) => ({
          stockId,
          attributeId,
          value: value.trim(),
        })),
    });
  }

  private async syncImages(
    tx: Prisma.TransactionClient,
    stockId: string,
    images?: string[],
  ) {
    if (!images) return;
    await tx.stockItemImage.deleteMany({ where: { stockId } });
    const urls = images.map((item) => item.trim()).filter(Boolean);
    if (urls.length === 0) return;
    await tx.stockItemImage.createMany({
      data: urls.map((url, sort) => ({
        id: prefixedId('IMG'),
        stockId,
        url,
        sort,
      })),
    });
  }
}

function emptyToNull(value: string | undefined | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
