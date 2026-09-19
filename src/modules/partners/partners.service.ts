import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { prefixedId } from '../../common/utils/ids';
import { PartnerSignupDto } from './dto/partner-signup.dto';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  async signup(dto: PartnerSignupDto) {
    const created = await this.prisma.partnerSignup.create({
      data: {
        id: prefixedId('PRT'),
        plan: dto.planId,
        modules: dto.modules,
        documentType: dto.documentType,
        document: dto.document,
        legalName: dto.legalName,
        tradeName: dto.tradeName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        zipCode: dto.zipCode,
        street: dto.street,
        number: dto.number,
        complement: dto.complement ?? '',
        district: dto.district,
        city: dto.city,
        state: dto.state.toUpperCase(),
        segment: dto.segment ?? '',
        contactName: dto.contactName,
        contactRole: dto.contactRole ?? '',
        notes: dto.notes ?? '',
      },
    });

    return {
      id: created.id,
      message: 'Cadastro recebido. A equipe Marthi entrará em contato.',
    };
  }

  async pending() {
    const items = await this.prisma.partnerSignup.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      count: items.length,
      items: items.map((item) => ({
        id: item.id,
        createdAt: item.createdAt.toISOString(),
        planId: item.plan,
        modules: item.modules,
        tradeName: item.tradeName,
        legalName: item.legalName,
        email: item.email,
        city: item.city,
        state: item.state,
      })),
    };
  }
}
