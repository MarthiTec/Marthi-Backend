import { Injectable } from '@nestjs/common';
import {
  AccessArea,
  Employee,
  EmployeeRole,
  Prisma,
  Seller,
  Supplier,
} from '@prisma/client';
import { ALL_ACCESS_AREAS } from '../../common/constants/access';
import { notFound } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { isoRequired, money } from '../../common/utils/money';
import { optionalText } from '../../common/utils/phone';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../auth/types/auth.types';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { CreateSellerDto, UpdateSellerDto } from './dto/seller.dto';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

export function toSellerJson(row: Seller) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    document: row.document,
    commissionPercent: money(row.commissionPercent),
    active: row.active,
    employeeId: row.employeeId ?? undefined,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
  };
}

export function toSupplierJson(row: Supplier) {
  return {
    id: row.id,
    name: row.name,
    tradeName: row.tradeName,
    document: row.document,
    phone: row.phone,
    email: row.email,
    city: row.city,
    notes: row.notes,
    active: row.active,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
  };
}

export function toEmployeeJson(row: Employee) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    document: row.document,
    role: row.role,
    isSystemUser: row.isSystemUser,
    userEmail: row.userEmail,
    accessAreas: row.accessAreas,
    active: row.active,
    sellerId: row.sellerId ?? undefined,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
  };
}

