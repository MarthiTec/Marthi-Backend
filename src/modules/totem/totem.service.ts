import { Injectable } from '@nestjs/common';
import { TicketSource, TicketStatus, TotemClickEvent } from '@prisma/client';
import { DEMO_STORE_ID, prefixedId } from '../../common/utils/ids';
import { isoRequired } from '../../common/utils/money';
import { PrismaService } from '../../prisma/prisma.service';
import { TotemClickDto } from './dto/totem-click.dto';
import { TotemLeadDto } from './dto/totem-lead.dto';

@Injectable()
export class TotemService {
  constructor(private readonly prisma: PrismaService) {}

  async createLead(dto: TotemLeadDto) {
    const ticket = await this.prisma.posTicket.create({
      data: {
        id: prefixedId('TCK'),
        storeId: DEMO_STORE_ID,
        source: TicketSource.totem,
        customerName: dto.customerName.trim(),
        customerPhone: dto.customerPhone.trim(),
        productName: dto.productName.trim(),
        color: dto.color ?? '',
        storage: dto.storage ?? '',
        fulfillment: dto.fulfillment ?? '',
        payment: dto.payment,
        installment: dto.installment || null,
        priceLabel: dto.priceLabel,
        attributes: dto.attributes?.length
          ? {
              create: uniqueAttrs(dto.attributes).map((item) => ({
                attributeId: item.id,
                name: item.name,
                value: item.value,
              })),
            }
          : undefined,
      },
    });

    return { id: ticket.id, customerNotified: false };
  }

  async trackClick(dto: TotemClickDto) {
    const click = await this.prisma.totemClickEvent.create({
      data: {
        id: prefixedId('CLK'),
        storeId: DEMO_STORE_ID,
        productId: String(dto.productId).trim(),
        productName: dto.productName.trim() || 'Produto',
      },
    });
    const extras = await this.prisma.totemClickEvent.findMany({
      where: { storeId: DEMO_STORE_ID },
      orderBy: { createdAt: 'desc' },
      skip: CLICK_CAP,
      select: { id: true },
    });
    if (extras.length) {
      await this.prisma.totemClickEvent.deleteMany({
        where: { id: { in: extras.map((item) => item.id) } },
      });
    }
    return toClickJson(click);
  }

  async summary(storeId: string) {
    const [clicks, tickets] = await Promise.all([
      this.prisma.totemClickEvent.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        take: CLICK_CAP,
      }),
      this.prisma.posTicket.findMany({
        where: { storeId, source: TicketSource.totem },
        orderBy: { createdAt: 'desc' },
        take: TICKET_LOOKBACK,
        select: {
          customerName: true,
          customerPhone: true,
          productName: true,
          status: true,
          createdAt: true,
          closedAt: true,
        },
      }),
    ]);

    const today = todayKey();
    const rankingMap = new Map<
      string,
      { productId: string; productName: string; clicks: number; clicksToday: number }
    >();
    let clicksToday = 0;
    for (const click of clicks) {
      const key = click.productId || click.productName;
      const current = rankingMap.get(key) ?? {
        productId: click.productId,
        productName: click.productName,
        clicks: 0,
        clicksToday: 0,
      };
      current.clicks += 1;
      if (dayKey(click.createdAt) === today) {
        current.clicksToday += 1;
        clicksToday += 1;
      }
      if (click.productName) current.productName = click.productName;
      rankingMap.set(key, current);
    }

    const ranking = Array.from(rankingMap.values())
      .sort((a, b) => b.clicks - a.clicks || b.clicksToday - a.clicksToday)
      .slice(0, RANKING_LIMIT);

    const proposalsToday = tickets.filter((item) => dayKey(item.createdAt) === today).length;
    const soldToday = tickets.filter(
      (item) =>
        item.status === TicketStatus.sold &&
        dayKey(item.closedAt ?? item.createdAt) === today,
    ).length;
    const openToday = tickets.filter(
      (item) => item.status === TicketStatus.open && dayKey(item.createdAt) === today,
    ).length;

    const buyersToday = totemBuyersToday(tickets, today);

    return {
      ranking,
      clicksToday,
      clicksTotal: clicks.length,
      proposalsToday,
      soldToday,
      openToday,
      uniqueBuyersToday: buyersToday.length,
      buyersToday,
    };
  }
}

const CLICK_CAP = 2000;
const TICKET_LOOKBACK = 2000;
const RANKING_LIMIT = 10;
const STORE_TZ = 'America/Sao_Paulo';

type TotemTicketRow = {
  customerName: string;
  customerPhone: string;
  productName: string;
  status: TicketStatus;
  createdAt: Date;
  closedAt: Date | null;
};

function uniqueAttrs(items: { id: string; name: string; value: string }[]) {
  const seen = new Set<string>();
  const next: typeof items = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
  }
  return next;
}

function toClickJson(row: TotemClickEvent) {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    createdAt: isoRequired(row.createdAt),
  };
}

function dayKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: STORE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function todayKey() {
  return dayKey(new Date());
}

function phoneKey(phone: string) {
  return phone.replace(/\D/g, '');
}

function totemBuyersToday(tickets: TotemTicketRow[], today: string) {
  const sold = tickets.filter((item) => item.status === TicketStatus.sold);
  const byPhone = new Map<
    string,
    {
      customerName: string;
      customerPhone: string;
      purchasesToday: number;
      purchasesTotal: number;
      lastPurchaseAt: string;
      productsToday: string[];
    }
  >();

  for (const ticket of sold) {
    const key = phoneKey(ticket.customerPhone) || ticket.customerName.toLowerCase();
    if (!key) continue;
    const closedAt = ticket.closedAt ?? ticket.createdAt;
    const closedIso = isoRequired(closedAt);
    const isToday = dayKey(closedAt) === today;
    const current = byPhone.get(key) ?? {
      customerName: ticket.customerName,
      customerPhone: ticket.customerPhone,
      purchasesToday: 0,
      purchasesTotal: 0,
      lastPurchaseAt: closedIso,
      productsToday: [],
    };
    current.purchasesTotal += 1;
    if (isToday) {
      current.purchasesToday += 1;
      if (!current.productsToday.includes(ticket.productName)) {
        current.productsToday.push(ticket.productName);
      }
    }
    if (closedIso > current.lastPurchaseAt) {
      current.lastPurchaseAt = closedIso;
      current.customerName = ticket.customerName || current.customerName;
      current.customerPhone = ticket.customerPhone || current.customerPhone;
    }
    byPhone.set(key, current);
  }

  return Array.from(byPhone.values())
    .filter((item) => item.purchasesToday > 0)
    .sort(
      (a, b) =>
        b.purchasesToday - a.purchasesToday || b.lastPurchaseAt.localeCompare(a.lastPurchaseAt),
    );
}
