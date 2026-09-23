import { Injectable } from '@nestjs/common';
import {
  CfopCode,
  FecpRule,
  FiscalClassification,
  Prisma,
} from '@prisma/client';
import { conflict, notFound, validation } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { isoRequired, money } from '../../common/utils/money';
import { optionalText, upperUf } from '../../common/utils/phone';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCfopDto,
  CreateFecpDto,
  CreateFiscalClassificationDto,
  UpdateCfopDto,
  UpdateFecpDto,
  UpdateFiscalClassificationDto,
} from './dto/fiscal-catalog.dto';

function toClassJson(row: FiscalClassification) {
  return {
    id: row.id,
    name: row.name,
    ncm: row.ncm,
    cstIcms: row.cstIcms,
    cClasTrib: row.cClasTrib,
    icmsRate: money(row.icmsRate),
    ipiCst: row.ipiCst,
    ipiRate: money(row.ipiRate),
    pisCst: row.pisCst,
    pisRate: money(row.pisRate),
    cofinsCst: row.cofinsCst,
    cofinsRate: money(row.cofinsRate),
    ibsRate: money(row.ibsRate),
    cbsRate: money(row.cbsRate),
    defaultCfopId: row.defaultCfopId,
    notes: row.notes,
    active: row.active,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
  };
}

function toCfopJson(row: CfopCode) {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    operation: row.operation,
    active: row.active,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
  };
}

function toFecpJson(row: FecpRule) {
  return {
    id: row.id,
    uf: row.uf,
    description: row.description,
    rate: money(row.rate),
    active: row.active,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
  };
}

