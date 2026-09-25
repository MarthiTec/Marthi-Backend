import { Injectable } from '@nestjs/common';
import { OsStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { money } from '../../common/utils/money';

const OPEN_OS: OsStatus[] = [
  'open',
  'diagnosis',
  'waiting',
  'progress',
  'ready',
];

type TechRank = {
  name: string;
  closedCount: number;
  revenue: number;
  returns: number;
  inProgress: number;
  avgTicket: number;
};

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function startOfDay(offset: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

function labelDay(date: Date) {
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
}

function techName(technician: string) {
  const trimmed = technician.trim();
  return trimmed || 'Sem técnico';
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(storeId: string, days = 7) {
    const from = startOfDay(-(days - 1));
    const to = new Date();
    to.setHours(23, 59, 59, 999);

    const [
      finance,
      soldCount,
      stockRows,
      workOrders,
      openPayables,
      openReceivables,
      openAdvances,
      bankAccounts,
      openPosTickets,
    ] = await Promise.all([
      this.prisma.financeEntry.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
      this.prisma.salesOrder.count({
        where: { storeId, status: 'sold' },
      }),
      this.prisma.stockItem.findMany({
        where: { storeId },
        select: { qty: true, minQty: true },
      }),
      this.prisma.workOrder.findMany({
        where: { storeId },
        select: {
          status: true,
          technician: true,
          labor: true,
          parts: true,
          deliveredAt: true,
          itemRef: true,
          createdAt: true,
        },
        take: 500,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.payable.findMany({
        where: { storeId, status: 'open' },
        select: { amount: true },
      }),
      this.prisma.receivable.findMany({
        where: { storeId, status: 'open' },
        select: { amount: true },
      }),
      this.prisma.advancePayment.findMany({
        where: { storeId, status: 'open' },
        select: { amount: true, usedAmount: true },
      }),
      this.prisma.bankAccount.findMany({
        where: { storeId, active: true },
        select: { initialBalance: true },
      }),
      this.prisma.posTicket.count({
        where: { storeId, status: 'open' },
      }),
    ]);

    const lowStock = stockRows.filter((item) => item.qty <= item.minQty).length;
    const skuCount = stockRows.length;
    const stockUnits = stockRows.reduce((sum, item) => sum + item.qty, 0);

    const series = [];
    for (let i = 0; i < days; i += 1) {
      const day = startOfDay(-(days - 1 - i));
      const key = dayKey(day.toISOString());
      const dayEntries = finance.filter(
        (item) => dayKey(item.createdAt.toISOString()) === key,
      );
      const inflow = dayEntries
        .filter((item) => item.type === 'in')
        .reduce((sum, item) => sum + money(item.amount), 0);
      const outflow = dayEntries
        .filter((item) => item.type === 'out')
        .reduce((sum, item) => sum + money(item.amount), 0);
      series.push({
        key,
        label: labelDay(day),
        inflow,
        outflow,
        sales: inflow,
      });
    }

    const inPeriod = (createdAt: Date) =>
      createdAt.getTime() >= from.getTime() && createdAt.getTime() <= to.getTime();

    const revenuePeriod = finance
      .filter((item) => item.type === 'in' && inPeriod(item.createdAt))
      .reduce((sum, item) => sum + money(item.amount), 0);
    const expensePeriod = finance
      .filter((item) => item.type === 'out' && inPeriod(item.createdAt))
      .reduce((sum, item) => sum + money(item.amount), 0);
    const cashBalance = finance.reduce(
      (sum, item) => sum + (item.type === 'in' ? money(item.amount) : -money(item.amount)),
      0,
    );

    const bySource = new Map<string, number>();
    for (const item of finance) {
      if (item.type !== 'in' || !inPeriod(item.createdAt)) continue;
      bySource.set(item.source, (bySource.get(item.source) ?? 0) + money(item.amount));
    }
    const toneBySource: Record<string, string> = {
      pos: '#0f766e',
      os_revenue: '#2563eb',
      manual: '#ca8a04',
      os_part: '#7c3aed',
      os_purchase: '#dc2626',
      os_reversal: '#64748b',
    };
    const mix = [...bySource.entries()]
      .map(([source, value]) => ({
        label:
          source === 'pos'
            ? 'PDV'
            : source === 'os_revenue'
              ? 'OS'
              : source === 'manual'
                ? 'Manual'
                : source,
        value,
        tone: toneBySource[source] ?? '#64748b',
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const technicians = this.buildTechnicianRanks(workOrders);
    const deliveredCount = technicians.reduce((sum, row) => sum + row.closedCount, 0);
    const returnCount = technicians.reduce((sum, row) => sum + row.returns, 0);
    const openOs = workOrders.filter((item) => OPEN_OS.includes(item.status)).length;

    const payablesOpen = openPayables.reduce((sum, row) => sum + money(row.amount), 0);
    const receivablesOpen = openReceivables.reduce((sum, row) => sum + money(row.amount), 0);
    const advancesOpen = openAdvances.reduce(
      (sum, row) => sum + Math.max(0, money(row.amount) - money(row.usedAmount)),
      0,
    );
    const treasury =
      bankAccounts.reduce((sum, row) => sum + money(row.initialBalance), 0) + cashBalance;

    return {
      cashBalance,
      treasury,
      payablesOpen,
      receivablesOpen,
      advancesOpen,
      soldCount,
      revenuePeriod,
      expensePeriod,
      resultPeriod: revenuePeriod - expensePeriod,
      openOs,
      lowStock,
      series,
      mix,
      technicians,
      topCloser:
        [...technicians].sort(
          (a, b) => b.closedCount - a.closedCount || b.revenue - a.revenue,
        )[0] ?? null,
      topEarner:
        [...technicians].sort(
          (a, b) => b.revenue - a.revenue || b.closedCount - a.closedCount,
        )[0] ?? null,
      topReturns:
        [...technicians]
          .filter((row) => row.returns > 0)
          .sort((a, b) => b.returns - a.returns || b.closedCount - a.closedCount)[0] ??
        null,
      deliveredCount,
      returnRate: deliveredCount > 0 ? returnCount / deliveredCount : 0,
      openPosTickets,
      skuCount,
      stockUnits,
    };
  }

  private buildTechnicianRanks(
    orders: Array<{
      status: OsStatus;
      technician: string;
      labor: Prisma.Decimal;
      parts: Prisma.Decimal;
      deliveredAt: Date | null;
      itemRef: string;
      createdAt: Date;
    }>,
  ): TechRank[] {
    const map = new Map<string, TechRank>();

    function ensure(name: string) {
      let row = map.get(name);
      if (!row) {
        row = {
          name,
          closedCount: 0,
          revenue: 0,
          returns: 0,
          inProgress: 0,
          avgTicket: 0,
        };
        map.set(name, row);
      }
      return row;
    }

    for (const order of orders) {
      const name = techName(order.technician);
      const row = ensure(name);
      if (order.status === 'delivered') {
        row.closedCount += 1;
        row.revenue += money(order.labor) + money(order.parts);
      }
      if (OPEN_OS.includes(order.status)) {
        row.inProgress += 1;
      }
    }

    const byItem = new Map<string, typeof orders>();
    for (const order of orders) {
      if (order.status === 'cancelled') continue;
      const key = order.itemRef.trim().toLowerCase();
      if (key.length < 4) continue;
      const list = byItem.get(key) ?? [];
      list.push(order);
      byItem.set(key, list);
    }

    for (const list of byItem.values()) {
      list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      for (let i = 1; i < list.length; i += 1) {
        const priorDelivered = list
          .slice(0, i)
          .reverse()
          .find((item) => item.status === 'delivered' || Boolean(item.deliveredAt));
        if (!priorDelivered) continue;
        ensure(techName(priorDelivered.technician)).returns += 1;
      }
    }

    return [...map.values()]
      .map((row) => ({
        ...row,
        avgTicket: row.closedCount > 0 ? row.revenue / row.closedCount : 0,
      }))
      .sort((a, b) => b.closedCount - a.closedCount || b.revenue - a.revenue);
  }
}
