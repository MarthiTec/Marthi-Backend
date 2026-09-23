import { Injectable } from '@nestjs/common';
import {
  FiscalCClassTrib,
  FiscalCstCode,
  FiscalIssuerSettings,
  FiscalLogEntry,
  FiscalSefazEnvironment,
  FiscalStorageMode,
  FiscalTaxSyncSource,
} from '@prisma/client';
import { validation } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { iso, isoRequired, money } from '../../common/utils/money';
import { digitsOnly, optionalText, upperUf } from '../../common/utils/phone';
import { encryptSecret } from '../../common/utils/secret';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateFiscalLogDto,
  ReplaceTaxTablesDto,
  TaxCClassDto,
  TaxCstDto,
  UpdateIssuerSettingsDto,
} from './dto/fiscal.dto';

const LOG_CAP = 400;
const CCLASSTRIB_PORTAL_URL =
  'https://dfe-portal.svrs.rs.gov.br/Cff/ClassificacaoTributaria';
const CCLASSTRIB_API_URL = 'https://cff.svrs.rs.gov.br/api/v1/consultas/classTrib';

function toIssuerJson(row: FiscalIssuerSettings) {
  return {
    emitenteName: row.emitenteName,
    cnpj: row.cnpj,
    ie: row.ie,
    im: row.im,
    cMun: row.cMun,
    municipio: row.municipio,
    uf: row.uf,
    certificateFileName: row.certificateFileName,
    certificateBase64: row.certificateBase64,
    certificatePassword: '',
    hasCertificatePassword: Boolean(row.certificatePasswordEnc),
    cscId: row.cscId,
    cscToken: '',
    hasCscToken: Boolean(row.cscTokenEnc),
    environment: row.environment,
    nfeSeries: row.nfeSeries,
    nfceSeries: row.nfceSeries,
    nfseSeries: row.nfseSeries,
    cteSeries: row.cteSeries,
    mdfeSeries: row.mdfeSeries,
    cbsRateBase: money(row.cbsRateBase),
    ibsRateBase: money(row.ibsRateBase),
    issqnRateDefault: money(row.issqnRateDefault),
    issqnRetainedRate: money(row.issqnRetainedRate),
    issqnMunicipalCode: row.issqnMunicipalCode,
    storageMode: row.storageMode,
    localRootPath: row.localRootPath,
    localXmlPath: row.localXmlPath,
    localLogPath: row.localLogPath,
    localPdfPath: row.localPdfPath,
    localPdvPath: row.localPdvPath,
    cloudEnabled: row.cloudEnabled,
    cloudBucketHint: row.cloudBucketHint,
    updatedAt: isoRequired(row.updatedAt),
  };
}

function toLogJson(row: FiscalLogEntry) {
  return {
    id: row.id,
    at: isoRequired(row.at),
    family: row.family,
    action: row.action,
    detail: row.detail,
    refId: row.refId ?? undefined,
  };
}

function toCstJson(row: FiscalCstCode) {
  return {
    code: row.code,
    name: row.name,
    description: row.description,
    active: row.active,
  };
}

function toClassJson(row: FiscalCClassTrib) {
  return {
    code: row.code,
    name: row.name,
    cstCode: row.cstCode,
    description: row.description,
    linkLc: row.linkLc ?? undefined,
    active: row.active,
  };
}

