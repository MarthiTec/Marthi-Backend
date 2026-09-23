import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ProductKit,
  ProductKitItem,
  ProductLot,
  Warehouse,
  WarehouseMove,
  WarehouseMoveKind,
} from '@prisma/client';
import { conflict, notFound, validation } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { isoRequired } from '../../common/utils/money';
import { optionalText } from '../../common/utils/phone';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateKitDto,
  CreateLotDto,
  CreateWarehouseDto,
  CreateWarehouseMoveDto,
  KitItemDto,
  UpdateKitDto,
  UpdateLotDto,
  UpdateWarehouseDto,
} from './dto/warehouse.dto';

const MOVE_LABEL: Record<WarehouseMoveKind, string> = {
  in: 'Entrada',
  out: 'Saída',
  transfer: 'Transferência',
  adjust: 'Ajuste',
};

type KitRow = ProductKit & { items: ProductKitItem[] };

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toWarehouseJson(row: Warehouse) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    address: row.address,
    active: row.active,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
  };
}

function toLotJson(row: ProductLot) {
  return {
    id: row.id,
    stockId: row.stockId,
    stockName: row.stockName,
    lotNumber: row.lotNumber,
    manufacturingDate: row.manufacturingDate,
    expiryDate: row.expiryDate,
    qty: row.qty,
    supplierId: row.supplierId ?? '',
    supplierName: row.supplierName,
    warehouseId: row.warehouseId,
    notes: row.notes,
    createdAt: isoRequired(row.createdAt),
  };
}

function toKitJson(row: KitRow) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    parentStockId: row.parentStockId ?? '',
    items: row.items.map((item) => ({
      stockId: item.stockId,
      stockName: item.stockName,
      qty: item.qty,
    })),
    active: row.active,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
  };
}

