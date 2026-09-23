import { Injectable } from '@nestjs/common';
import {
  CrmActivity,
  CrmActivityKind,
  CrmLead,
  CrmLeadSource,
  CrmMessage,
  CrmMessageKind,
  CrmSellerProfile,
  CrmStage,
  Prisma,
} from '@prisma/client';
import { conflict, notFound, validation } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import { iso, isoRequired, money, roundMoney } from '../../common/utils/money';
import { digitsOnly, optionalText } from '../../common/utils/phone';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ClaimCrmLeadDto,
  CreateCrmActivityDto,
  CreateCrmLeadDto,
  CreateCrmLeadMessageDto,
  CreateSellerMessageDto,
  MoveCrmLeadDto,
  UpdateCrmLeadDto,
  UpdateCrmProfileDto,
} from './dto/crm.dto';

const SOURCE_LABEL: Record<CrmLeadSource, string> = {
  demo: 'Demo homepage',
  partner: 'Cadastro parceiro',
  contact: 'Contato',
  manual: 'Manual',
  careers: 'Trabalhe conosco',
};

const STAGE_LABEL: Record<CrmStage, string> = {
  leads: 'Leads — primeiro contato',
  waiting: 'Aguardando resposta',
  attending: 'Em atendimento',
  payment: 'Envio link pagamento',
  won: 'Negócio fechado',
  lost: 'Perdido',
};

const ACTIVITY_LABEL: Record<CrmActivityKind, string> = {
  activity: 'Atividade',
  comment: 'Comentário',
  message: 'Mensagem',
  schedule: 'Agendamento',
  task: 'Tarefa',
  system: 'Sistema',
};

function toLeadJson(row: CrmLead) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    whatsapp: row.whatsapp,
    source: row.source,
    interest: row.interest,
    value: money(row.value),
    stage: row.stage,
    ownerSellerId: row.ownerSellerId,
    ownerName: row.ownerName,
    claimedAt: iso(row.claimedAt),
    notes: row.notes,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
    externalRef: row.externalRef ?? undefined,
    customerId: row.customerId ?? undefined,
    paidAt: iso(row.paidAt),
    graduation: row.graduation,
    polo: row.polo,
    sourceInfo: row.sourceInfo,
    hideContact: row.hideContact,
  };
}

function toActivityJson(row: CrmActivity) {
  return {
    id: row.id,
    leadId: row.leadId,
    kind: row.kind,
    title: row.title,
    body: row.body,
    fromSellerId: row.fromSellerId,
    fromName: row.fromName,
    createdAt: isoRequired(row.createdAt),
    dueAt: iso(row.dueAt),
  };
}

function toMessageJson(row: CrmMessage) {
  return {
    id: row.id,
    kind: row.kind,
    leadId: row.leadId ?? undefined,
    sellerPairKey: row.sellerPairKey ?? undefined,
    fromSellerId: row.fromSellerId,
    fromName: row.fromName,
    fromLead: row.fromLead,
    text: row.body,
    body: row.body,
    createdAt: isoRequired(row.createdAt),
  };
}

function toProfileJson(row: CrmSellerProfile) {
  return {
    sellerId: row.sellerId,
    displayName: row.displayName,
    handle: row.handle,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    coverUrl: row.coverUrl,
    city: row.city,
    specialty: row.specialty,
    whatsapp: row.whatsapp,
    instagram: row.instagram,
    linkedin: row.linkedin,
    website: row.website,
    publicProfile: row.publicProfile,
    updatedAt: isoRequired(row.updatedAt),
  };
}

function sellerPairKey(a: string, b: string) {
  return [a, b].sort().join('::');
}

function slugHandle(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._]/g, '')
    .replace(/^\.|\.$/g, '')
    .slice(0, 24);
}