const ISSUER_DEFAULTS = {
  emitenteName: '',
  cnpj: '',
  ie: '',
  im: '',
  cMun: '3304557',
  municipio: 'Rio de Janeiro',
  uf: 'RJ',
  certificateFileName: '',
  certificateBase64: '',
  certificatePasswordEnc: '',
  cscId: '',
  cscTokenEnc: '',
  environment: FiscalSefazEnvironment.homologacao,
  nfeSeries: '1',
  nfceSeries: '1',
  nfseSeries: '1',
  cteSeries: '1',
  mdfeSeries: '1',
  cbsRateBase: 0.9,
  ibsRateBase: 0.1,
  issqnRateDefault: 5,
  issqnRetainedRate: 0,
  issqnMunicipalCode: '',
  storageMode: FiscalStorageMode.both,
  localRootPath: 'C:\\Marthi\\Fiscal',
  localXmlPath: 'C:\\Marthi\\Fiscal\\XML',
  localLogPath: 'C:\\Marthi\\Fiscal\\LOG',
  localPdfPath: 'C:\\Marthi\\Fiscal\\PDF',
  localPdvPath: 'C:\\Marthi\\Fiscal\\PDV',
  cloudEnabled: true,
  cloudBucketHint: 'marthi-fiscal',
};

@Injectable()
export class FiscalService {
  constructor(private readonly prisma: PrismaService) {}

  async getIssuer(storeId: string) {
    const row = await this.ensureIssuer(storeId);
    return toIssuerJson(row);
  }

  async putIssuer(storeId: string, dto: UpdateIssuerSettingsDto) {
    const current = await this.ensureIssuer(storeId);
    const cnpj =
      dto.cnpj !== undefined ? digitsOnly(dto.cnpj) : digitsOnly(current.cnpj);
    if (cnpj && cnpj.length !== 14) {
      throw validation('CNPJ do emitente deve ter 14 dígitos.');
    }
    const cscId = dto.cscId !== undefined ? dto.cscId.trim() : current.cscId;
    if (cscId && !/^\d{1,6}$/.test(cscId)) {
      throw validation('CSC Id deve ser numérico (até 6 dígitos).');
    }
    const rates: Array<[string, number]> = [
      ['CBS', dto.cbsRateBase ?? money(current.cbsRateBase)],
      ['IBS', dto.ibsRateBase ?? money(current.ibsRateBase)],
      ['ISSQN', dto.issqnRateDefault ?? money(current.issqnRateDefault)],
      ['ISSQN retido', dto.issqnRetainedRate ?? money(current.issqnRetainedRate)],
    ];
    for (const [label, value] of rates) {
      if (Number.isNaN(value) || value < 0 || value > 100) {
        throw validation(`Alíquota ${label} deve estar entre 0 e 100%.`);
      }
    }

    let storageMode = dto.storageMode ?? current.storageMode;
    let cloudEnabled = dto.cloudEnabled ?? current.cloudEnabled;
    if (storageMode === FiscalStorageMode.cloud || storageMode === FiscalStorageMode.both) {
      cloudEnabled = true;
    }
    if (storageMode === FiscalStorageMode.local) cloudEnabled = false;
    const localRootPath =
      dto.localRootPath !== undefined
        ? optionalText(dto.localRootPath)
        : current.localRootPath;
    if (
      (storageMode === FiscalStorageMode.local || storageMode === FiscalStorageMode.both) &&
      !localRootPath
    ) {
      throw validation('Informe a pasta base na máquina (XML / LOG / PDF).');
    }

    let certificatePasswordEnc = current.certificatePasswordEnc;
    if (dto.certificatePassword !== undefined) {
      certificatePasswordEnc = dto.certificatePassword.trim()
        ? encryptSecret(dto.certificatePassword)
        : '';
    }
    let cscTokenEnc = current.cscTokenEnc;
    if (dto.cscToken !== undefined) {
      cscTokenEnc = dto.cscToken.trim() ? encryptSecret(dto.cscToken) : '';
    }

    const row = await this.prisma.fiscalIssuerSettings.update({
      where: { storeId },
      data: {
        ...(dto.emitenteName !== undefined
          ? { emitenteName: optionalText(dto.emitenteName) }
          : {}),
        ...(dto.cnpj !== undefined ? { cnpj } : {}),
        ...(dto.ie !== undefined ? { ie: optionalText(dto.ie) } : {}),
        ...(dto.im !== undefined ? { im: optionalText(dto.im) } : {}),
        ...(dto.cMun !== undefined ? { cMun: optionalText(dto.cMun) } : {}),
        ...(dto.municipio !== undefined
          ? { municipio: optionalText(dto.municipio) }
          : {}),
        ...(dto.uf !== undefined ? { uf: upperUf(dto.uf) || current.uf } : {}),
        ...(dto.certificateFileName !== undefined
          ? { certificateFileName: optionalText(dto.certificateFileName) }
          : {}),
        ...(dto.certificateBase64 !== undefined
          ? { certificateBase64: optionalText(dto.certificateBase64) }
          : {}),
        certificatePasswordEnc,
        ...(dto.cscId !== undefined ? { cscId } : {}),
        cscTokenEnc,
        ...(dto.environment !== undefined ? { environment: dto.environment } : {}),
        ...(dto.nfeSeries !== undefined ? { nfeSeries: optionalText(dto.nfeSeries) || '1' } : {}),
        ...(dto.nfceSeries !== undefined
          ? { nfceSeries: optionalText(dto.nfceSeries) || '1' }
          : {}),
        ...(dto.nfseSeries !== undefined
          ? { nfseSeries: optionalText(dto.nfseSeries) || '1' }
          : {}),
        ...(dto.cteSeries !== undefined ? { cteSeries: optionalText(dto.cteSeries) || '1' } : {}),
        ...(dto.mdfeSeries !== undefined
          ? { mdfeSeries: optionalText(dto.mdfeSeries) || '1' }
          : {}),
        ...(dto.cbsRateBase !== undefined ? { cbsRateBase: dto.cbsRateBase } : {}),
        ...(dto.ibsRateBase !== undefined ? { ibsRateBase: dto.ibsRateBase } : {}),
        ...(dto.issqnRateDefault !== undefined
          ? { issqnRateDefault: dto.issqnRateDefault }
          : {}),
        ...(dto.issqnRetainedRate !== undefined
          ? { issqnRetainedRate: dto.issqnRetainedRate }
          : {}),
        ...(dto.issqnMunicipalCode !== undefined
          ? { issqnMunicipalCode: optionalText(dto.issqnMunicipalCode) }
          : {}),
        storageMode,
        ...(dto.localRootPath !== undefined ? { localRootPath } : {}),
        ...(dto.localXmlPath !== undefined
          ? { localXmlPath: optionalText(dto.localXmlPath) }
          : {}),
        ...(dto.localLogPath !== undefined
          ? { localLogPath: optionalText(dto.localLogPath) }
          : {}),
        ...(dto.localPdfPath !== undefined
          ? { localPdfPath: optionalText(dto.localPdfPath) }
          : {}),
        ...(dto.localPdvPath !== undefined
          ? { localPdvPath: optionalText(dto.localPdvPath) }
          : {}),
        cloudEnabled,
        ...(dto.cloudBucketHint !== undefined
          ? { cloudBucketHint: optionalText(dto.cloudBucketHint) }
          : {}),
      },
    });
    return toIssuerJson(row);
  }

