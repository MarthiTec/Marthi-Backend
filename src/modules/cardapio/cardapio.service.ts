import { Injectable } from '@nestjs/common';
import {
  CardapioOrderStatus,
  CardapioOrderType,
  ReservationStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { notFound } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { isoRequired, money } from '../../common/utils/money';
import {
  CreateCardapioCategoryDto,
  CreateCardapioItemDto,
  CreateCardapioOrderDto,
  CreateCardapioReservationDto,
  UpdateCardapioCategoryDto,
  UpdateCardapioConfigDto,
  UpdateCardapioItemDto,
  UpdateCardapioOrderStatusDto,
  UpdateCardapioReservationStatusDto,
} from './dto/cardapio.dto';

@Injectable()
export class CardapioService {
  constructor(private readonly prisma: PrismaService) {}

  // =================== CONFIG ===================

  async getConfig(storeId: string) {
    const row = await this.prisma.cardapioConfig.findUnique({
      where: { storeId },
    });
    if (!row) {
      return {
        storeId,
        slug: `loja-${storeId.slice(0, 8).toLowerCase()}`,
        displayName: '',
        description: '',
        bannerUrl: null,
        logoUrl: null,
        primaryColor: '#e11d48',
        acceptOrders: true,
        acceptReservations: true,
        deliveryFee: 0,
        minOrderValue: 0,
        openingHours: {},
        whatsappNumber: '',
        settings: {},
      };
    }
    return {
      ...row,
      deliveryFee: money(row.deliveryFee),
      minOrderValue: money(row.minOrderValue),
    };
  }

  async updateConfig(storeId: string, dto: UpdateCardapioConfigDto) {
    const defaultSlug = `loja-${storeId.slice(0, 8).toLowerCase()}`;
    const row = await this.prisma.cardapioConfig.upsert({
      where: { storeId },
      create: {
        storeId,
        slug: dto.slug?.trim() || defaultSlug,
        displayName: dto.displayName?.trim() || '',
        description: dto.description?.trim() || '',
        bannerUrl: dto.bannerUrl ?? null,
        logoUrl: dto.logoUrl ?? null,
        primaryColor: dto.primaryColor?.trim() || '#e11d48',
        acceptOrders: dto.acceptOrders ?? true,
        acceptReservations: dto.acceptReservations ?? true,
        deliveryFee: dto.deliveryFee ?? 0,
        minOrderValue: dto.minOrderValue ?? 0,
        openingHours: dto.openingHours ?? {},
        whatsappNumber: dto.whatsappNumber?.trim() || '',
        settings: dto.settings ?? {},
      },
      update: {
        ...(dto.slug !== undefined ? { slug: dto.slug.trim() } : {}),
        ...(dto.displayName !== undefined
          ? { displayName: dto.displayName.trim() }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.bannerUrl !== undefined ? { bannerUrl: dto.bannerUrl } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        ...(dto.primaryColor !== undefined
          ? { primaryColor: dto.primaryColor.trim() }
          : {}),
        ...(dto.acceptOrders !== undefined
          ? { acceptOrders: dto.acceptOrders }
          : {}),
        ...(dto.acceptReservations !== undefined
          ? { acceptReservations: dto.acceptReservations }
          : {}),
        ...(dto.deliveryFee !== undefined
          ? { deliveryFee: dto.deliveryFee }
          : {}),
        ...(dto.minOrderValue !== undefined
          ? { minOrderValue: dto.minOrderValue }
          : {}),
        ...(dto.openingHours !== undefined
          ? { openingHours: dto.openingHours }
          : {}),
        ...(dto.whatsappNumber !== undefined
          ? { whatsappNumber: dto.whatsappNumber.trim() }
          : {}),
        ...(dto.settings !== undefined ? { settings: dto.settings } : {}),
      },
    });

    return {
      ...row,
      deliveryFee: money(row.deliveryFee),
      minOrderValue: money(row.minOrderValue),
    };
  }

  // =================== CATEGORIES ===================

  async listCategories(storeId: string) {
    const rows = await this.prisma.cardapioCategory.findMany({
      where: { storeId },
      orderBy: { sortOrder: 'asc' },
    });
    return rows;
  }

  async createCategory(storeId: string, dto: CreateCardapioCategoryDto) {
    return this.prisma.cardapioCategory.create({
      data: {
        id: prefixedId('CAT'),
        storeId,
        name: dto.name.trim(),
        description: dto.description?.trim() || '',
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async updateCategory(
    storeId: string,
    id: string,
    dto: UpdateCardapioCategoryDto,
  ) {
    const current = await this.prisma.cardapioCategory.findFirst({
      where: { id, storeId },
    });
    if (!current) throw notFound('Categoria não encontrada.');

    return this.prisma.cardapioCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async deleteCategory(storeId: string, id: string) {
    const current = await this.prisma.cardapioCategory.findFirst({
      where: { id, storeId },
    });
    if (!current) throw notFound('Categoria não encontrada.');

    await this.prisma.cardapioCategory.delete({ where: { id } });
    return { success: true };
  }

  // =================== ITEMS ===================

  async listItems(storeId: string, categoryId?: string) {
    const where: any = { storeId };
    if (categoryId) where.categoryId = categoryId;

    const rows = await this.prisma.cardapioItem.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return rows.map((r) => ({
      ...r,
      price: money(r.price),
      options: (r.options as any[]) ?? [],
    }));
  }

  async getItem(storeId: string, id: string) {
    const row = await this.prisma.cardapioItem.findFirst({
      where: { id, storeId },
    });
    if (!row) throw notFound('Item do cardápio não encontrado.');
    return {
      ...row,
      price: money(row.price),
      options: (row.options as any[]) ?? [],
    };
  }

  async createItem(storeId: string, dto: CreateCardapioItemDto) {
    const row = await this.prisma.cardapioItem.create({
      data: {
        id: prefixedId('CIT'),
        storeId,
        categoryId: dto.categoryId ?? null,
        stockId: dto.stockId ?? null,
        name: dto.name.trim(),
        description: dto.description?.trim() || '',
        price: dto.price,
        imageUrl: dto.imageUrl ?? null,
        active: dto.active ?? true,
        isFeatured: dto.isFeatured ?? false,
        badge: dto.badge?.trim() || '',
        sortOrder: dto.sortOrder ?? 0,
        options: dto.options ?? [],
      },
    });
    return {
      ...row,
      price: money(row.price),
      options: (row.options as any[]) ?? [],
    };
  }

  async updateItem(storeId: string, id: string, dto: UpdateCardapioItemDto) {
    const current = await this.prisma.cardapioItem.findFirst({
      where: { id, storeId },
    });
    if (!current) throw notFound('Item do cardápio não encontrado.');

    const row = await this.prisma.cardapioItem.update({
      where: { id },
      data: {
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.stockId !== undefined ? { stockId: dto.stockId } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
        ...(dto.badge !== undefined ? { badge: dto.badge.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.options !== undefined ? { options: dto.options } : {}),
      },
    });

    return {
      ...row,
      price: money(row.price),
      options: (row.options as any[]) ?? [],
    };
  }

  async deleteItem(storeId: string, id: string) {
    const current = await this.prisma.cardapioItem.findFirst({
      where: { id, storeId },
    });
    if (!current) throw notFound('Item não encontrado.');
    await this.prisma.cardapioItem.delete({ where: { id } });
    return { success: true };
  }

  // =================== ORDERS ===================

  async listOrders(storeId: string, status?: CardapioOrderStatus) {
    const where: any = { storeId };
    if (status) where.status = status;

    const rows = await this.prisma.cardapioOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      ...r,
      subtotal: money(r.subtotal),
      deliveryFee: money(r.deliveryFee),
      totalAmount: money(r.totalAmount),
      changeFor: r.changeFor ? money(r.changeFor) : undefined,
      createdAt: isoRequired(r.createdAt),
      updatedAt: isoRequired(r.updatedAt),
    }));
  }

  async createOrder(storeId: string, dto: CreateCardapioOrderDto) {
    const count = await this.prisma.cardapioOrder.count({ where: { storeId } });
    const orderNumber = `PED-${String(count + 1).padStart(4, '0')}`;

    const row = await this.prisma.cardapioOrder.create({
      data: {
        id: prefixedId('CORD'),
        storeId,
        orderNumber,
        type: dto.type ?? CardapioOrderType.dine_in,
        status: CardapioOrderStatus.pending,
        tableNumber: dto.tableNumber?.trim() || null,
        customerName: dto.customerName.trim(),
        customerPhone: dto.customerPhone.trim(),
        address: dto.address?.trim() || '',
        notes: dto.notes?.trim() || '',
        items: dto.items ?? [],
        subtotal: dto.subtotal,
        deliveryFee: dto.deliveryFee ?? 0,
        totalAmount: dto.totalAmount,
        paymentMethod: dto.paymentMethod?.trim() || '',
        changeFor: dto.changeFor ?? null,
      },
    });

    return {
      ...row,
      subtotal: money(row.subtotal),
      deliveryFee: money(row.deliveryFee),
      totalAmount: money(row.totalAmount),
      changeFor: row.changeFor ? money(row.changeFor) : undefined,
      createdAt: isoRequired(row.createdAt),
      updatedAt: isoRequired(row.updatedAt),
    };
  }

  async updateOrderStatus(
    storeId: string,
    id: string,
    dto: UpdateCardapioOrderStatusDto,
  ) {
    const current = await this.prisma.cardapioOrder.findFirst({
      where: { id, storeId },
    });
    if (!current) throw notFound('Pedido do cardápio não encontrado.');

    const row = await this.prisma.cardapioOrder.update({
      where: { id },
      data: { status: dto.status },
    });

    return {
      ...row,
      subtotal: money(row.subtotal),
      deliveryFee: money(row.deliveryFee),
      totalAmount: money(row.totalAmount),
      changeFor: row.changeFor ? money(row.changeFor) : undefined,
      createdAt: isoRequired(row.createdAt),
      updatedAt: isoRequired(row.updatedAt),
    };
  }

  // =================== RESERVATIONS ===================

  async listReservations(storeId: string, status?: ReservationStatus) {
    const where: any = { storeId };
    if (status) where.status = status;

    const rows = await this.prisma.cardapioReservation.findMany({
      where,
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });

    return rows.map((r) => ({
      ...r,
      createdAt: isoRequired(r.createdAt),
      updatedAt: isoRequired(r.updatedAt),
    }));
  }

  async createReservation(storeId: string, dto: CreateCardapioReservationDto) {
    const row = await this.prisma.cardapioReservation.create({
      data: {
        id: prefixedId('RES'),
        storeId,
        customerName: dto.customerName.trim(),
        customerPhone: dto.customerPhone.trim(),
        partySize: dto.partySize,
        date: dto.date.trim(),
        time: dto.time.trim(),
        tableNumber: dto.tableNumber?.trim() || null,
        status: ReservationStatus.pending,
        notes: dto.notes?.trim() || '',
      },
    });

    return {
      ...row,
      createdAt: isoRequired(row.createdAt),
      updatedAt: isoRequired(row.updatedAt),
    };
  }

  async updateReservationStatus(
    storeId: string,
    id: string,
    dto: UpdateCardapioReservationStatusDto,
  ) {
    const current = await this.prisma.cardapioReservation.findFirst({
      where: { id, storeId },
    });
    if (!current) throw notFound('Reserva não encontrada.');

    const row = await this.prisma.cardapioReservation.update({
      where: { id },
      data: { status: dto.status },
    });

    return {
      ...row,
      createdAt: isoRequired(row.createdAt),
      updatedAt: isoRequired(row.updatedAt),
    };
  }

  // =================== PUBLIC ENDPOINTS ===================

  async getPublicCatalog(slug: string) {
    const config = await this.prisma.cardapioConfig.findUnique({
      where: { slug },
      include: {
        store: { select: { tradeName: true, phone: true } },
      },
    });
    if (!config) throw notFound('Cardápio digital não encontrado.');

    const categories = await this.prisma.cardapioCategory.findMany({
      where: { storeId: config.storeId, active: true },
      orderBy: { sortOrder: 'asc' },
    });

    const items = await this.prisma.cardapioItem.findMany({
      where: { storeId: config.storeId, active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return {
      storeName: config.displayName || config.store.tradeName,
      storePhone: config.whatsappNumber || config.store.phone,
      config: {
        ...config,
        deliveryFee: money(config.deliveryFee),
        minOrderValue: money(config.minOrderValue),
      },
      categories,
      items: items.map((i) => ({
        ...i,
        price: money(i.price),
        options: (i.options as any[]) ?? [],
      })),
    };
  }

  async createPublicOrder(slug: string, dto: CreateCardapioOrderDto) {
    const config = await this.prisma.cardapioConfig.findUnique({
      where: { slug },
    });
    if (!config) throw notFound('Cardápio não encontrado.');
    return this.createOrder(config.storeId, dto);
  }

  async createPublicReservation(
    slug: string,
    dto: CreateCardapioReservationDto,
  ) {
    const config = await this.prisma.cardapioConfig.findUnique({
      where: { slug },
    });
    if (!config) throw notFound('Cardápio não encontrado.');
    return this.createReservation(config.storeId, dto);
  }
}