@Injectable()
export class RegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async listSellers(storeId: string, active?: string) {
    const where: Prisma.SellerWhereInput = { storeId };
    if (active === 'true' || active === '1') where.active = true;
    if (active === 'false' || active === '0') where.active = false;
    const rows = await this.prisma.seller.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return rows.map(toSellerJson);
  }

  async getSeller(storeId: string, id: string) {
    return toSellerJson(await this.findSeller(storeId, id));
  }

  async createSeller(storeId: string, dto: CreateSellerDto) {
    const employeeId = await this.requireEmployeeId(storeId, dto.employeeId);
    const row = await this.prisma.seller.create({
      data: {
        id: prefixedId('VEN'),
        storeId,
        name: dto.name.trim(),
        phone: optionalText(dto.phone),
        email: optionalText(dto.email).toLowerCase(),
        document: optionalText(dto.document),
        commissionPercent: dto.commissionPercent ?? 0,
        active: dto.active ?? true,
        employeeId,
      },
    });
    if (employeeId) {
      await this.prisma.employee.update({
        where: { id: employeeId },
        data: { sellerId: row.id },
      });
    }
    return toSellerJson(row);
  }

  async updateSeller(storeId: string, id: string, dto: UpdateSellerDto) {
    const current = await this.findSeller(storeId, id);
    const employeeId =
      dto.employeeId === undefined
        ? current.employeeId
        : await this.requireEmployeeId(storeId, dto.employeeId);
    const row = await this.prisma.seller.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: optionalText(dto.phone) } : {}),
        ...(dto.email !== undefined
          ? { email: optionalText(dto.email).toLowerCase() }
          : {}),
        ...(dto.document !== undefined
          ? { document: optionalText(dto.document) }
          : {}),
        ...(dto.commissionPercent !== undefined
          ? { commissionPercent: dto.commissionPercent }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.employeeId !== undefined ? { employeeId } : {}),
      },
    });
    if (dto.employeeId !== undefined) {
      if (current.employeeId && current.employeeId !== employeeId) {
        await this.prisma.employee.updateMany({
          where: { id: current.employeeId, sellerId: id },
          data: { sellerId: null },
        });
      }
      if (employeeId) {
        await this.prisma.employee.update({
          where: { id: employeeId },
          data: { sellerId: id },
        });
      }
    }
    return toSellerJson(row);
  }

  async removeSeller(storeId: string, id: string) {
    await this.findSeller(storeId, id);
    const row = await this.prisma.seller.update({
      where: { id },
      data: { active: false },
    });
    return toSellerJson(row);
  }

  async listSuppliers(storeId: string, active?: string) {
    const where: Prisma.SupplierWhereInput = { storeId };
    if (active === 'true' || active === '1') where.active = true;
    const rows = await this.prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return rows.map(toSupplierJson);
  }

  async getSupplier(storeId: string, id: string) {
    return toSupplierJson(await this.findSupplier(storeId, id));
  }

  async createSupplier(storeId: string, dto: CreateSupplierDto) {
    const row = await this.prisma.supplier.create({
      data: {
        id: prefixedId('FOR'),
        storeId,
        name: dto.name.trim(),
        tradeName: optionalText(dto.tradeName),
        document: optionalText(dto.document),
        phone: optionalText(dto.phone),
        email: optionalText(dto.email).toLowerCase(),
        city: optionalText(dto.city),
        notes: optionalText(dto.notes),
        active: dto.active ?? true,
      },
    });
    return toSupplierJson(row);
  }

  async updateSupplier(storeId: string, id: string, dto: UpdateSupplierDto) {
    await this.findSupplier(storeId, id);
    const row = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.tradeName !== undefined
          ? { tradeName: optionalText(dto.tradeName) }
          : {}),
        ...(dto.document !== undefined
          ? { document: optionalText(dto.document) }
          : {}),
        ...(dto.phone !== undefined ? { phone: optionalText(dto.phone) } : {}),
        ...(dto.email !== undefined
          ? { email: optionalText(dto.email).toLowerCase() }
          : {}),
        ...(dto.city !== undefined ? { city: optionalText(dto.city) } : {}),
        ...(dto.notes !== undefined ? { notes: optionalText(dto.notes) } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
    return toSupplierJson(row);
  }

  async removeSupplier(storeId: string, id: string) {
    await this.findSupplier(storeId, id);
    const row = await this.prisma.supplier.update({
      where: { id },
      data: { active: false },
    });
    return toSupplierJson(row);
  }

  async listEmployees(storeId: string, active?: string) {
    const where: Prisma.EmployeeWhereInput = { storeId };
    if (active === 'true' || active === '1') where.active = true;
    const rows = await this.prisma.employee.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return rows.map(toEmployeeJson);
  }

  async getEmployee(storeId: string, id: string) {
    return toEmployeeJson(await this.findEmployee(storeId, id));
  }

  async createEmployee(storeId: string, dto: CreateEmployeeDto) {
    const sellerId = await this.requireSellerId(storeId, dto.sellerId);
    const role = dto.role ?? EmployeeRole.operator;
    const row = await this.prisma.employee.create({
      data: {
        id: prefixedId('EMP'),
        storeId,
        name: dto.name.trim(),
        phone: optionalText(dto.phone),
        email: optionalText(dto.email).toLowerCase(),
        document: optionalText(dto.document),
        role,
        isSystemUser: dto.isSystemUser ?? false,
        userEmail: optionalText(dto.userEmail).toLowerCase(),
        accessAreas: this.areasForRole(role, dto.accessAreas),
        active: dto.active ?? true,
        sellerId,
      },
    });
    if (sellerId) {
      await this.prisma.seller.update({
        where: { id: sellerId },
        data: { employeeId: row.id },
      });
    }
    return toEmployeeJson(row);
  }

  async updateEmployee(storeId: string, id: string, dto: UpdateEmployeeDto) {
    const current = await this.findEmployee(storeId, id);
    const sellerId =
      dto.sellerId === undefined
        ? current.sellerId
        : await this.requireSellerId(storeId, dto.sellerId);
    const role = dto.role ?? current.role;
    const row = await this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: optionalText(dto.phone) } : {}),
        ...(dto.email !== undefined
          ? { email: optionalText(dto.email).toLowerCase() }
          : {}),
        ...(dto.document !== undefined
          ? { document: optionalText(dto.document) }
          : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.isSystemUser !== undefined
          ? { isSystemUser: dto.isSystemUser }
          : {}),
        ...(dto.userEmail !== undefined
          ? { userEmail: optionalText(dto.userEmail).toLowerCase() }
          : {}),
        ...(dto.accessAreas !== undefined || dto.role !== undefined
          ? { accessAreas: this.areasForRole(role, dto.accessAreas ?? current.accessAreas) }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.sellerId !== undefined ? { sellerId } : {}),
      },
    });
    if (dto.sellerId !== undefined) {
      if (current.sellerId && current.sellerId !== sellerId) {
        await this.prisma.seller.updateMany({
          where: { id: current.sellerId, employeeId: id },
          data: { employeeId: null },
        });
      }
      if (sellerId) {
        await this.prisma.seller.update({
          where: { id: sellerId },
          data: { employeeId: id },
        });
      }
    }
    return toEmployeeJson(row);
  }

  async removeEmployee(storeId: string, id: string) {
    await this.findEmployee(storeId, id);
    const row = await this.prisma.employee.update({
      where: { id },
      data: { active: false },
    });
    return toEmployeeJson(row);
  }

  async getAccess(user: AuthUser) {
    const email = user.email.toLowerCase();
    const employee = await this.prisma.employee.findFirst({
      where: {
        storeId: user.storeId,
        active: true,
        OR: [{ userEmail: email }, { email }],
      },
      orderBy: { createdAt: 'asc' },
    });

    if (employee) {
      const areas =
        employee.role === EmployeeRole.admin
          ? [...ALL_ACCESS_AREAS]
          : employee.accessAreas;
      return {
        role: employee.role,
        accessAreas: areas,
        employeeId: employee.id,
        sellerId: employee.sellerId ?? undefined,
      };
    }

    const count = await this.prisma.employee.count({
      where: { storeId: user.storeId },
    });
    if (count === 0) {
      return {
        role: EmployeeRole.admin,
        accessAreas: [...ALL_ACCESS_AREAS],
        employeeId: undefined,
        sellerId: undefined,
      };
    }

    return {
      role: EmployeeRole.operator,
      accessAreas: [] as AccessArea[],
      employeeId: undefined,
      sellerId: undefined,
    };
  }

  private areasForRole(role: EmployeeRole, areas?: AccessArea[]) {
    if (role === EmployeeRole.admin) return [...ALL_ACCESS_AREAS];
    return [...new Set(areas ?? [])];
  }

  private async requireEmployeeId(storeId: string, id?: string | null) {
    if (id == null || id === '') return null;
    await this.findEmployee(storeId, id);
    return id;
  }

  private async requireSellerId(storeId: string, id?: string | null) {
    if (id == null || id === '') return null;
    await this.findSeller(storeId, id);
    return id;
  }

  private async findSeller(storeId: string, id: string) {
    const row = await this.prisma.seller.findFirst({ where: { id, storeId } });
    if (!row) throw notFound('Vendedor não encontrado.');
    return row;
  }

  private async findSupplier(storeId: string, id: string) {
    const row = await this.prisma.supplier.findFirst({
      where: { id, storeId },
    });
    if (!row) throw notFound('Fornecedor não encontrado.');
    return row;
  }

  private async findEmployee(storeId: string, id: string) {
    const row = await this.prisma.employee.findFirst({
      where: { id, storeId },
    });
    if (!row) throw notFound('Funcionário não encontrado.');
    return row;
  }
}