function toMoveJson(row: WarehouseMove) {
  const createdAt = isoRequired(row.createdAt);
  return {
    id: row.id,
    kind: row.kind,
    stockId: row.stockId,
    stockName: row.stockName,
    fromWarehouseId: row.fromWarehouseId ?? '',
    toWarehouseId: row.toWarehouseId ?? '',
    lotId: row.lotId ?? '',
    qty: row.qty,
    note: row.note,
    description: row.note,
    operatorName: row.operatorName,
    createdAt,
    at: createdAt,
  };
}

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async listWarehouses(storeId: string, active?: string) {
    const where: Prisma.WarehouseWhereInput = { storeId };
    if (active === 'true' || active === '1') where.active = true;
    if (active === 'false' || active === '0') where.active = false;
    const rows = await this.prisma.warehouse.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return rows.map(toWarehouseJson);
  }

  async getWarehouse(storeId: string, id: string) {
    return toWarehouseJson(await this.findWarehouse(storeId, id));
  }

  async createWarehouse(storeId: string, dto: CreateWarehouseDto) {
    const code = optionalText(dto.code) || prefixedId('ALX');
    await this.assertUniqueCode(storeId, code);
    const row = await this.prisma.warehouse.create({
      data: {
        id: prefixedId('ALX'),
        storeId,
        name: dto.name.trim(),
        code,
        address: optionalText(dto.address),
        active: dto.active ?? true,
      },
    });
    return toWarehouseJson(row);
  }

  async updateWarehouse(storeId: string, id: string, dto: UpdateWarehouseDto) {
    await this.findWarehouse(storeId, id);
    if (dto.code !== undefined) {
      await this.assertUniqueCode(storeId, dto.code.trim(), id);
    }
    const row = await this.prisma.warehouse.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.code !== undefined ? { code: dto.code.trim() } : {}),
        ...(dto.address !== undefined ? { address: optionalText(dto.address) } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
    return toWarehouseJson(row);
  }

  async removeWarehouse(storeId: string, id: string) {
    await this.findWarehouse(storeId, id);
    const row = await this.prisma.warehouse.update({
      where: { id },
      data: { active: false },
    });
    return toWarehouseJson(row);
  }

  async listLots(storeId: string, stockId?: string) {
    const rows = await this.prisma.productLot.findMany({
      where: { storeId, ...(stockId ? { stockId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toLotJson);
  }

  async createLot(storeId: string, dto: CreateLotDto) {
    const stock = await this.prisma.stockItem.findFirst({
      where: { id: dto.stockId, storeId },
    });
    if (!stock) throw validation('Item de estoque não encontrado.');
    await this.requireWarehouse(storeId, dto.warehouseId);
    let supplierId: string | null = emptyToNull(dto.supplierId);
    let supplierName = optionalText(dto.supplierName);
    if (supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: supplierId, storeId },
      });
      if (!supplier) throw validation('Fornecedor inválido.');
      supplierName = supplier.name;
    }
    const row = await this.prisma.productLot.create({
      data: {
        id: prefixedId('LOT'),
        storeId,
        stockId: stock.id,
        stockName: optionalText(dto.stockName) || stock.name,
        lotNumber: dto.lotNumber.trim(),
        manufacturingDate: optionalText(dto.manufacturingDate),
        expiryDate: optionalText(dto.expiryDate),
        qty: dto.qty,
        supplierId,
        supplierName,
        warehouseId: dto.warehouseId,
        notes: optionalText(dto.notes),
      },
    });
    return toLotJson(row);
  }

  async updateLotQty(storeId: string, id: string, dto: UpdateLotDto) {
    const current = await this.prisma.productLot.findFirst({
      where: { id, storeId },
    });
    if (!current) throw notFound('Lote não encontrado.');
    const row = await this.prisma.productLot.update({
      where: { id },
      data: { qty: dto.qty },
    });
    return toLotJson(row);
  }

  async listKits(storeId: string, active?: string) {
    const where: Prisma.ProductKitWhereInput = { storeId };
    if (active === 'true' || active === '1') where.active = true;
    if (active === 'false' || active === '0') where.active = false;
    const rows = await this.prisma.productKit.findMany({
      where,
      include: { items: true },
      orderBy: { name: 'asc' },
    });
    return rows.map(toKitJson);
  }

  async getKit(storeId: string, id: string) {
    return toKitJson(await this.findKit(storeId, id));
  }

  async createKit(storeId: string, dto: CreateKitDto) {
    if (!dto.items?.length) throw validation('Adicione ao menos um item no kit.');
    const parentStockId = await this.requireParentStock(storeId, dto.parentStockId);
    const items = await this.resolveKitItems(storeId, dto.items);
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.productKit.create({
        data: {
          id: prefixedId('KIT'),
          storeId,
          name: dto.name.trim(),
          sku: optionalText(dto.sku),
          parentStockId,
          active: dto.active ?? true,
        },
      });
      await tx.productKitItem.createMany({
        data: items.map((item) => ({
          id: prefixedId('KI'),
          kitId: created.id,
          stockId: item.stockId,
          stockName: item.stockName,
          qty: item.qty,
        })),
      });
      return tx.productKit.findFirstOrThrow({
        where: { id: created.id },
        include: { items: true },
      });
    });
    return toKitJson(row);
  }

  async updateKit(storeId: string, id: string, dto: UpdateKitDto) {
    await this.findKit(storeId, id);
    const parentStockId =
      dto.parentStockId !== undefined
        ? await this.requireParentStock(storeId, dto.parentStockId)
        : undefined;
    const items =
      dto.items !== undefined ? await this.resolveKitItems(storeId, dto.items) : undefined;
    if (items && items.length === 0) {
      throw validation('Adicione ao menos um item no kit.');
    }
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.productKit.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.sku !== undefined ? { sku: optionalText(dto.sku) } : {}),
          ...(parentStockId !== undefined ? { parentStockId } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
      });
      if (items) {
        await tx.productKitItem.deleteMany({ where: { kitId: id } });
        await tx.productKitItem.createMany({
          data: items.map((item) => ({
            id: prefixedId('KI'),
            kitId: id,
            stockId: item.stockId,
            stockName: item.stockName,
            qty: item.qty,
          })),
        });
      }
      return tx.productKit.findFirstOrThrow({
        where: { id },
        include: { items: true },
      });
    });
    return toKitJson(row);
  }

  async removeKit(storeId: string, id: string) {
    await this.findKit(storeId, id);
    const row = await this.prisma.productKit.update({
      where: { id },
      data: { active: false },
      include: { items: true },
    });
    return toKitJson(row);
  }

  async listMoves(storeId: string) {
    const rows = await this.prisma.warehouseMove.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toMoveJson);
  }

  async createMove(storeId: string, dto: CreateWarehouseMoveDto, operatorName: string) {
    const stock = await this.prisma.stockItem.findFirst({
      where: { id: dto.stockId, storeId },
    });
    if (!stock) throw validation('Item de estoque não encontrado.');
    const fromWarehouseId = emptyToNull(dto.fromWarehouseId);
    const toWarehouseId = emptyToNull(dto.toWarehouseId);
    const lotId = emptyToNull(dto.lotId);
    if (fromWarehouseId) await this.requireWarehouse(storeId, fromWarehouseId);
    if (toWarehouseId) await this.requireWarehouse(storeId, toWarehouseId);
    if (dto.kind === WarehouseMoveKind.transfer && !toWarehouseId) {
      throw validation('Informe o almoxarifado de destino.');
    }
    const note =
      optionalText(dto.note) ||
      optionalText(dto.description) ||
      MOVE_LABEL[dto.kind];

    const row = await this.prisma.$transaction(async (tx) => {
      const current = await tx.stockItem.findFirstOrThrow({
        where: { id: stock.id },
      });
      const lot = lotId
        ? await tx.productLot.findFirst({ where: { id: lotId, storeId } })
        : null;
      if (lotId && !lot) throw validation('Lote inválido.');
      if (lot && lot.stockId !== stock.id) {
        throw validation('Lote não pertence a este item.');
      }

      let nextQty = current.qty;
      if (
        dto.kind === WarehouseMoveKind.in ||
        dto.kind === WarehouseMoveKind.adjust
      ) {
        nextQty = current.qty + dto.qty;
        if (lot) {
          await tx.productLot.update({
            where: { id: lot.id },
            data: {
              qty: lot.qty + dto.qty,
              ...(toWarehouseId ? { warehouseId: toWarehouseId } : {}),
            },
          });
        }
        if (toWarehouseId) {
          await tx.stockItem.update({
            where: { id: stock.id },
            data: { qty: nextQty, warehouseId: toWarehouseId },
          });
        } else {
          await tx.stockItem.update({
            where: { id: stock.id },
            data: { qty: nextQty },
          });
        }
      } else if (dto.kind === WarehouseMoveKind.out) {
        if (current.qty < dto.qty) {
          throw conflict('Estoque insuficiente.', {
            stockId: stock.id,
            available: current.qty,
            requested: dto.qty,
          });
        }
        if (lot && lot.qty < dto.qty) {
          throw conflict('Quantidade de lote insuficiente.', {
            lotId: lot.id,
            available: lot.qty,
            requested: dto.qty,
          });
        }
        nextQty = current.qty - dto.qty;
        if (lot) {
          await tx.productLot.update({
            where: { id: lot.id },
            data: { qty: lot.qty - dto.qty },
          });
        }
        await tx.stockItem.update({
          where: { id: stock.id },
          data: { qty: nextQty },
        });
      } else {
        if (lot && toWarehouseId) {
          await tx.productLot.update({
            where: { id: lot.id },
            data: { warehouseId: toWarehouseId },
          });
        }
        if (toWarehouseId) {
          await tx.stockItem.update({
            where: { id: stock.id },
            data: { warehouseId: toWarehouseId },
          });
        }
      }

      return tx.warehouseMove.create({
        data: {
          id: prefixedId('MOV'),
          storeId,
          kind: dto.kind,
          stockId: stock.id,
          stockName: stock.name,
          fromWarehouseId,
          toWarehouseId,
          lotId,
          qty: dto.qty,
          note,
          operatorName: optionalText(dto.operatorName) || operatorName,
        },
      });
    });
    return toMoveJson(row);
  }

  private async findWarehouse(storeId: string, id: string) {
    const row = await this.prisma.warehouse.findFirst({ where: { id, storeId } });
    if (!row) throw notFound('Almoxarifado não encontrado.');
    return row;
  }

  private async requireWarehouse(storeId: string, id: string) {
    const row = await this.prisma.warehouse.findFirst({ where: { id, storeId } });
    if (!row) throw validation('Almoxarifado inválido.');
    return row;
  }

  private async assertUniqueCode(storeId: string, code: string, exceptId?: string) {
    const existing = await this.prisma.warehouse.findFirst({
      where: { storeId, code, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    });
    if (existing) throw conflict('Já existe almoxarifado com este código.');
  }

  private async findKit(storeId: string, id: string) {
    const row = await this.prisma.productKit.findFirst({
      where: { id, storeId },
      include: { items: true },
    });
    if (!row) throw notFound('Kit não encontrado.');
    return row;
  }

  private async requireParentStock(storeId: string, parentStockId?: string) {
    const id = emptyToNull(parentStockId);
    if (!id) return null;
    const stock = await this.prisma.stockItem.findFirst({
      where: { id, storeId },
    });
    if (!stock) throw validation('Produto-pai inválido.');
    return stock.id;
  }

  private async resolveKitItems(storeId: string, items: KitItemDto[]) {
    const ids = [...new Set(items.map((item) => item.stockId))];
    const stocks = await this.prisma.stockItem.findMany({
      where: { storeId, id: { in: ids } },
    });
    const byId = new Map(stocks.map((item) => [item.id, item]));
    return items.map((item) => {
      const stock = byId.get(item.stockId);
      if (!stock) throw validation('Item de estoque do kit inválido.');
      return {
        stockId: stock.id,
        stockName: optionalText(item.stockName) || stock.name,
        qty: item.qty,
      };
    });
  }
}
