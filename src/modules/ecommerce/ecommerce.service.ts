import { Injectable } from '@nestjs/common';
import {
  EcommerceChannelId,
  EcommerceChannelKind,
  EcommerceChannelState,
  EcommerceConnectionStatus,
  EcommerceListing,
  EcommerceListingStatus,
  EcommerceOrder,
  EcommerceOrderStatus,
} from '@prisma/client';
import { conflict, notFound, validation } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { iso, isoRequired, money, roundMoney } from '../../common/utils/money';
import { optionalText } from '../../common/utils/phone';
import { decryptJson, encryptJson } from '../../common/utils/secret';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ConnectEcommerceChannelDto,
  CreateEcommerceListingDto,
  UpdateEcommerceChannelDto,
  UpdateEcommerceListingDto,
} from './dto/ecommerce.dto';

const CHANNEL_META: Record<
  EcommerceChannelId,
  { kind: EcommerceChannelKind; name: string; blurb: string; message: string; required: string[] }
> = {
  mercadolivre: {
    kind: EcommerceChannelKind.marketplace,
    name: 'Mercado Livre',
    blurb: 'Anúncios, perguntas e pedidos via API oficial ML.',
    message: 'Preencha App ID, Secret e tokens OAuth.',
    required: ['appId', 'clientSecret', 'redirectUri', 'storeName'],
  },
  shopee: {
    kind: EcommerceChannelKind.marketplace,
    name: 'Shopee',
    blurb: 'Pedidos e catálogo Shopee Open Platform.',
    message: 'Informe Partner ID, Partner Key e Shop ID.',
    required: ['partnerId', 'partnerKey', 'shopId', 'storeName'],
  },
  ifood: {
    kind: EcommerceChannelKind.marketplace,
    name: 'iFood',
    blurb: 'Pedidos de delivery / marketplace iFood Merchant.',
    message: 'Client ID, Secret e Merchant ID obrigatórios.',
    required: ['clientId', 'clientSecret', 'merchantId', 'storeName'],
  },
  amazon: {
    kind: EcommerceChannelKind.marketplace,
    name: 'Amazon',
    blurb: 'SP-API — pedidos e inventário Amazon.br.',
    message: 'Configure LWA + Seller ID + Marketplace ID.',
    required: ['lwaClientId', 'lwaClientSecret', 'refreshToken', 'sellerId', 'marketplaceId', 'storeName'],
  },
  tray: {
    kind: EcommerceChannelKind.hub,
    name: 'Tray',
    blurb: 'Hub Tray Commerce — sincroniza loja e marketplaces.',
    message: 'URL da loja + Consumer Key/Secret.',
    required: ['apiHost', 'consumerKey', 'consumerSecret', 'storeName'],
  },
};

const CHANNEL_IDS = Object.keys(CHANNEL_META) as EcommerceChannelId[];

function toListingJson(row: EcommerceListing) {
  return {
    id: row.id,
    channelId: row.channelId,
    stockId: row.stockId,
    externalId: row.externalId,
    title: row.title,
    sku: row.sku,
    price: money(row.price),
    qty: row.qty,
    images: row.images,
    status: row.status,
    syncedAt: iso(row.syncedAt) ?? '',
    message: row.message,
  };
}

function toOrderJson(row: EcommerceOrder) {
  return {
    id: row.id,
    channelId: row.channelId,
    externalId: row.externalId,
    customerName: row.customerName,
    amount: money(row.amount),
    status: row.status,
    createdAt: isoRequired(row.createdAt),
    stockId: row.stockId ?? undefined,
    listingId: row.listingId ?? undefined,
    qty: row.qty ?? undefined,
  };
}

@Injectable()
export class EcommerceService {
  constructor(private readonly prisma: PrismaService) {}

  async listChannels(storeId: string) {
    await this.ensureChannels(storeId);
    const rows = await this.prisma.ecommerceChannelState.findMany({
      where: { storeId },
    });
    const byId = new Map(rows.map((row) => [row.channelId, row]));
    return Promise.all(CHANNEL_IDS.map((id) => this.toChannelJson(byId.get(id)!)));
  }

  async getChannel(storeId: string, channelId: EcommerceChannelId) {
    const row = await this.ensureChannel(storeId, channelId);
    return this.toChannelJson(row);
  }

