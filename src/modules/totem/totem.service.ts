import { Injectable } from '@nestjs/common';
import { TicketSource } from '@prisma/client';
import { DEMO_STORE_ID, prefixedId } from '../../common/utils/ids';
import { PrismaService } from '../../prisma/prisma.service';
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
}

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
