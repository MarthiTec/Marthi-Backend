import { Injectable } from '@nestjs/common';
import {
  CashBeneficiaryType,
  CashMovement,
  CashMovementKind,
  CashSession,
  CashSessionStatus,
  Prisma,
  StoreCredit,
  StoreCreditStatus,
} from '@prisma/client';
import { conflict, notFound, validation } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { iso, isoRequired, money, roundMoney } from '../../common/utils/money';
import { optionalText } from '../../common/utils/phone';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CashDrawerDto,
  CashMoneyDto,
  CloseCashSessionDto,
  CreateExchangeDto,
  CreateStoreCreditDto,
  ExchangeLineDto,
  OpenCashSessionDto,
  ReopenCashSessionDto,
  UseStoreCreditDto,
} from './dto/cash.dto';

type SessionRow = CashSession & { movements: CashMovement[] };

function parseAt(value?: string) {
  if (!value?.trim()) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw validation('Data/hora inválida.');
  return parsed;
}

function operatorOf(dtoName: string | undefined, fallback: string) {
  return optionalText(dtoName) || fallback || 'Operador';
}

function toMovementJson(row: CashMovement) {
  return {
    id: row.id,
    kind: row.kind,
    amount: money(row.amount),
    note: row.note,
    reason: row.reason || undefined,
    beneficiaryType: row.beneficiaryType ?? undefined,
    beneficiaryId: row.beneficiaryId ?? undefined,
    beneficiaryName: row.beneficiaryName || undefined,
    createdAt: isoRequired(row.createdAt),
    operatorName: row.operatorName,
  };
}

function toSessionJson(row: SessionRow) {
  return {
    id: row.id,
    openedAt: isoRequired(row.openedAt),
    closedAt: iso(row.closedAt),
    openingFloat: money(row.openingFloat),
    expectedCash: money(row.expectedCash),
    countedCash: row.countedCash == null ? undefined : money(row.countedCash),
    difference: row.difference == null ? undefined : money(row.difference),
    operatorName: row.operatorName,
    status: row.status,
    reopenCount: row.reopenCount,
    movements: [...row.movements]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(toMovementJson),
  };
}

function toCreditJson(row: StoreCredit) {
  return {
    id: row.id,
    code: row.code,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    amount: money(row.amount),
    remaining: money(row.remaining),
    note: row.note,
    createdAt: isoRequired(row.createdAt),
    operatorName: row.operatorName,
    status: row.status,
    orderId: row.orderId ?? undefined,
  };
}

function lineTotal(lines: ExchangeLineDto[]) {
  return roundMoney(
    lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0),
  );
}

