import { Injectable } from '@nestjs/common';
import {
  AdvancePayment,
  AdvanceStatus,
  BankAccount,
  BillStatus,
  Payable,
  Prisma,
  Receivable,
  TreasuryKind,
  TreasuryMove,
} from '@prisma/client';
import { conflict, notFound, validation } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { iso, isoRequired, money, roundMoney } from '../../common/utils/money';
import { optionalText } from '../../common/utils/phone';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ApplyAdvanceDto,
  CreateAdvanceDto,
  CreateBankAccountDto,
  CreatePayableDto,
  CreateReceivableDto,
  CreateTreasuryDto,
  SettleBillDto,
  UpdateBankAccountDto,
  UpdatePayableDto,
  UpdateReceivableDto,
} from './dto/finance-book.dto';

const TREASURY_KIND_LABEL: Record<TreasuryKind, string> = {
  transfer: 'Transferência',
  deposit: 'Depósito',
  withdraw: 'Saque',
  adjustment: 'Ajuste',
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseAt(value?: string) {
  if (!value?.trim()) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw validation('Data/hora inválida.');
  }
  return parsed;
}

function dueDate(value?: string) {
  const trimmed = optionalText(value);
  return trimmed || todayDate();
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toAccountJson(row: BankAccount, balance: number) {
  return {
    id: row.id,
    name: row.name,
    bank: row.bank,
    agency: row.agency,
    number: row.number,
    type: row.type,
    initialBalance: money(row.initialBalance),
    balance: roundMoney(balance),
    active: row.active,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
  };
}

function toPayableJson(row: Payable) {
  return {
    id: row.id,
    description: row.description,
    supplierId: row.supplierId ?? '',
    supplierName: row.supplierName,
    category: row.category,
    amount: money(row.amount),
    paidAmount: money(row.paidAmount),
    dueDate: row.dueDate,
    status: row.status,
    accountId: row.accountId,
    notes: row.notes,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
    paidAt: iso(row.paidAt),
  };
}

function toReceivableJson(row: Receivable) {
  return {
    id: row.id,
    description: row.description,
    customerName: row.customerName,
    category: row.category,
    amount: money(row.amount),
    receivedAmount: money(row.receivedAmount),
    dueDate: row.dueDate,
    status: row.status,
    accountId: row.accountId,
    notes: row.notes,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
    receivedAt: iso(row.receivedAt),
  };
}

function toTreasuryJson(row: TreasuryMove) {
  return {
    id: row.id,
    kind: row.kind,
    fromAccountId: row.fromAccountId,
    toAccountId: row.toAccountId,
    amount: money(row.amount),
    description: row.description,
    at: isoRequired(row.at),
  };
}

function toAdvanceJson(row: AdvancePayment) {
  return {
    id: row.id,
    kind: row.kind,
    partyName: row.partyName,
    amount: money(row.amount),
    usedAmount: money(row.usedAmount),
    accountId: row.accountId,
    notes: row.notes,
    status: row.status,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
  };
}

@Injectable()
export class FinanceBookService {
  constructor(private readonly prisma: PrismaService) {}

  async listAccounts(storeId: string, active?: string) {
    const where: Prisma.BankAccountWhereInput = { storeId };
    if (active === 'true' || active === '1') where.active = true;
    if (active === 'false' || active === '0') where.active = false;
    const rows = await this.prisma.bankAccount.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    const balances = await this.balancesByAccount(storeId);
    return rows.map((row) => toAccountJson(row, balances.get(row.id) ?? 0));
  }

  async getAccount(storeId: string, id: string) {
    const row = await this.findAccount(storeId, id);
    const balances = await this.balancesByAccount(storeId);
    return toAccountJson(row, balances.get(row.id) ?? 0);
  }

  async createAccount(storeId: string, dto: CreateBankAccountDto) {
    const row = await this.prisma.bankAccount.create({
      data: {
        id: prefixedId('ACC'),
        storeId,
        name: dto.name.trim(),
        bank: optionalText(dto.bank),
        agency: optionalText(dto.agency),
        number: optionalText(dto.number),
        type: dto.type,
        initialBalance: roundMoney(dto.initialBalance ?? 0),
        active: dto.active ?? true,
      },
    });
    return toAccountJson(row, money(row.initialBalance));
  }

  async updateAccount(storeId: string, id: string, dto: UpdateBankAccountDto) {
    await this.findAccount(storeId, id);
    const row = await this.prisma.bankAccount.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.bank !== undefined ? { bank: optionalText(dto.bank) } : {}),
        ...(dto.agency !== undefined ? { agency: optionalText(dto.agency) } : {}),
        ...(dto.number !== undefined ? { number: optionalText(dto.number) } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.initialBalance !== undefined
          ? { initialBalance: roundMoney(dto.initialBalance) }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
    const balances = await this.balancesByAccount(storeId);
    return toAccountJson(row, balances.get(row.id) ?? 0);
  }

  async removeAccount(storeId: string, id: string) {
    await this.findAccount(storeId, id);
    const row = await this.prisma.bankAccount.update({
      where: { id },
      data: { active: false },
    });
    const balances = await this.balancesByAccount(storeId);
    return toAccountJson(row, balances.get(row.id) ?? 0);
  }

  async listPayables(
    storeId: string,
    query: { status?: BillStatus; from?: string; to?: string },
  ) {
    const where: Prisma.PayableWhereInput = { storeId };
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.dueDate = {};
      if (query.from) where.dueDate.gte = query.from;
      if (query.to) where.dueDate.lte = query.to;
    }
    const rows = await this.prisma.payable.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    });
    return rows.map(toPayableJson);
  }

  async getPayable(storeId: string, id: string) {
    return toPayableJson(await this.findPayable(storeId, id));
  }

  async createPayable(storeId: string, dto: CreatePayableDto) {
    await this.requireAccount(storeId, dto.accountId);
    const supplier = await this.resolveSupplier(
      storeId,
      dto.supplierId,
      dto.supplierName,
    );
    const row = await this.prisma.payable.create({
      data: {
        id: prefixedId('PAYB'),
        storeId,
        description: dto.description.trim(),
        supplierId: supplier.id,
        supplierName: supplier.name,
        category: optionalText(dto.category) || 'Outras despesas',
        amount: roundMoney(dto.amount),
        dueDate: dueDate(dto.dueDate),
        accountId: dto.accountId,
        notes: optionalText(dto.notes),
      },
    });
    return toPayableJson(row);
  }

  async updatePayable(storeId: string, id: string, dto: UpdatePayableDto) {
    const current = await this.findPayable(storeId, id);
    if (current.status === BillStatus.paid || current.status === BillStatus.cancelled) {
      throw conflict('Conta já encerrada.');
    }
    if (dto.accountId) await this.requireAccount(storeId, dto.accountId);
    if (dto.status === BillStatus.cancelled) {
      if (money(current.paidAmount) > 0) {
        throw conflict('Já há pagamento parcial.');
      }
      const cancelled = await this.prisma.payable.update({
        where: { id },
        data: { status: BillStatus.cancelled },
      });
      return toPayableJson(cancelled);
    }
    const supplier =
      dto.supplierId !== undefined || dto.supplierName !== undefined
        ? await this.resolveSupplier(
            storeId,
            dto.supplierId !== undefined ? dto.supplierId : current.supplierId,
            dto.supplierName,
          )
        : { id: current.supplierId, name: current.supplierName };
    const row = await this.prisma.payable.update({
      where: { id },
      data: {
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.supplierId !== undefined || dto.supplierName !== undefined
          ? { supplierId: supplier.id, supplierName: supplier.name }
          : {}),
        ...(dto.category !== undefined
          ? { category: optionalText(dto.category) || 'Outras despesas' }
          : {}),
        ...(dto.amount !== undefined ? { amount: roundMoney(dto.amount) } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: dueDate(dto.dueDate) } : {}),
        ...(dto.accountId !== undefined ? { accountId: dto.accountId } : {}),
        ...(dto.notes !== undefined ? { notes: optionalText(dto.notes) } : {}),
      },
    });
    return toPayableJson(row);
  }

  async payPayable(storeId: string, id: string, dto: SettleBillDto) {
    const current = await this.findPayable(storeId, id);
    if (current.status === BillStatus.cancelled || current.status === BillStatus.paid) {
      throw conflict('Conta não pode ser paga.');
    }
    if (dto.accountId) await this.requireAccount(storeId, dto.accountId);
    const remainder = Math.max(0, money(current.amount) - money(current.paidAmount));
    const pay = roundMoney(Math.min(remainder, dto.amount));
    if (pay <= 0) throw validation('Informe um valor válido.');
    const paidAmount = roundMoney(money(current.paidAmount) + pay);
    const fullyPaid = paidAmount >= money(current.amount) - 0.001;
    const stamp = parseAt(dto.at);
    const row = await this.prisma.payable.update({
      where: { id },
      data: {
        paidAmount,
        status: fullyPaid ? BillStatus.paid : BillStatus.partial,
        paidAt: fullyPaid ? stamp : current.paidAt,
        ...(dto.accountId ? { accountId: dto.accountId } : {}),
      },
    });
    return toPayableJson(row);
  }

  async listReceivables(
    storeId: string,
    query: { status?: BillStatus; from?: string; to?: string },
  ) {
    const where: Prisma.ReceivableWhereInput = { storeId };
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.dueDate = {};
      if (query.from) where.dueDate.gte = query.from;
      if (query.to) where.dueDate.lte = query.to;
    }
    const rows = await this.prisma.receivable.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    });
    return rows.map(toReceivableJson);
  }

  async getReceivable(storeId: string, id: string) {
    return toReceivableJson(await this.findReceivable(storeId, id));
  }

  async createReceivable(storeId: string, dto: CreateReceivableDto) {
    await this.requireAccount(storeId, dto.accountId);
    const row = await this.prisma.receivable.create({
      data: {
        id: prefixedId('RECV'),
        storeId,
        description: dto.description.trim(),
        customerName: dto.customerName.trim(),
        category: optionalText(dto.category) || 'Recebimentos',
        amount: roundMoney(dto.amount),
        dueDate: dueDate(dto.dueDate),
        accountId: dto.accountId,
        notes: optionalText(dto.notes),
      },
    });
    return toReceivableJson(row);
  }

  async updateReceivable(storeId: string, id: string, dto: UpdateReceivableDto) {
    const current = await this.findReceivable(storeId, id);
    if (current.status === BillStatus.paid || current.status === BillStatus.cancelled) {
      throw conflict('Conta já encerrada.');
    }
    if (dto.accountId) await this.requireAccount(storeId, dto.accountId);
    if (dto.status === BillStatus.cancelled) {
      if (money(current.receivedAmount) > 0) {
        throw conflict('Já há recebimento parcial.');
      }
      const cancelled = await this.prisma.receivable.update({
        where: { id },
        data: { status: BillStatus.cancelled },
      });
      return toReceivableJson(cancelled);
    }
    const row = await this.prisma.receivable.update({
      where: { id },
      data: {
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.customerName !== undefined
          ? { customerName: dto.customerName.trim() }
          : {}),
        ...(dto.category !== undefined
          ? { category: optionalText(dto.category) || 'Recebimentos' }
          : {}),
        ...(dto.amount !== undefined ? { amount: roundMoney(dto.amount) } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: dueDate(dto.dueDate) } : {}),
        ...(dto.accountId !== undefined ? { accountId: dto.accountId } : {}),
        ...(dto.notes !== undefined ? { notes: optionalText(dto.notes) } : {}),
      },
    });
    return toReceivableJson(row);
  }

  async receiveReceivable(storeId: string, id: string, dto: SettleBillDto) {
    const current = await this.findReceivable(storeId, id);
    if (current.status === BillStatus.cancelled || current.status === BillStatus.paid) {
      throw conflict('Conta não pode ser recebida.');
    }
    if (dto.accountId) await this.requireAccount(storeId, dto.accountId);
    const remainder = Math.max(
      0,
      money(current.amount) - money(current.receivedAmount),
    );
    const receive = roundMoney(Math.min(remainder, dto.amount));
    if (receive <= 0) throw validation('Informe um valor válido.');
    const receivedAmount = roundMoney(money(current.receivedAmount) + receive);
    const fullyPaid = receivedAmount >= money(current.amount) - 0.001;
    const stamp = parseAt(dto.at);
    const row = await this.prisma.receivable.update({
      where: { id },
      data: {
        receivedAmount,
        status: fullyPaid ? BillStatus.paid : BillStatus.partial,
        receivedAt: fullyPaid ? stamp : current.receivedAt,
        ...(dto.accountId ? { accountId: dto.accountId } : {}),
      },
    });
    return toReceivableJson(row);
  }

  async listTreasury(storeId: string) {
    const rows = await this.prisma.treasuryMove.findMany({
      where: { storeId },
      orderBy: { at: 'desc' },
    });
    return rows.map(toTreasuryJson);
  }

  async createTreasury(storeId: string, dto: CreateTreasuryDto) {
    const fromId = optionalText(dto.fromAccountId);
    const toId = optionalText(dto.toAccountId);
    if (fromId) await this.requireAccount(storeId, fromId);
    if (toId) await this.requireAccount(storeId, toId);
    if (dto.kind === TreasuryKind.transfer) {
      if (!fromId || !toId) throw validation('Contas inválidas.');
      if (fromId === toId) throw validation('Escolha contas diferentes.');
    } else if (dto.kind === TreasuryKind.deposit) {
      if (!toId) throw validation('Conta destino inválida.');
    } else if (dto.kind === TreasuryKind.withdraw) {
      if (!fromId) throw validation('Conta origem inválida.');
    } else if (!fromId && !toId) {
      throw validation('Informe ao menos uma conta.');
    }
    const row = await this.prisma.treasuryMove.create({
      data: {
        id: prefixedId('TRS'),
        storeId,
        kind: dto.kind,
        fromAccountId: fromId,
        toAccountId: toId,
        amount: roundMoney(dto.amount),
        description: optionalText(dto.description) || TREASURY_KIND_LABEL[dto.kind],
        at: parseAt(dto.at),
      },
    });
    return toTreasuryJson(row);
  }

  async listAdvances(storeId: string) {
    const rows = await this.prisma.advancePayment.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toAdvanceJson);
  }

  async getAdvance(storeId: string, id: string) {
    return toAdvanceJson(await this.findAdvance(storeId, id));
  }

  async createAdvance(storeId: string, dto: CreateAdvanceDto) {
    await this.requireAccount(storeId, dto.accountId);
    const row = await this.prisma.advancePayment.create({
      data: {
        id: prefixedId('ADV'),
        storeId,
        kind: dto.kind,
        partyName: dto.partyName.trim(),
        amount: roundMoney(dto.amount),
        accountId: dto.accountId,
        notes: optionalText(dto.notes),
      },
    });
    return toAdvanceJson(row);
  }

  async applyAdvance(storeId: string, id: string, dto: ApplyAdvanceDto) {
    const current = await this.findAdvance(storeId, id);
    if (current.status !== AdvanceStatus.open) {
      throw conflict('Antecipação já encerrada.');
    }
    const open = money(current.amount) - money(current.usedAmount);
    const use = roundMoney(Math.min(open, dto.amount));
    if (use <= 0) throw validation('Valor inválido.');
    const usedAmount = roundMoney(money(current.usedAmount) + use);
    const row = await this.prisma.advancePayment.update({
      where: { id },
      data: {
        usedAmount,
        status:
          usedAmount >= money(current.amount) - 0.001
            ? AdvanceStatus.applied
            : AdvanceStatus.open,
      },
    });
    return toAdvanceJson(row);
  }

  async refundAdvance(storeId: string, id: string) {
    const current = await this.findAdvance(storeId, id);
    if (current.status === AdvanceStatus.refunded) {
      throw conflict('Já estornada.');
    }
    if (money(current.usedAmount) > 0) {
      throw conflict('Já houve aplicação parcial.');
    }
    const row = await this.prisma.advancePayment.update({
      where: { id },
      data: { status: AdvanceStatus.refunded },
    });
    return toAdvanceJson(row);
  }

  private async balancesByAccount(storeId: string) {
    const [accounts, treasury, payables, receivables] = await Promise.all([
      this.prisma.bankAccount.findMany({ where: { storeId } }),
      this.prisma.treasuryMove.findMany({ where: { storeId } }),
      this.prisma.payable.findMany({ where: { storeId } }),
      this.prisma.receivable.findMany({ where: { storeId } }),
    ]);
    const map = new Map<string, number>();
    for (const account of accounts) {
      map.set(account.id, money(account.initialBalance));
    }
    for (const move of treasury) {
      if (move.toAccountId) {
        map.set(move.toAccountId, (map.get(move.toAccountId) ?? 0) + money(move.amount));
      }
      if (move.fromAccountId) {
        map.set(
          move.fromAccountId,
          (map.get(move.fromAccountId) ?? 0) - money(move.amount),
        );
      }
    }
    for (const bill of payables) {
      map.set(bill.accountId, (map.get(bill.accountId) ?? 0) - money(bill.paidAmount));
    }
    for (const bill of receivables) {
      map.set(
        bill.accountId,
        (map.get(bill.accountId) ?? 0) + money(bill.receivedAmount),
      );
    }
    return map;
  }

  private async findAccount(storeId: string, id: string) {
    const row = await this.prisma.bankAccount.findFirst({ where: { id, storeId } });
    if (!row) throw notFound('Conta bancária não encontrada.');
    return row;
  }

  private async requireAccount(storeId: string, id: string) {
    const row = await this.prisma.bankAccount.findFirst({ where: { id, storeId } });
    if (!row) throw validation('Conta bancária inválida.');
    return row;
  }

  private async findPayable(storeId: string, id: string) {
    const row = await this.prisma.payable.findFirst({ where: { id, storeId } });
    if (!row) throw notFound('Conta a pagar não encontrada.');
    return row;
  }

  private async findReceivable(storeId: string, id: string) {
    const row = await this.prisma.receivable.findFirst({ where: { id, storeId } });
    if (!row) throw notFound('Conta a receber não encontrada.');
    return row;
  }

  private async findAdvance(storeId: string, id: string) {
    const row = await this.prisma.advancePayment.findFirst({
      where: { id, storeId },
    });
    if (!row) throw notFound('Antecipação não encontrada.');
    return row;
  }

  private async resolveSupplier(
    storeId: string,
    supplierId?: string | null,
    supplierName?: string,
  ) {
    const id = emptyToNull(supplierId);
    if (!id) {
      return { id: null as string | null, name: optionalText(supplierName) };
    }
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, storeId },
    });
    if (!supplier) throw validation('Fornecedor inválido.');
    return { id: supplier.id, name: supplier.name };
  }
}