  async putChannel(
    storeId: string,
    channelId: EcommerceChannelId,
    dto: UpdateEcommerceChannelDto,
  ) {
    const current = await this.ensureChannel(storeId, channelId);
    const credentials = {
      ...decryptJson(current.credentialsEnc),
      ...(dto.credentials ?? {}),
    };
    const storeName =
      dto.storeName !== undefined
        ? optionalText(dto.storeName)
        : optionalText(credentials.storeName) || current.storeName;
    const row = await this.prisma.ecommerceChannelState.update({
      where: { storeId_channelId: { storeId, channelId } },
      data: {
        storeName,
        credentialsEnc: encryptJson(credentials),
        message: 'Credenciais salvas. Clique em Conectar para validar.',
      },
    });
    return this.toChannelJson(row);
  }

  async connect(
    storeId: string,
    channelId: EcommerceChannelId,
    dto: ConnectEcommerceChannelDto,
  ) {
    const current = await this.ensureChannel(storeId, channelId);
    const credentials = {
      ...decryptJson(current.credentialsEnc),
      ...(dto.credentials ?? {}),
    };
    const missing = CHANNEL_META[channelId].required.filter(
      (key) => !String(credentials[key] ?? '').trim(),
    );
    if (missing.length) {
      throw validation(`Preencha: ${missing.join(', ')}.`);
    }
    const row = await this.prisma.ecommerceChannelState.update({
      where: { storeId_channelId: { storeId, channelId } },
      data: {
        status: EcommerceConnectionStatus.connected,
        storeName: optionalText(credentials.storeName) || current.storeName,
        credentialsEnc: encryptJson(credentials),
        lastSyncAt: new Date(),
        message: `Conectado a ${CHANNEL_META[channelId].name} (MVP). Tokens reais serão renovados no Nest.`,
      },
    });
    return this.toChannelJson(row);
  }

  async disconnect(storeId: string, channelId: EcommerceChannelId) {
    await this.ensureChannel(storeId, channelId);
    const row = await this.prisma.ecommerceChannelState.update({
      where: { storeId_channelId: { storeId, channelId } },
      data: {
        status: EcommerceConnectionStatus.disconnected,
        lastSyncAt: null,
        message: `Desconectado. Credenciais mantidas para reconectar ${CHANNEL_META[channelId].name}.`,
      },
    });
    return this.toChannelJson(row);
  }

  async sync(storeId: string, channelId: EcommerceChannelId) {
    const current = await this.ensureChannel(storeId, channelId);
    if (current.status !== EcommerceConnectionStatus.connected) {
      throw conflict('Conecte o canal antes de sincronizar.');
    }
    const now = new Date();
    const listings = await this.prisma.ecommerceListing.findMany({
      where: { storeId, channelId },
    });
    let updated = 0;
    let skippedNoImage = 0;
    for (const listing of listings) {
      if (listing.status === EcommerceListingStatus.paused) continue;
      const stock = await this.prisma.stockItem.findFirst({
        where: { id: listing.stockId, storeId },
        include: { images: { orderBy: { sort: 'asc' } } },
      });
      if (!stock) {
        await this.prisma.ecommerceListing.update({
          where: { id: listing.id },
          data: {
            status: EcommerceListingStatus.error,
            message: 'Produto removido do estoque.',
            syncedAt: now,
          },
        });
        continue;
      }
      const images = stock.images.map((item) => item.url).filter(Boolean);
      if (!images.length) {
        skippedNoImage += 1;
        await this.prisma.ecommerceListing.update({
          where: { id: listing.id },
          data: {
            status: EcommerceListingStatus.error,
            message: 'Sem imagem no estoque — plataformas exigem foto.',
            syncedAt: now,
          },
        });
        continue;
      }
      updated += 1;
      await this.prisma.ecommerceListing.update({
        where: { id: listing.id },
        data: {
          title: stock.name,
          sku: stock.sku || stock.id,
          price: stock.price,
          qty: stock.qty,
          images,
          status: EcommerceListingStatus.active,
          syncedAt: now,
          message: 'Sincronizado com estoque (qty · preço · imagens).',
        },
      });
    }
    const row = await this.prisma.ecommerceChannelState.update({
      where: { storeId_channelId: { storeId, channelId } },
      data: {
        lastSyncAt: now,
        message: `Sync estoque: ${updated} anúncio(s)${
          skippedNoImage ? ` · ${skippedNoImage} sem imagem` : ''
        }.`,
      },
    });
    return this.toChannelJson(row);
  }

