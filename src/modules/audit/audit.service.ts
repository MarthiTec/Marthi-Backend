import { Injectable } from '@nestjs/common';
import { AuditEntry, AuditKind, Prisma } from '@prisma/client';
import { prefixedId } from '../../common/utils/ids';
import { isoRequired } from '../../common/utils/money';
import { optionalText } from '../../common/utils/phone';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../auth/types/auth.types';
import { CreateAuditDto } from './dto/audit.dto';

const AUDIT_CAP = 400;

function toAuditJson(row: AuditEntry) {
  return {
    id: row.id,
    kind: row.kind,
    at: isoRequired(row.at),
    actorName: row.actorName,
    actorEmail: row.actorEmail,
    action: row.action,
    detail: row.detail,
    path: row.path,
  };
}

function parseBound(value: string | undefined, endOfDay: boolean) {
  if (!value?.trim()) return undefined;
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}-03:00`);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    storeId: string,
    query: { kind?: AuditKind; from?: string; to?: string; q?: string },
  ) {
    const where: Prisma.AuditEntryWhereInput = { storeId };
    if (query.kind) where.kind = query.kind;
    const from = parseBound(query.from, false);
    const to = parseBound(query.to, true);
    if (from || to) {
      where.at = {};
      if (from) where.at.gte = from;
      if (to) where.at.lte = to;
    }
    const needle = query.q?.trim();
    if (needle) {
      where.OR = [
        { action: { contains: needle, mode: 'insensitive' } },
        { detail: { contains: needle, mode: 'insensitive' } },
        { actorName: { contains: needle, mode: 'insensitive' } },
        { actorEmail: { contains: needle, mode: 'insensitive' } },
        { path: { contains: needle, mode: 'insensitive' } },
      ];
    }
    const rows = await this.prisma.auditEntry.findMany({
      where,
      orderBy: { at: 'desc' },
      take: AUDIT_CAP,
    });
    return rows.map(toAuditJson);
  }

  async create(user: AuthUser, dto: CreateAuditDto) {
    const entry = await this.prisma.auditEntry.create({
      data: {
        id: prefixedId('AUD'),
        storeId: user.storeId,
        kind: dto.kind,
        actorName: optionalText(dto.actorName) || user.name || 'Sistema',
        actorEmail: (optionalText(dto.actorEmail) || user.email).toLowerCase(),
        action: dto.action.trim(),
        detail: optionalText(dto.detail),
        path: optionalText(dto.path),
      },
    });
    const extras = await this.prisma.auditEntry.findMany({
      where: { storeId: user.storeId },
      orderBy: { at: 'desc' },
      skip: AUDIT_CAP,
      select: { id: true },
    });
    if (extras.length) {
      await this.prisma.auditEntry.deleteMany({
        where: { id: { in: extras.map((item) => item.id) } },
      });
    }
    return toAuditJson(entry);
  }
}
