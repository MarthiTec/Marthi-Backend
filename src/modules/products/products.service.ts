import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductAttributeValue } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DEMO_STORE_ID } from '../../common/utils/ids';

function asPublicId(id: string) {
  const numeric = Number(id);
  return Number.isInteger(numeric) ? numeric : id;
}

function money(value: Prisma.Decimal | number | string) {
  return Number(value);
}

function cartesian<T>(groups: T[][]): T[][] {
  return groups.reduce<T[][]>(
    (acc, group) =>
      acc.flatMap((combo) => group.map((item) => [...combo, item])),
    [[]],
  );
}

type AttributeValueWithMeta = ProductAttributeValue & {
  attribute: {
    id: string;
    name: string;
    useOnStock: boolean;
    useOnTotem: boolean;
  };
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(storeId = DEMO_STORE_ID) {
    const products = await this.prisma.product.findMany({
      where: { storeId, status: 'active' },
      include: {
        brand: true,
        images: { orderBy: { sort: 'asc' } },
        allowedValues: {
          include: {
            value: { include: { attribute: true } },
          },
        },
      },
      orderBy: { sort: 'asc' },
    });

    return products.map((product) => {
      const attrs: Record<string, string[]> = {};
      for (const row of product.allowedValues) {
        const attr = row.value.attribute;
        if (!attr.useOnTotem) continue;
        const list = attrs[attr.id] ?? [];
        if (!list.includes(row.value.value)) list.push(row.value.value);
        attrs[attr.id] = list;
      }

      return {
        ...this.toProduct(product),
        brandSlug: product.brand?.slug ?? null,
        brandName: product.brand?.name ?? null,
        images: product.images.map((image) => image.url),
        attrs,
      };
    });
  }

  async findById(productId: string) {
    const product = await this.requireProduct(productId);
    return this.toProduct(product);
  }

  async images(productId: string) {
    await this.requireProduct(productId);

    const images = await this.prisma.productImage.findMany({
      where: { productId: String(productId) },
      orderBy: { sort: 'asc' },
    });

    return images.map((image) => ({
      id: image.id,
      url: image.url,
      sort: image.sort,
    }));
  }

  async variants(productId: string) {
    const product = await this.requireProduct(productId);
    const id = String(product.id);

    const stockItems = await this.prisma.stockItem.findMany({
      where: { productId: id, qty: { gt: 0 } },
      include: { attributes: { include: { attribute: true } } },
    });

    if (stockItems.length > 0) {
      return stockItems.map((item, index) => {
        const attributes: Record<string, string | number> = {};
        for (const attr of item.attributes) {
          attributes[attr.attribute.name] = attr.value;
        }

        return {
          id: asPublicId(
            `${id}${index + 1}`.replace(/\D/g, '') || `${index + 1}`,
          ),
          productId: asPublicId(id),
          unitPrice: money(item.price),
          installmentPrice: this.installmentPrice(money(item.price)),
          attributes,
        };
      });
    }

    const allowed = await this.prisma.productAllowedValue.findMany({
      where: { productId: id },
      include: {
        value: { include: { attribute: true } },
      },
    });

    const groups = new Map<string, AttributeValueWithMeta[]>();
    for (const row of allowed) {
      const attribute = row.value.attribute;
      if (!attribute.useOnTotem || !attribute.useOnStock) {
        continue;
      }
      const list = groups.get(attribute.id) ?? [];
      list.push(row.value as AttributeValueWithMeta);
      groups.set(attribute.id, list);
    }

    const combos = cartesian([...groups.values()]);
    const basePrice = money(product.cashPrice);

    return combos.map((combo, index) => {
      const attributes: Record<string, string | number> = {};
      let unitPrice = basePrice;

      for (const value of combo) {
        attributes[value.attribute.name] = value.value;
        unitPrice += money(value.priceDelta);
      }

      return {
        id: Number(`${asPublicId(id)}${String(index + 1).padStart(3, '0')}`),
        productId: asPublicId(id),
        unitPrice: Math.round(unitPrice * 100) / 100,
        installmentPrice: this.installmentPrice(unitPrice),
        attributes,
      };
    });
  }

  private installmentPrice(unitPrice: number) {
    return Math.round((unitPrice / 12) * 100) / 100;
  }

  private toProduct(product: {
    id: string;
    name: string;
    brandId: string | null;
    status: string;
    reference: string | null;
    cashPrice: Prisma.Decimal;
    createdAt: Date;
    updatedAt: Date | null;
  }) {
    return {
      id: asPublicId(product.id),
      name: product.name,
      brandId: product.brandId ? asPublicId(product.brandId) : null,
      status: product.status,
      reference: product.reference,
      cashPrice: money(product.cashPrice),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt?.toISOString() ?? null,
    };
  }

  private async requireProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: String(productId) },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    return product;
  }
}