  async listListings(storeId: string, channelId?: EcommerceChannelId) {
    const rows = await this.prisma.ecommerceListing.findMany({
      where: { storeId, ...(channelId ? { channelId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toListingJson);
  }

  async getListing(storeId: string, id: string) {
    const row = await this.prisma.ecommerceListing.findFirst({
      where: { id, storeId },
    });
    if (!row) throw notFound('Anúncio não encontrado.');
    return toListingJson(row);
  }

  async createListing(storeId: string, dto: CreateEcommerceListingDto) {
    const channel = await this.ensureChannel(storeId, dto.channelId);
    if (channel.status !== EcommerceConnectionStatus.connected) {
      throw conflict('Conecte o canal antes de publicar.');
    }
    const stock = await this.prisma.stockItem.findFirst({
      where: { id: dto.stockId, storeId },
      include: { images: { orderBy: { sort: 'asc' } } },
    });
    if (!stock) throw validation('Produto não encontrado no estoque.');
    const images =
      dto.images?.map((item) => item.trim()).filter(Boolean) ??
      stock.images.map((item) => item.url).filter(Boolean);
    if (!images.length) {
      throw validation(
        'Inclua ao menos 1 imagem no cadastro do produto (Estoque) para publicar nas plataformas.',
      );
    }
    const existing = await this.prisma.ecommerceListing.findFirst({
      where: { storeId, channelId: dto.channelId, stockId: stock.id },
    });
    const data = {
      channelId: dto.channelId,
      stockId: stock.id,
      externalId:
        optionalText(dto.externalId) ||
        existing?.externalId ||
        `${dto.channelId.toUpperCase()}-${stock.sku || stock.id}`,
      title: optionalText(dto.title) || stock.name,
      sku: optionalText(dto.sku) || stock.sku || stock.id,
      price: dto.price ?? stock.price,
      qty: dto.qty ?? stock.qty,
      images,
      status: dto.status ?? EcommerceListingStatus.active,
      syncedAt: new Date(),
      message: `Publicado a partir do estoque · ${images.length} imagem(ns)`,
    };
    const row = existing
      ? await this.prisma.ecommerceListing.update({ where: { id: existing.id }, data })
      : await this.prisma.ecommerceListing.create({
          data: { id: prefixedId('LST'), storeId, ...data },
        });
    return toListingJson(row);
  }

  async updateListing(storeId: string, id: string, dto: UpdateEcommerceListingDto) {
    await this.getListing(storeId, id);
    const row = await this.prisma.ecommerceListing.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.sku !== undefined ? { sku: optionalText(dto.sku) } : {}),
        ...(dto.price !== undefined ? { price: roundMoney(dto.price) } : {}),
        ...(dto.qty !== undefined ? { qty: dto.qty } : {}),
        ...(dto.images !== undefined
          ? { images: dto.images.map((item) => item.trim()).filter(Boolean) }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.message !== undefined ? { message: optionalText(dto.message) } : {}),
        syncedAt: new Date(),
      },
    });
    return toListingJson(row);
  }

  async removeListing(storeId: string, id: string) {
    await this.getListing(storeId, id);
    await this.prisma.ecommerceListing.delete({ where: { id } });
    return { id, deleted: true };
  }

  async listOrders(storeId: string, channelId?: EcommerceChannelId) {
    const rows = await this.prisma.ecommerceOrder.findMany({
      where: { storeId, ...(channelId ? { channelId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toOrderJson);
  }

  private async toChannelJson(row: EcommerceChannelState) {
    const meta = CHANNEL_META[row.channelId];
    const [openOrders, activeListings] = await Promise.all([
      this.prisma.ecommerceOrder.count({
        where: {
          storeId: row.storeId,
          channelId: row.channelId,
          status: { in: [EcommerceOrderStatus.new, EcommerceOrderStatus.paid] },
        },
      }),
      this.prisma.ecommerceListing.count({
        where: {
          storeId: row.storeId,
          channelId: row.channelId,
          status: EcommerceListingStatus.active,
        },
      }),
    ]);
    return {
      id: row.channelId,
      kind: row.kind,
      name: meta.name,
      blurb: meta.blurb,
      status: row.status,
      storeName: row.storeName,
      lastSyncAt: iso(row.lastSyncAt) ?? '',
      message: row.message || meta.message,
      openOrders,
      activeListings,
      credentials: decryptJson(row.credentialsEnc),
    };
  }

  private async ensureChannels(storeId: string) {
    for (const id of CHANNEL_IDS) {
      await this.ensureChannel(storeId, id);
    }
  }

  private async ensureChannel(storeId: string, channelId: EcommerceChannelId) {
    const existing = await this.prisma.ecommerceChannelState.findUnique({
      where: { storeId_channelId: { storeId, channelId } },
    });
    if (existing) return existing;
    const meta = CHANNEL_META[channelId];
    return this.prisma.ecommerceChannelState.create({
      data: {
        storeId,
        channelId,
        kind: meta.kind,
        status: EcommerceConnectionStatus.disconnected,
        message: meta.message,
      },
    });
  }
}