  async listLogs(storeId: string) {
    const rows = await this.prisma.fiscalLogEntry.findMany({
      where: { storeId },
      orderBy: { at: 'desc' },
      take: 50,
    });
    return rows.map(toLogJson);
  }

  async appendLog(storeId: string, dto: CreateFiscalLogDto) {
    const entry = await this.prisma.fiscalLogEntry.create({
      data: {
        id: prefixedId('FLOG'),
        storeId,
        family: dto.family,
        action: dto.action.trim(),
        detail: dto.detail.trim(),
        refId: optionalText(dto.refId) || null,
      },
    });
    const extras = await this.prisma.fiscalLogEntry.findMany({
      where: { storeId },
      orderBy: { at: 'desc' },
      skip: LOG_CAP,
      select: { id: true },
    });
    if (extras.length) {
      await this.prisma.fiscalLogEntry.deleteMany({
        where: { id: { in: extras.map((item) => item.id) } },
      });
    }
    return toLogJson(entry);
  }

  async getTaxTables(storeId: string) {
    await this.ensureTaxMeta(storeId);
    const [csts, classes, meta] = await Promise.all([
      this.prisma.fiscalCstCode.findMany({
        where: { storeId },
        orderBy: { code: 'asc' },
      }),
      this.prisma.fiscalCClassTrib.findMany({
        where: { storeId },
        orderBy: { code: 'asc' },
      }),
      this.prisma.fiscalTaxTablesMeta.findUniqueOrThrow({ where: { storeId } }),
    ]);
    return {
      csts: csts.map(toCstJson),
      cClassTribs: classes.map(toClassJson),
      lastSyncAt: iso(meta.lastSyncAt) ?? '',
      lastSyncSource: meta.lastSyncSource,
      lastSyncMessage: meta.lastSyncMessage,
    };
  }

