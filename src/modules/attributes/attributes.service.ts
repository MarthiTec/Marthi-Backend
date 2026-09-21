import { Injectable } from '@nestjs/common';
import { Prisma, ProductAttribute, ProductAttributeValue } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { conflict, notFound, validation } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { money } from '../../common/utils/money';
import { CreateAttributeDto, UpdateAttributeDto } from './dto/attribute.dto';

const MAX_ATTRIBUTES = 5;

type AttributeRow = ProductAttribute & { values: ProductAttributeValue[] };

export function toAttributeJson(row: AttributeRow) {
  const values = [...row.values].sort((a, b) => a.sort - b.sort);
  const priceDeltas: Record<string, number> = {};
  for (const item of values) {
    const delta = money(item.priceDelta);
    if (delta !== 0) priceDeltas[item.value] = delta;
  }
  return {
    id: row.id,
    name: row.name,
    values: values.map((item) => item.value),
    priceDeltas,
    useOnTotem: row.useOnTotem,
    filterOnTotem: row.filterOnTotem,
    useOnStock: row.useOnStock,
    sort: row.sort,
    active: row.active,
  };
}

@Injectable()
export class AttributesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(storeId: string) {
    const rows = await this.prisma.productAttribute.findMany({
      where: { storeId },
      include: { values: true },
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    });
    return rows.map(toAttributeJson);
  }

  async create(storeId: string, dto: CreateAttributeDto) {
    const count = await this.prisma.productAttribute.count({ where: { storeId } });
    if (count >= MAX_ATTRIBUTES) {
      throw conflict(`Máximo de ${MAX_ATTRIBUTES} atributos por loja.`);
    }

    const values = uniqueValues(dto.values);
    const row = await this.prisma.productAttribute.create({
      data: {
        id: prefixedId('ATTR'),
        storeId,
        name: dto.name.trim(),
        useOnTotem: dto.useOnTotem ?? true,
        filterOnTotem: dto.filterOnTotem ?? false,
        useOnStock: dto.useOnStock ?? true,
        sort: dto.sort ?? count + 1,
        active: dto.active ?? true,
        values: {
          create: values.map((value, index) => ({
            id: prefixedId('ATV'),
            value,
            priceDelta: dto.priceDeltas?.[value] ?? 0,
            sort: index,
          })),
        },
      },
      include: { values: true },
    });
    return toAttributeJson(row);
  }

  async update(storeId: string, id: string, dto: UpdateAttributeDto) {
    const current = await this.findOwned(storeId, id);
    const data: Prisma.ProductAttributeUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.useOnTotem !== undefined) data.useOnTotem = dto.useOnTotem;
    if (dto.filterOnTotem !== undefined) data.filterOnTotem = dto.filterOnTotem;
    if (dto.useOnStock !== undefined) data.useOnStock = dto.useOnStock;
    if (dto.sort !== undefined) data.sort = dto.sort;
    if (dto.active !== undefined) data.active = dto.active;

    await this.prisma.$transaction(async (tx) => {
      await tx.productAttribute.update({ where: { id }, data });
      if (dto.values) {
        const next = uniqueValues(dto.values);
        const existing = new Map(current.values.map((item) => [item.value, item]));
        for (const [index, value] of next.entries()) {
          const found = existing.get(value);
          const delta = dto.priceDeltas?.[value];
          if (found) {
            await tx.productAttributeValue.update({
              where: { id: found.id },
              data: {
                sort: index,
                ...(delta !== undefined ? { priceDelta: delta } : {}),
              },
            });
            existing.delete(value);
          } else {
            await tx.productAttributeValue.create({
              data: {
                id: prefixedId('ATV'),
                attributeId: id,
                value,
                priceDelta: delta ?? 0,
                sort: index,
              },
            });
          }
        }
        for (const leftover of existing.values()) {
          const used = await tx.productAllowedValue.count({
            where: { valueId: leftover.id },
          });
          if (used > 0) continue;
          await tx.productAttributeValue.delete({ where: { id: leftover.id } });
        }
      } else if (dto.priceDeltas) {
        for (const [value, delta] of Object.entries(dto.priceDeltas)) {
          const found = current.values.find((item) => item.value === value);
          if (!found) continue;
          await tx.productAttributeValue.update({
            where: { id: found.id },
            data: { priceDelta: delta },
          });
        }
      }
    });

    return toAttributeJson(await this.findOwned(storeId, id));
  }

  async remove(storeId: string, id: string) {
    await this.findOwned(storeId, id);
    const stockUse = await this.prisma.stockItemAttribute.count({
      where: { attributeId: id },
    });
    if (stockUse > 0) {
      throw conflict('Atributo em uso no estoque — não pode ser removido.');
    }
    await this.prisma.productAttribute.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async findOwned(storeId: string, id: string) {
    const row = await this.prisma.productAttribute.findFirst({
      where: { id, storeId },
      include: { values: true },
    });
    if (!row) throw notFound('Atributo não encontrado.');
    return row;
  }
}

function uniqueValues(values: string[]) {
  const next = values.map((item) => item.trim()).filter(Boolean);
  if (next.length === 0) throw validation('Informe ao menos um valor.');
  return [...new Set(next)];
}
