import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DEMO_STORE_ID } from '../../common/utils/ids';

function asPublicId(id: string) {
  const numeric = Number(id);
  return Number.isInteger(numeric) ? numeric : id;
}

function money(value: Prisma.Decimal | number | string) {
  return Number(value);
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(storeId = DEMO_STORE_ID) {
    const products = await this.prisma.product.findMany({
      where: { storeId, status: 'active' },
      include: { brand: true },
      orderBy: { sort: 'asc' },
    });

    return products.map((product) => ({
      id: asPublicId(product.id),
      name: product.name,
      brandId: product.brandId
        ? asPublicId(product.brandId)
        : (product.brand?.slug ?? null),
      status: product.status,
      reference: product.reference,
      cashPrice: money(product.cashPrice),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt?.toISOString() ?? null,
    }));
  }

  async images(productId: string) {
    const images = await this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { sort: 'asc' },
    });

    return images.map((image) => ({
      id: image.id,
      url: image.url,
      sort: image.sort,
    }));
  }
}