@Injectable()
export class FiscalCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listClassifications(storeId: string, active?: string) {
    const where: Prisma.FiscalClassificationWhereInput = { storeId };
    if (active === 'true' || active === '1') where.active = true;
    if (active === 'false' || active === '0') where.active = false;
    const rows = await this.prisma.fiscalClassification.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return rows.map(toClassJson);
  }

  async getClassification(storeId: string, id: string) {
    return toClassJson(await this.findClassification(storeId, id));
  }

  async createClassification(storeId: string, dto: CreateFiscalClassificationDto) {
    if (dto.defaultCfopId) await this.assertCfop(storeId, dto.defaultCfopId);
    const row = await this.prisma.fiscalClassification.create({
      data: {
        id: prefixedId('FIS'),
        storeId,
        name: dto.name.trim(),
        ncm: dto.ncm.trim(),
        cstIcms: optionalText(dto.cstIcms),
        cClasTrib: optionalText(dto.cClasTrib),
        icmsRate: dto.icmsRate ?? 0,
        ipiCst: optionalText(dto.ipiCst),
        ipiRate: dto.ipiRate ?? 0,
        pisCst: optionalText(dto.pisCst),
        pisRate: dto.pisRate ?? 0,
        cofinsCst: optionalText(dto.cofinsCst),
        cofinsRate: dto.cofinsRate ?? 0,
        ibsRate: dto.ibsRate ?? 0,
        cbsRate: dto.cbsRate ?? 0,
        defaultCfopId: optionalText(dto.defaultCfopId),
        notes: optionalText(dto.notes),
        active: dto.active ?? true,
      },
    });
    return toClassJson(row);
  }

  async updateClassification(
    storeId: string,
    id: string,
    dto: UpdateFiscalClassificationDto,
  ) {
    await this.findClassification(storeId, id);
    if (dto.defaultCfopId) await this.assertCfop(storeId, dto.defaultCfopId);
    const row = await this.prisma.fiscalClassification.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.ncm !== undefined ? { ncm: dto.ncm.trim() } : {}),
        ...(dto.cstIcms !== undefined ? { cstIcms: optionalText(dto.cstIcms) } : {}),
        ...(dto.cClasTrib !== undefined ? { cClasTrib: optionalText(dto.cClasTrib) } : {}),
        ...(dto.icmsRate !== undefined ? { icmsRate: dto.icmsRate } : {}),
        ...(dto.ipiCst !== undefined ? { ipiCst: optionalText(dto.ipiCst) } : {}),
        ...(dto.ipiRate !== undefined ? { ipiRate: dto.ipiRate } : {}),
        ...(dto.pisCst !== undefined ? { pisCst: optionalText(dto.pisCst) } : {}),
        ...(dto.pisRate !== undefined ? { pisRate: dto.pisRate } : {}),
        ...(dto.cofinsCst !== undefined ? { cofinsCst: optionalText(dto.cofinsCst) } : {}),
        ...(dto.cofinsRate !== undefined ? { cofinsRate: dto.cofinsRate } : {}),
        ...(dto.ibsRate !== undefined ? { ibsRate: dto.ibsRate } : {}),
        ...(dto.cbsRate !== undefined ? { cbsRate: dto.cbsRate } : {}),
        ...(dto.defaultCfopId !== undefined
          ? { defaultCfopId: optionalText(dto.defaultCfopId) }
          : {}),
        ...(dto.notes !== undefined ? { notes: optionalText(dto.notes) } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
    return toClassJson(row);
  }

  async removeClassification(storeId: string, id: string) {
    await this.findClassification(storeId, id);
    const row = await this.prisma.fiscalClassification.update({
      where: { id },
      data: { active: false },
    });
    return toClassJson(row);
  }

  async listCfops(storeId: string, active?: string) {
    const where: Prisma.CfopCodeWhereInput = { storeId };
    if (active === 'true' || active === '1') where.active = true;
    if (active === 'false' || active === '0') where.active = false;
    const rows = await this.prisma.cfopCode.findMany({
      where,
      orderBy: { code: 'asc' },
    });
    return rows.map(toCfopJson);
  }

  async getCfop(storeId: string, id: string) {
    return toCfopJson(await this.findCfop(storeId, id));
  }

  async createCfop(storeId: string, dto: CreateCfopDto) {
    const code = dto.code.trim();
    await this.assertUniqueCfop(storeId, code);
    const row = await this.prisma.cfopCode.create({
      data: {
        id: prefixedId('CFOP'),
        storeId,
        code,
        description: dto.description.trim(),
        operation: dto.operation,
        active: dto.active ?? true,
      },
    });
    return toCfopJson(row);
  }

  async updateCfop(storeId: string, id: string, dto: UpdateCfopDto) {
    await this.findCfop(storeId, id);
    if (dto.code) await this.assertUniqueCfop(storeId, dto.code.trim(), id);
    const row = await this.prisma.cfopCode.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.operation !== undefined ? { operation: dto.operation } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
    return toCfopJson(row);
  }

  async removeCfop(storeId: string, id: string) {
    await this.findCfop(storeId, id);
    const row = await this.prisma.cfopCode.update({
      where: { id },
      data: { active: false },
    });
    return toCfopJson(row);
  }

  async listFecps(storeId: string, active?: string) {
    const where: Prisma.FecpRuleWhereInput = { storeId };
    if (active === 'true' || active === '1') where.active = true;
    if (active === 'false' || active === '0') where.active = false;
    const rows = await this.prisma.fecpRule.findMany({
      where,
      orderBy: { uf: 'asc' },
    });
    return rows.map(toFecpJson);
  }

  async getFecp(storeId: string, id: string) {
    return toFecpJson(await this.findFecp(storeId, id));
  }

  async createFecp(storeId: string, dto: CreateFecpDto) {
    const uf = upperUf(dto.uf);
    if (uf.length !== 2) throw validation('Informe a UF.');
    const row = await this.prisma.fecpRule.create({
      data: {
        id: prefixedId('FECP'),
        storeId,
        uf,
        description: dto.description.trim(),
        rate: dto.rate,
        active: dto.active ?? true,
      },
    });
    return toFecpJson(row);
  }

  async updateFecp(storeId: string, id: string, dto: UpdateFecpDto) {
    await this.findFecp(storeId, id);
    const row = await this.prisma.fecpRule.update({
      where: { id },
      data: {
        ...(dto.uf !== undefined ? { uf: upperUf(dto.uf) } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.rate !== undefined ? { rate: dto.rate } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
    return toFecpJson(row);
  }

  async removeFecp(storeId: string, id: string) {
    await this.findFecp(storeId, id);
    const row = await this.prisma.fecpRule.update({
      where: { id },
      data: { active: false },
    });
    return toFecpJson(row);
  }

  private async findClassification(storeId: string, id: string) {
    const row = await this.prisma.fiscalClassification.findFirst({
      where: { id, storeId },
    });
    if (!row) throw notFound('Classificação não encontrada.');
    return row;
  }

  private async findCfop(storeId: string, id: string) {
    const row = await this.prisma.cfopCode.findFirst({ where: { id, storeId } });
    if (!row) throw notFound('CFOP não encontrado.');
    return row;
  }

  private async findFecp(storeId: string, id: string) {
    const row = await this.prisma.fecpRule.findFirst({ where: { id, storeId } });
    if (!row) throw notFound('FECP não encontrado.');
    return row;
  }

  private async assertCfop(storeId: string, id: string) {
    const row = await this.prisma.cfopCode.findFirst({ where: { id, storeId } });
    if (!row) throw validation('CFOP padrão inválido.');
  }

  private async assertUniqueCfop(storeId: string, code: string, exceptId?: string) {
    const existing = await this.prisma.cfopCode.findFirst({
      where: { storeId, code, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    });
    if (existing) throw conflict('Já existe CFOP com este código.');
  }
}