  async putTaxTables(storeId: string, dto: ReplaceTaxTablesDto) {
    await this.ensureTaxMeta(storeId);
    await this.prisma.$transaction(async (tx) => {
      await tx.fiscalCstCode.deleteMany({ where: { storeId } });
      await tx.fiscalCClassTrib.deleteMany({ where: { storeId } });
      if (dto.csts.length) {
        await tx.fiscalCstCode.createMany({
          data: dto.csts.map((item) => this.normalizeCst(storeId, item)),
        });
      }
      if (dto.cClassTribs.length) {
        await tx.fiscalCClassTrib.createMany({
          data: dto.cClassTribs.map((item) => this.normalizeClass(storeId, item)),
        });
      }
      await tx.fiscalTaxTablesMeta.update({
        where: { storeId },
        data: {
          lastSyncAt: new Date(),
          lastSyncSource: FiscalTaxSyncSource.manual,
          lastSyncMessage: 'Tabelas substituídas manualmente.',
        },
      });
    });
    return this.getTaxTables(storeId);
  }

  async syncTaxTables(storeId: string) {
    await this.ensureTaxMeta(storeId);
    const enabled = process.env.FISCAL_TAX_SYNC === 'true';
    if (!enabled) {
      await this.prisma.fiscalTaxTablesMeta.update({
        where: { storeId },
        data: {
          lastSyncAt: new Date(),
          lastSyncSource: FiscalTaxSyncSource.manual,
          lastSyncMessage:
            'Sync SVRS desligado (FISCAL_TAX_SYNC). API exige mTLS. Portal: ' +
            CCLASSTRIB_PORTAL_URL,
        },
      });
      return this.getTaxTables(storeId);
    }
    try {
      const response = await fetch(CCLASSTRIB_API_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = (await response.json()) as unknown;
      const mapped = mapApiPayload(json);
      if (!mapped.csts.length && !mapped.cClassTribs.length) {
        throw new Error('Resposta sem CST/cClassTrib reconhecíveis.');
      }
      await this.prisma.$transaction(async (tx) => {
        if (mapped.csts.length) {
          await tx.fiscalCstCode.deleteMany({ where: { storeId } });
          await tx.fiscalCstCode.createMany({
            data: mapped.csts.map((item) => this.normalizeCst(storeId, item)),
          });
        }
        if (mapped.cClassTribs.length) {
          await tx.fiscalCClassTrib.deleteMany({ where: { storeId } });
          await tx.fiscalCClassTrib.createMany({
            data: mapped.cClassTribs.map((item) =>
              this.normalizeClass(storeId, item),
            ),
          });
        }
        await tx.fiscalTaxTablesMeta.update({
          where: { storeId },
          data: {
            lastSyncAt: new Date(),
            lastSyncSource: FiscalTaxSyncSource.api,
            lastSyncMessage: `Sincronizado da API SVRS · ${mapped.csts.length} CST · ${mapped.cClassTribs.length} cClassTrib.`,
          },
        });
      });
    } catch {
      await this.prisma.fiscalTaxTablesMeta.update({
        where: { storeId },
        data: {
          lastSyncAt: new Date(),
          lastSyncSource: FiscalTaxSyncSource.seed,
          lastSyncMessage:
            'API SVRS exige certificado digital (mTLS). Mantendo tabela local — portal: ' +
            CCLASSTRIB_PORTAL_URL,
        },
      });
    }
    return this.getTaxTables(storeId);
  }

  private async ensureIssuer(storeId: string) {
    const existing = await this.prisma.fiscalIssuerSettings.findUnique({
      where: { storeId },
    });
    if (existing) return existing;
    return this.prisma.fiscalIssuerSettings.create({
      data: { storeId, ...ISSUER_DEFAULTS },
    });
  }

  private async ensureTaxMeta(storeId: string) {
    const existing = await this.prisma.fiscalTaxTablesMeta.findUnique({
      where: { storeId },
    });
    if (existing) return existing;
    return this.prisma.fiscalTaxTablesMeta.create({
      data: {
        storeId,
        lastSyncSource: FiscalTaxSyncSource.seed,
        lastSyncMessage: 'Tabelas iniciais (seed).',
      },
    });
  }

  private normalizeCst(storeId: string, item: TaxCstDto) {
    const code = digitsOnly(item.code).padStart(3, '0').slice(0, 3);
    if (code.length !== 3) throw validation('CST deve ter 3 dígitos.');
    if (!item.name.trim()) throw validation('Informe o nome do CST.');
    return {
      storeId,
      code,
      name: item.name.trim(),
      description: optionalText(item.description),
      active: item.active ?? true,
    };
  }

  private normalizeClass(storeId: string, item: TaxCClassDto) {
    const code = digitsOnly(item.code).padStart(6, '0').slice(0, 6);
    if (code.length !== 6) throw validation('cClassTrib deve ter 6 dígitos.');
    if (!item.name.trim()) throw validation('Informe o nome do cClassTrib.');
    const cstCode = digitsOnly(item.cstCode || code.slice(0, 3))
      .padStart(3, '0')
      .slice(0, 3);
    return {
      storeId,
      code,
      name: item.name.trim(),
      cstCode,
      description: optionalText(item.description),
      linkLc: optionalText(item.linkLc) || null,
      active: item.active ?? true,
    };
  }
}

function mapApiPayload(raw: unknown): { csts: TaxCstDto[]; cClassTribs: TaxCClassDto[] } {
  const rows = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)
      ? ((raw as { data: unknown[] }).data)
      : raw && typeof raw === 'object' && Array.isArray((raw as { itens?: unknown }).itens)
        ? ((raw as { itens: unknown[] }).itens)
        : [];
  const cstMap = new Map<string, TaxCstDto>();
  const classes: TaxCClassDto[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    const cClass = String(
      item.cClassTrib ?? item.cClasTrib ?? item.codigo ?? item.code ?? '',
    ).replace(/\D/g, '');
    const cst = String(item.cst ?? item.Cst ?? item.CST ?? cClass.slice(0, 3))
      .replace(/\D/g, '')
      .padStart(3, '0');
    const name = String(
      item.nomeCClassTrib ?? item.nome ?? item.name ?? item.descricao ?? item.description ?? cClass,
    );
    const cstName = String(item.nomeCst ?? item.NomeCst ?? item.cstNome ?? `CST ${cst}`);
    if (cst.length === 3 && !cstMap.has(cst)) {
      cstMap.set(cst, { code: cst, name: cstName, description: '', active: true });
    }
    if (cClass.length >= 6) {
      classes.push({
        code: cClass.padStart(6, '0').slice(0, 6),
        name,
        cstCode: cst.slice(0, 3),
        description: String(item.descricao ?? item.description ?? ''),
        linkLc: item.linkLc ? String(item.linkLc) : undefined,
        active: true,
      });
    }
  }
  return { csts: [...cstMap.values()], cClassTribs: classes };
}