const sessionInclude = {
  movements: { orderBy: { createdAt: 'asc' as const } },
};

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  async listSessions(storeId: string) {
    const rows = await this.prisma.cashSession.findMany({
      where: { storeId },
      include: sessionInclude,
      orderBy: { openedAt: 'desc' },
    });
    return rows.map(toSessionJson);
  }

  async getOpenSession(storeId: string) {
    const row = await this.prisma.cashSession.findFirst({
      where: { storeId, status: CashSessionStatus.open },
      include: sessionInclude,
    });
    return row ? toSessionJson(row) : null;
  }

  async getSession(storeId: string, id: string) {
    return toSessionJson(await this.findSession(storeId, id));
  }

  async openSession(storeId: string, dto: OpenCashSessionDto) {
    const existing = await this.prisma.cashSession.findFirst({
      where: { storeId, status: CashSessionStatus.open },
    });
    if (existing) {
      throw conflict('Já existe um caixa aberto. Feche ou consulte os caixas.');
    }
    const openingFloat = roundMoney(Math.max(0, dto.openingFloat));
    const openedAt = parseAt(dto.openedAt);
    const operatorName = dto.operatorName.trim() || 'Operador';
    try {
      const row = await this.prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.create({
        data: {
          id: prefixedId('CX'),
          storeId,
          openedAt,
          openingFloat,
          expectedCash: openingFloat,
          operatorName,
          status: CashSessionStatus.open,
        },
      });
      await tx.cashMovement.create({
        data: {
          id: prefixedId('CMV'),
          sessionId: session.id,
          kind: CashMovementKind.open,
          amount: openingFloat,
          note: optionalText(dto.note) || 'Abertura de caixa',
          operatorName,
          createdAt: openedAt,
        },
      });
      await tx.cashMovement.create({
        data: {
          id: prefixedId('CMV'),
          sessionId: session.id,
          kind: CashMovementKind.drawer,
          amount: 0,
          note: 'Gaveta na abertura',
          operatorName,
          createdAt: openedAt,
        },
      });
      return tx.cashSession.findFirstOrThrow({
        where: { id: session.id },
        include: sessionInclude,
      });
      });
      return toSessionJson(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw conflict('Já existe um caixa aberto. Feche ou consulte os caixas.');
      }
      throw error;
    }
  }

  async aporte(storeId: string, id: string, dto: CashMoneyDto, fallbackOperator: string) {
    return this.mutateOpen(storeId, id, async (tx, session) => {
      const amount = roundMoney(Math.abs(dto.amount));
      if (amount <= 0) throw validation('Informe o valor do aporte.');
      const reason = optionalText(dto.reason) || 'Aporte da loja';
      const beneficiary = this.beneficiary(dto);
      await tx.cashSession.update({
        where: { id: session.id },
        data: { expectedCash: roundMoney(money(session.expectedCash) + amount) },
      });
      await tx.cashMovement.create({
        data: {
          id: prefixedId('CMV'),
          sessionId: session.id,
          kind: CashMovementKind.aporte,
          amount,
          reason,
          note: optionalText(dto.note) || reason,
          beneficiaryType: beneficiary.type,
          beneficiaryId: beneficiary.id,
          beneficiaryName: beneficiary.name,
          operatorName: operatorOf(dto.operatorName, session.operatorName || fallbackOperator),
          createdAt: parseAt(dto.at),
        },
      });
    });
  }

  async sangria(storeId: string, id: string, dto: CashMoneyDto, fallbackOperator: string) {
    return this.mutateOpen(storeId, id, async (tx, session) => {
      const amount = roundMoney(Math.abs(dto.amount));
      if (amount <= 0) throw validation('Informe o valor da sangria.');
      if (amount > money(session.expectedCash)) {
        throw conflict('Sangria maior que o saldo esperado do caixa.');
      }
      const reason = optionalText(dto.reason) || 'Outros';
      const beneficiary = this.beneficiary(dto);
      await tx.cashSession.update({
        where: { id: session.id },
        data: { expectedCash: roundMoney(money(session.expectedCash) - amount) },
      });
      await tx.cashMovement.create({
        data: {
          id: prefixedId('CMV'),
          sessionId: session.id,
          kind: CashMovementKind.sangria,
          amount,
          reason,
          note: optionalText(dto.note) || reason,
          beneficiaryType: beneficiary.type,
          beneficiaryId: beneficiary.id,
          beneficiaryName: beneficiary.name,
          operatorName: operatorOf(dto.operatorName, session.operatorName || fallbackOperator),
          createdAt: parseAt(dto.at),
        },
      });
    });
  }

  async drawer(storeId: string, id: string, dto: CashDrawerDto, fallbackOperator: string) {
    return this.mutateOpen(storeId, id, async (tx, session) => {
      await tx.cashMovement.create({
        data: {
          id: prefixedId('CMV'),
          sessionId: session.id,
          kind: CashMovementKind.drawer,
          amount: 0,
          note: optionalText(dto.note) || 'Abertura de gaveta para contagem',
          operatorName: operatorOf(dto.operatorName, session.operatorName || fallbackOperator),
        },
      });
    });
  }

  async close(storeId: string, id: string, dto: CloseCashSessionDto) {
    return this.mutateOpen(storeId, id, async (tx, session) => {
      const counted = roundMoney(Math.max(0, dto.countedCash));
      const expected = money(session.expectedCash);
      const difference = roundMoney(counted - expected);
      const closedAt = new Date();
      await tx.cashSession.update({
        where: { id: session.id },
        data: {
          countedCash: counted,
          difference,
          closedAt,
          status: CashSessionStatus.closed,
        },
      });
      await tx.cashMovement.create({
        data: {
          id: prefixedId('CMV'),
          sessionId: session.id,
          kind: CashMovementKind.close,
          amount: counted,
          note:
            optionalText(dto.note) ||
            `Fechamento · esperado ${expected.toFixed(2)} · contado ${counted.toFixed(2)} · dif ${difference.toFixed(2)}`,
          operatorName: dto.operatorName.trim() || session.operatorName,
          createdAt: closedAt,
        },
      });
    });
  }

  async reopen(storeId: string, id: string, dto: ReopenCashSessionDto) {
    const open = await this.prisma.cashSession.findFirst({
      where: { storeId, status: CashSessionStatus.open },
    });
    if (open) throw conflict('Feche o caixa atual antes de reabrir outro.');
    const session = await this.findSession(storeId, id);
    if (session.status !== CashSessionStatus.closed) {
      throw conflict('Este caixa já está aberto.');
    }
    const operatorName = dto.operatorName.trim() || session.operatorName;
    const reopenCount = session.reopenCount + 1;
    await this.prisma.$transaction(async (tx) => {
      await tx.cashSession.update({
        where: { id: session.id },
        data: {
          status: CashSessionStatus.open,
          closedAt: null,
          countedCash: null,
          difference: null,
          reopenCount,
          operatorName,
        },
      });
      await tx.cashMovement.create({
        data: {
          id: prefixedId('CMV'),
          sessionId: session.id,
          kind: CashMovementKind.open,
          amount: session.expectedCash,
          note: optionalText(dto.note) || `Reabertura #${reopenCount}`,
          operatorName,
        },
      });
    });
    return this.getSession(storeId, id);
  }

  async listCredits(storeId: string) {
    const rows = await this.prisma.storeCredit.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toCreditJson);
  }

  async createCredit(storeId: string, dto: CreateStoreCreditDto, fallbackOperator: string) {
    const amount = roundMoney(Math.abs(dto.amount));
    if (amount <= 0) throw validation('Informe o valor do vale.');
    const operatorName = operatorOf(dto.operatorName, fallbackOperator);
    const affectCash = dto.affectCash !== false;
    return this.prisma.$transaction(async (tx) => {
      const credit = await tx.storeCredit.create({
        data: {
          id: prefixedId('VALE'),
          storeId,
          code: `VC-${prefixedId('').replace(/^-/, '').slice(0, 5)}`,
          customerName: dto.customerName.trim() || 'Cliente',
          customerPhone: optionalText(dto.customerPhone),
          amount,
          remaining: amount,
          note: optionalText(dto.note) || 'Vale-compra',
          operatorName,
          orderId: emptyToNull(dto.orderId),
        },
      });
      if (affectCash) {
        const session = await tx.cashSession.findFirst({
          where: { storeId, status: CashSessionStatus.open },
        });
        if (!session) {
          throw conflict('Abra o caixa para emitir vale vinculado ao caixa.');
        }
        await tx.cashSession.update({
          where: { id: session.id },
          data: { expectedCash: roundMoney(money(session.expectedCash) - amount) },
        });
        await tx.cashMovement.create({
          data: {
            id: prefixedId('CMV'),
            sessionId: session.id,
            kind: CashMovementKind.vale,
            amount,
            note: `Vale ${credit.code} · ${credit.customerName}`,
            operatorName,
          },
        });
      }
      return toCreditJson(credit);
    });
  }

  async useCredit(storeId: string, id: string, dto: UseStoreCreditDto, fallbackOperator: string) {
    const amount = roundMoney(Math.abs(dto.amount));
    return this.prisma.$transaction(async (tx) => {
      const credit = await tx.storeCredit.findFirst({
        where: { storeId, OR: [{ id }, { code: id.toUpperCase() }] },
      });
      if (!credit || credit.status !== StoreCreditStatus.open) {
        throw notFound('Vale não encontrado ou já usado.');
      }
      if (amount <= 0 || amount > money(credit.remaining)) {
        throw validation(`Saldo do vale: ${money(credit.remaining).toFixed(2)}.`);
      }
      const remaining = roundMoney(money(credit.remaining) - amount);
      const updated = await tx.storeCredit.update({
        where: { id: credit.id },
        data: {
          remaining,
          status: remaining <= 0 ? StoreCreditStatus.used : StoreCreditStatus.open,
        },
      });
      const session = await tx.cashSession.findFirst({
        where: { storeId, status: CashSessionStatus.open },
      });
      if (session) {
        await tx.cashSession.update({
          where: { id: session.id },
          data: { expectedCash: roundMoney(money(session.expectedCash) + amount) },
        });
        await tx.cashMovement.create({
          data: {
            id: prefixedId('CMV'),
            sessionId: session.id,
            kind: CashMovementKind.vale,
            amount,
            note: `Resgate vale ${credit.code}`,
            operatorName: operatorOf(dto.operatorName, session.operatorName || fallbackOperator),
          },
        });
      }
      return toCreditJson(updated);
    });
  }

  async listExchanges(storeId: string) {
    const rows = await this.prisma.exchangeRecord.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({
      id: row.id,
      orderId: row.orderId,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      returnLines: row.returnLines,
      outLines: row.outLines,
      returnTotal: money(row.returnTotal),
      outTotal: money(row.outTotal),
      cashDelta: money(row.cashDelta),
      creditId: row.creditId ?? undefined,
      note: row.note,
      createdAt: isoRequired(row.createdAt),
      operatorName: row.operatorName,
    }));
  }

  async createExchange(storeId: string, dto: CreateExchangeDto, fallbackOperator: string) {
    if (!dto.returnLines?.length && !dto.outLines?.length) {
      throw validation('Informe produtos de devolução e/ou saída.');
    }
    const returnTotal = lineTotal(dto.returnLines ?? []);
    const outTotal = lineTotal(dto.outLines ?? []);
    const cashDelta = roundMoney(outTotal - returnTotal);
    const operatorName = operatorOf(dto.operatorName, fallbackOperator);
    const settleAs = dto.settleAs === 'credit' ? 'credit' : 'cash';
    const useCredit = settleAs === 'credit' && cashDelta < 0;

    return this.prisma.$transaction(async (tx) => {
      let creditId: string | null = null;
      let recordedDelta = cashDelta;
      if (useCredit) {
        const issued = await this.issueCreditInTx(tx, storeId, {
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          amount: Math.abs(cashDelta),
          note: `Troca pedido ${dto.orderId || '—'}`,
          operatorName,
          orderId: emptyToNull(dto.orderId),
          affectCash: true,
        });
        creditId = issued.id;
        recordedDelta = 0;
      } else {
        const session = await tx.cashSession.findFirst({
          where: { storeId, status: CashSessionStatus.open },
        });
        if (!session) throw conflict('Abra o caixa antes de continuar.');
        await tx.cashSession.update({
          where: { id: session.id },
          data: {
            expectedCash: roundMoney(money(session.expectedCash) + cashDelta),
          },
        });
        await tx.cashMovement.create({
          data: {
            id: prefixedId('CMV'),
            sessionId: session.id,
            kind: CashMovementKind.exchange,
            amount: cashDelta,
            note:
              optionalText(dto.note) ||
              `Troca ${dto.orderId || ''} · devolve ${returnTotal.toFixed(2)} · sai ${outTotal.toFixed(2)}`,
            operatorName,
          },
        });
      }

      const exchange = await tx.exchangeRecord.create({
        data: {
          id: prefixedId('TRC'),
          storeId,
          orderId: dto.orderId.trim(),
          customerName: dto.customerName.trim() || 'Cliente',
          customerPhone: optionalText(dto.customerPhone),
          returnLines: (dto.returnLines ?? []) as unknown as Prisma.InputJsonValue,
          outLines: (dto.outLines ?? []) as unknown as Prisma.InputJsonValue,
          returnTotal,
          outTotal,
          cashDelta: recordedDelta,
          creditId,
          note: optionalText(dto.note),
          operatorName,
        },
      });
      return {
        id: exchange.id,
        orderId: exchange.orderId,
        customerName: exchange.customerName,
        customerPhone: exchange.customerPhone,
        returnLines: exchange.returnLines,
        outLines: exchange.outLines,
        returnTotal: money(exchange.returnTotal),
        outTotal: money(exchange.outTotal),
        cashDelta: money(exchange.cashDelta),
        creditId: exchange.creditId ?? undefined,
        note: exchange.note,
        createdAt: isoRequired(exchange.createdAt),
        operatorName: exchange.operatorName,
      };
    });
  }

  async recordSaleInTx(
    tx: Prisma.TransactionClient,
    storeId: string,
    amount: number,
    operatorName: string,
    note: string,
  ) {
    const value = roundMoney(Math.max(0, amount));
    if (value <= 0) return;
    const session = await tx.cashSession.findFirst({
      where: { storeId, status: CashSessionStatus.open },
    });
    if (!session) return;
    await tx.cashSession.update({
      where: { id: session.id },
      data: { expectedCash: roundMoney(money(session.expectedCash) + value) },
    });
    await tx.cashMovement.create({
      data: {
        id: prefixedId('CMV'),
        sessionId: session.id,
        kind: CashMovementKind.sale,
        amount: value,
        note: note || 'Venda PDV',
        operatorName: operatorName || session.operatorName,
      },
    });
  }

  private async issueCreditInTx(
    tx: Prisma.TransactionClient,
    storeId: string,
    input: {
      customerName: string;
      customerPhone?: string;
      amount: number;
      note: string;
      operatorName: string;
      orderId: string | null;
      affectCash: boolean;
    },
  ) {
    const credit = await tx.storeCredit.create({
      data: {
        id: prefixedId('VALE'),
        storeId,
        code: `VC-${prefixedId('').replace(/^-/, '').slice(0, 5)}`,
        customerName: input.customerName.trim() || 'Cliente',
        customerPhone: optionalText(input.customerPhone),
        amount: input.amount,
        remaining: input.amount,
        note: input.note,
        operatorName: input.operatorName,
        orderId: input.orderId,
      },
    });
    if (input.affectCash) {
      const session = await tx.cashSession.findFirst({
        where: { storeId, status: CashSessionStatus.open },
      });
      if (!session) throw conflict('Abra o caixa para emitir vale vinculado ao caixa.');
      await tx.cashSession.update({
        where: { id: session.id },
        data: { expectedCash: roundMoney(money(session.expectedCash) - input.amount) },
      });
      await tx.cashMovement.create({
        data: {
          id: prefixedId('CMV'),
          sessionId: session.id,
          kind: CashMovementKind.vale,
          amount: input.amount,
          note: `Vale ${credit.code} · ${credit.customerName}`,
          operatorName: input.operatorName,
        },
      });
    }
    return credit;
  }

  private beneficiary(dto: CashMoneyDto) {
    const type =
      dto.beneficiaryType === CashBeneficiaryType.employee
        ? CashBeneficiaryType.employee
        : CashBeneficiaryType.store;
    return {
      type,
      id: type === CashBeneficiaryType.employee ? emptyToNull(dto.beneficiaryId) : null,
      name:
        type === CashBeneficiaryType.employee
          ? optionalText(dto.beneficiaryName) || 'Funcionário'
          : optionalText(dto.beneficiaryName) || 'Loja',
    };
  }

  private async mutateOpen(
    storeId: string,
    id: string,
    fn: (tx: Prisma.TransactionClient, session: CashSession) => Promise<void>,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.findFirst({
        where: { id, storeId },
      });
      if (!session) throw notFound('Caixa não encontrado.');
      if (session.status !== CashSessionStatus.open) {
        throw conflict('Abra o caixa antes de continuar.');
      }
      await fn(tx, session);
    });
    return this.getSession(storeId, id);
  }

  private async findSession(storeId: string, id: string) {
    const row = await this.prisma.cashSession.findFirst({
      where: { id, storeId },
      include: sessionInclude,
    });
    if (!row) throw notFound('Caixa não encontrado.');
    return row;
  }
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