function parseAt(value?: string) {
  if (!value?.trim()) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw validation('Data/hora inválida.');
  return parsed;
}

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  async listLeads(storeId: string, stage?: CrmStage) {
    const where: Prisma.CrmLeadWhereInput = { storeId };
    if (stage) where.stage = stage;
    const rows = await this.prisma.crmLead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toLeadJson);
  }

  async getLead(storeId: string, id: string) {
    return toLeadJson(await this.findLead(storeId, id));
  }

  async createLead(storeId: string, dto: CreateCrmLeadDto) {
    const name = dto.name.trim();
    if (name.length < 2) throw validation('Informe o nome do lead.');
    if (dto.externalRef) {
      const dup = await this.prisma.crmLead.findFirst({
        where: { storeId, externalRef: dto.externalRef },
      });
      if (dup) return toLeadJson(dup);
    }
    const owner = dto.ownerSellerId
      ? await this.requireSeller(storeId, dto.ownerSellerId)
      : null;
    const stage =
      dto.stage ?? (owner ? CrmStage.attending : CrmStage.leads);
    const row = await this.prisma.$transaction(async (tx) => {
      const lead = await tx.crmLead.create({
        data: {
          id: prefixedId('CRM'),
          storeId,
          name,
          email: optionalText(dto.email).toLowerCase(),
          whatsapp: digitsOnly(dto.whatsapp),
          source: dto.source,
          interest: optionalText(dto.interest),
          value: roundMoney(dto.value ?? 0),
          stage,
          ownerSellerId: owner?.id ?? null,
          ownerName: owner ? owner.name : '',
          claimedAt: owner ? new Date() : null,
          notes: optionalText(dto.notes),
          externalRef: optionalText(dto.externalRef) || null,
          graduation: optionalText(dto.graduation),
          polo: optionalText(dto.polo),
          sourceInfo: optionalText(dto.sourceInfo) || SOURCE_LABEL[dto.source],
          hideContact: dto.hideContact ?? false,
        },
      });
      await this.pushActivity(tx, {
        leadId: lead.id,
        kind: CrmActivityKind.system,
        title: 'Lead criado',
        body: `Lead criado · fonte: ${SOURCE_LABEL[lead.source]}.`,
        fromName: 'Sistema',
      });
      if (owner) {
        await this.pushActivity(tx, {
          leadId: lead.id,
          kind: CrmActivityKind.system,
          title: 'Lead atribuído',
          body: `${owner.name} ficou responsável desde a criação.`,
          fromSellerId: owner.id,
          fromName: owner.name,
        });
      }
      return lead;
    });
    return toLeadJson(row);
  }

  async updateLead(storeId: string, id: string, dto: UpdateCrmLeadDto) {
    await this.findLead(storeId, id);
    const row = await this.prisma.crmLead.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.email !== undefined ? { email: optionalText(dto.email).toLowerCase() } : {}),
        ...(dto.whatsapp !== undefined ? { whatsapp: digitsOnly(dto.whatsapp) } : {}),
        ...(dto.interest !== undefined ? { interest: optionalText(dto.interest) } : {}),
        ...(dto.value !== undefined ? { value: roundMoney(dto.value) } : {}),
        ...(dto.notes !== undefined ? { notes: optionalText(dto.notes) } : {}),
        ...(dto.graduation !== undefined ? { graduation: optionalText(dto.graduation) } : {}),
        ...(dto.polo !== undefined ? { polo: optionalText(dto.polo) } : {}),
        ...(dto.sourceInfo !== undefined ? { sourceInfo: optionalText(dto.sourceInfo) } : {}),
        ...(dto.hideContact !== undefined ? { hideContact: dto.hideContact } : {}),
      },
    });
    return toLeadJson(row);
  }

  async claimLead(storeId: string, id: string, dto: ClaimCrmLeadDto) {
    const lead = await this.findLead(storeId, id);
    const seller = await this.requireSeller(storeId, dto.sellerId);
    if (lead.ownerSellerId && lead.ownerSellerId !== seller.id) {
      throw conflict(
        `Lead sob responsabilidade de ${lead.ownerName}. Outro vendedor não pode atender.`,
      );
    }
    const claimedAt = lead.claimedAt ?? new Date();
    const nextStage = lead.stage === CrmStage.leads ? CrmStage.attending : lead.stage;
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.crmLead.update({
        where: { id: lead.id },
        data: {
          ownerSellerId: seller.id,
          ownerName: seller.name,
          claimedAt,
          stage: nextStage,
        },
      });
      await this.pushActivity(tx, {
        leadId: lead.id,
        kind: CrmActivityKind.system,
        title: 'Lead puxado',
        body: `${seller.name} assumiu o atendimento.`,
        fromSellerId: seller.id,
        fromName: seller.name,
      });
      if (lead.stage === CrmStage.leads) {
        await this.pushActivity(tx, {
          leadId: lead.id,
          kind: CrmActivityKind.system,
          title: 'Etapa alterada',
          body: `Movido para ${STAGE_LABEL.attending}.`,
          fromSellerId: seller.id,
          fromName: seller.name,
        });
      }
      return updated;
    });
    return toLeadJson(row);
  }

  async moveLead(storeId: string, id: string, dto: MoveCrmLeadDto) {
    const lead = await this.findLead(storeId, id);
    let ownerId = lead.ownerSellerId;
    let ownerName = lead.ownerName;
    if (!ownerId) {
      if (!dto.sellerId) throw conflict('Puxe o lead antes de mover no funil.');
      const seller = await this.requireSeller(storeId, dto.sellerId);
      ownerId = seller.id;
      ownerName = seller.name;
    } else if (dto.sellerId && dto.sellerId !== ownerId) {
      throw conflict(`Só ${lead.ownerName} pode mover este lead.`);
    }
    const row = await this.prisma.$transaction(async (tx) => {
      if (!lead.ownerSellerId && ownerId) {
        await this.pushActivity(tx, {
          leadId: lead.id,
          kind: CrmActivityKind.system,
          title: 'Lead puxado',
          body: `${ownerName} assumiu o atendimento ao mover no funil.`,
          fromSellerId: ownerId,
          fromName: ownerName,
        });
      }
      const updated = await tx.crmLead.update({
        where: { id: lead.id },
        data: {
          stage: dto.stage,
          ownerSellerId: ownerId,
          ownerName,
          claimedAt: lead.claimedAt ?? new Date(),
        },
      });
      await this.pushActivity(tx, {
        leadId: lead.id,
        kind: CrmActivityKind.system,
        title: dto.stage === CrmStage.won ? 'Negócio fechado' : 'Etapa alterada',
        body:
          dto.stage === CrmStage.won
            ? 'Negócio fechado. Continua como lead até confirmar o pagamento e virar cliente Marthi.'
            : dto.stage === CrmStage.payment
              ? 'Link de pagamento enviado. Aguardando confirmação.'
              : `Movido para ${STAGE_LABEL[dto.stage]}.`,
        fromSellerId: ownerId,
        fromName: ownerName,
      });
      return updated;
    });
    return toLeadJson(row);
  }

  async listActivities(storeId: string, leadId: string) {
    await this.findLead(storeId, leadId);
    const rows = await this.prisma.crmActivity.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toActivityJson);
  }

  async addActivity(storeId: string, leadId: string, dto: CreateCrmActivityDto) {
    const lead = await this.findLead(storeId, leadId);
    const seller = await this.requireSeller(storeId, dto.sellerId);
    if (!lead.ownerSellerId) {
      throw conflict('Puxe o lead antes de registrar atividades.');
    }
    if (lead.ownerSellerId !== seller.id) {
      throw conflict(`Só ${lead.ownerName} pode registrar neste negócio.`);
    }
    if (dto.kind === CrmActivityKind.system) {
      throw validation('Kind system é reservado.');
    }
    const activity = await this.prisma.crmActivity.create({
      data: {
        id: prefixedId('ACT'),
        leadId,
        kind: dto.kind,
        title: optionalText(dto.title) || ACTIVITY_LABEL[dto.kind],
        body: dto.body.trim(),
        fromSellerId: seller.id,
        fromName: seller.name,
        dueAt: parseAt(dto.dueAt) ?? null,
      },
    });
    await this.prisma.crmLead.update({
      where: { id: leadId },
      data: { updatedAt: new Date() },
    });
    return toActivityJson(activity);
  }

  async listLeadMessages(storeId: string, leadId: string) {
    await this.findLead(storeId, leadId);
    const rows = await this.prisma.crmMessage.findMany({
      where: { storeId, kind: CrmMessageKind.lead, leadId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toMessageJson);
  }

  async sendLeadMessage(storeId: string, leadId: string, dto: CreateCrmLeadMessageDto) {
    const text = optionalText(dto.text) || optionalText(dto.body);
    if (!text) throw validation('Digite a mensagem.');
    const lead = await this.findLead(storeId, leadId);
    const seller = await this.requireSeller(storeId, dto.sellerId);
    return this.prisma.$transaction(async (tx) => {
      let ownerId = lead.ownerSellerId;
      let ownerName = lead.ownerName;
      if (!dto.asLead && !ownerId) {
        ownerId = seller.id;
        ownerName = seller.name;
        await tx.crmLead.update({
          where: { id: lead.id },
          data: {
            ownerSellerId: seller.id,
            ownerName: seller.name,
            claimedAt: lead.claimedAt ?? new Date(),
            stage: lead.stage === CrmStage.leads ? CrmStage.attending : lead.stage,
          },
        });
      } else if (!dto.asLead && ownerId !== seller.id) {
        throw conflict(`Este lead é de ${lead.ownerName}. Só ele pode conversar.`);
      }
      const message = await tx.crmMessage.create({
        data: {
          id: prefixedId('MSG'),
          storeId,
          kind: CrmMessageKind.lead,
          leadId,
          fromSellerId: dto.asLead ? null : seller.id,
          fromName: dto.asLead ? lead.name : seller.name,
          fromLead: Boolean(dto.asLead),
          body: text,
        },
      });
      await this.pushActivity(tx, {
        leadId,
        kind: CrmActivityKind.message,
        title: dto.asLead ? 'Mensagem do cliente' : 'Mensagem enviada',
        body: text,
        fromSellerId: dto.asLead ? null : seller.id,
        fromName: dto.asLead ? lead.name : seller.name,
      });
      return toMessageJson(message);
    });
  }

  async listSellerMessages(storeId: string, sellerA?: string, sellerB?: string) {
    if (!sellerA || !sellerB) throw validation('Informe o par de vendedores.');
    const key = sellerPairKey(sellerA, sellerB);
    const rows = await this.prisma.crmMessage.findMany({
      where: { storeId, kind: CrmMessageKind.sellers, sellerPairKey: key },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toMessageJson);
  }

  async sendSellerMessage(storeId: string, dto: CreateSellerMessageDto) {
    const text = optionalText(dto.text) || optionalText(dto.body);
    if (!text) throw validation('Digite a mensagem.');
    if (dto.fromSellerId === dto.toSellerId) {
      throw validation('Escolha outro vendedor.');
    }
    const from = await this.requireSeller(storeId, dto.fromSellerId);
    await this.requireSeller(storeId, dto.toSellerId);
    const message = await this.prisma.crmMessage.create({
      data: {
        id: prefixedId('MSG'),
        storeId,
        kind: CrmMessageKind.sellers,
        sellerPairKey: sellerPairKey(dto.fromSellerId, dto.toSellerId),
        fromSellerId: from.id,
        fromName: from.name,
        body: text,
      },
    });
    return toMessageJson(message);
  }

  async getProfile(storeId: string, sellerId: string) {
    const seller = await this.requireSeller(storeId, sellerId);
    const existing = await this.prisma.crmSellerProfile.findFirst({
      where: { sellerId, storeId },
    });
    if (existing) return toProfileJson(existing);
    return {
      sellerId: seller.id,
      displayName: seller.name,
      handle: slugHandle(seller.name) || seller.id.slice(0, 24).toLowerCase(),
      bio: '',
      avatarUrl: '',
      coverUrl: '',
      city: '',
      specialty: 'Comercial',
      whatsapp: seller.phone,
      instagram: '',
      linkedin: '',
      website: '',
      publicProfile: true,
      updatedAt: isoRequired(seller.updatedAt),
    };
  }

  async putProfile(storeId: string, sellerId: string, dto: UpdateCrmProfileDto) {
    const seller = await this.requireSeller(storeId, sellerId);
    const displayName = dto.displayName.trim();
    const handle = slugHandle(dto.handle ?? displayName);
    if (!handle) throw validation('Informe um @handle válido.');
    const taken = await this.prisma.crmSellerProfile.findFirst({
      where: { storeId, handle, NOT: { sellerId } },
    });
    if (taken) throw conflict('Este @handle já está em uso.');
    const row = await this.prisma.crmSellerProfile.upsert({
      where: { sellerId },
      create: {
        sellerId: seller.id,
        storeId,
        displayName,
        handle,
        bio: optionalText(dto.bio),
        avatarUrl: optionalText(dto.avatarUrl),
        coverUrl: optionalText(dto.coverUrl),
        city: optionalText(dto.city),
        specialty: optionalText(dto.specialty) || 'Comercial',
        whatsapp: optionalText(dto.whatsapp) || seller.phone,
        instagram: optionalText(dto.instagram),
        linkedin: optionalText(dto.linkedin),
        website: optionalText(dto.website),
        publicProfile: dto.publicProfile ?? true,
      },
      update: {
        displayName,
        handle,
        ...(dto.bio !== undefined ? { bio: optionalText(dto.bio) } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: optionalText(dto.avatarUrl) } : {}),
        ...(dto.coverUrl !== undefined ? { coverUrl: optionalText(dto.coverUrl) } : {}),
        ...(dto.city !== undefined ? { city: optionalText(dto.city) } : {}),
        ...(dto.specialty !== undefined
          ? { specialty: optionalText(dto.specialty) || 'Comercial' }
          : {}),
        ...(dto.whatsapp !== undefined ? { whatsapp: optionalText(dto.whatsapp) } : {}),
        ...(dto.instagram !== undefined ? { instagram: optionalText(dto.instagram) } : {}),
        ...(dto.linkedin !== undefined ? { linkedin: optionalText(dto.linkedin) } : {}),
        ...(dto.website !== undefined ? { website: optionalText(dto.website) } : {}),
        ...(dto.publicProfile !== undefined ? { publicProfile: dto.publicProfile } : {}),
      },
    });
    return toProfileJson(row);
  }

  private async findLead(storeId: string, id: string) {
    const row = await this.prisma.crmLead.findFirst({ where: { id, storeId } });
    if (!row) throw notFound('Lead não encontrado.');
    return row;
  }

  private async requireSeller(storeId: string, id: string) {
    const seller = await this.prisma.seller.findFirst({ where: { id, storeId } });
    if (!seller) throw validation('Vendedor inválido.');
    return seller;
  }

  private async pushActivity(
    tx: Prisma.TransactionClient,
    input: {
      leadId: string;
      kind: CrmActivityKind;
      title: string;
      body: string;
      fromSellerId?: string | null;
      fromName: string;
    },
  ) {
    await tx.crmActivity.create({
      data: {
        id: prefixedId('ACT'),
        leadId: input.leadId,
        kind: input.kind,
        title: input.title,
        body: input.body,
        fromSellerId: input.fromSellerId ?? null,
        fromName: input.fromName,
      },
    });
  }
}
