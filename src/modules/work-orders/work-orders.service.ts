import { Injectable } from '@nestjs/common';
import {
  AssetDisposition,
  FinanceSource,
  FinanceType,
  OsLineKind,
  OsStatus,
  Prisma,
  QuoteStatus,
  StockCondition,
  StockKind,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { conflict, notFound, validation } from '../../common/errors/http';
import { prefixedId } from '../../common/utils/ids';
import {
  isImageDataUrl,
  MAX_WORK_ORDER_PHOTOS,
} from '../../common/constants/uploads';
import { money, roundMoney } from '../../common/utils/money';
import { optionalText } from '../../common/utils/phone';
import { toStockJson } from '../stock/stock.service';
import {
  AddPhotoDto,
  ConsumePartDto,
  CreateWorkOrderDto,
  PatchChecklistDto,
  PurchaseAssetDto,
  QuoteApproveDto,
  QuoteDraftDto,
  SignatureDto,
  UpdateWorkOrderDto,
} from './dto/work-order.dto';
import {
  DEFAULT_CHECKLIST_LABELS,
  partsTotalFromLines,
  toWorkOrderJson,
  WORK_ORDER_INCLUDE,
  WorkOrderFull,
  workOrderRevenue,
} from './work-orders.mapper';

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    storeId: string,
    query: { status?: OsStatus; technician?: string; q?: string },
  ) {
    const where: Prisma.WorkOrderWhereInput = { storeId };
    if (query.status) where.status = query.status;
    if (query.technician?.trim()) {
      where.technician = { contains: query.technician.trim(), mode: 'insensitive' };
    }
    const needle = query.q?.trim();
    if (needle) {
      where.OR = [
        { id: { contains: needle, mode: 'insensitive' } },
        { customerName: { contains: needle, mode: 'insensitive' } },
        { customerPhone: { contains: needle } },
        { customerDocument: { contains: needle } },
        { itemName: { contains: needle, mode: 'insensitive' } },
        { itemRef: { contains: needle, mode: 'insensitive' } },
        { technician: { contains: needle, mode: 'insensitive' } },
      ];
    }
    const rows = await this.prisma.workOrder.findMany({
      where,
      include: WORK_ORDER_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => toWorkOrderJson(row as WorkOrderFull));
  }

  async get(storeId: string, id: string) {
    return toWorkOrderJson(await this.findOwned(storeId, id));
  }

  async create(storeId: string, dto: CreateWorkOrderDto) {
    let customerId = dto.customerId ?? null;
    if (customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, storeId },
      });
      if (!customer) throw notFound('Cliente não encontrado.');
    }

    const row = await this.prisma.workOrder.create({
      data: {
        id: prefixedId('OS'),
        storeId,
        customerId,
        customerName: dto.customerName.trim(),
        customerPhone: optionalText(dto.customerPhone),
        customerDocument: optionalText(dto.customerDocument),
        customerEmail: optionalText(dto.customerEmail).toLowerCase(),
        itemName: dto.itemName.trim(),
        itemBrand: optionalText(dto.itemBrand),
        itemModel: optionalText(dto.itemModel),
        itemColor: optionalText(dto.itemColor),
        itemRef: optionalText(dto.itemRef),
        devicePassword: optionalText(dto.devicePassword),
        accessories: optionalText(dto.accessories),
        conditionOnEntry: optionalText(dto.conditionOnEntry),
        defect: dto.defect.trim(),
        diagnosis: optionalText(dto.diagnosis),
        notes: optionalText(dto.notes),
        estimatedReadyAt: optionalText(dto.estimatedReadyAt),
        technician: optionalText(dto.technician),
        sellerId: optionalText(dto.sellerId),
        priority: dto.priority,
        labor: dto.labor ?? 0,
        checklistItems: {
          create: DEFAULT_CHECKLIST_LABELS.map((label, index) => ({
            id: prefixedId('CL'),
            label,
            mark: 'unchecked',
            note: '',
            sort: index,
          })),
        },
      },
      include: WORK_ORDER_INCLUDE,
    });
    return toWorkOrderJson(row as WorkOrderFull);
  }

  async update(storeId: string, id: string, dto: UpdateWorkOrderDto) {
    const current = await this.findOwned(storeId, id);
    if (dto.status === OsStatus.delivered || dto.status === OsStatus.cancelled) {
      throw validation('Use POST /deliver ou POST /cancel para encerrar a OS.');
    }
    if (dto.assetDisposition === AssetDisposition.purchased) {
      throw conflict('Use POST /work-orders/:id/purchase para marcar como comprado.');
    }
    if (current.purchaseStockId && dto.assetDisposition) {
      throw conflict('Já existe compra registrada — não dá para mudar o destino.');
    }

    const now = new Date();
    const row = await this.prisma.workOrder.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.status === OsStatus.progress && !current.progressStartedAt
          ? { progressStartedAt: now }
          : {}),
        ...(dto.labor !== undefined ? { labor: dto.labor } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.diagnosis !== undefined ? { diagnosis: dto.diagnosis } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.technician !== undefined ? { technician: dto.technician } : {}),
        ...(dto.sellerId !== undefined ? { sellerId: dto.sellerId } : {}),
        ...(dto.estimatedReadyAt !== undefined
          ? { estimatedReadyAt: dto.estimatedReadyAt }
          : {}),
        ...(dto.assetDisposition !== undefined
          ? { assetDisposition: dto.assetDisposition }
          : {}),
        ...(dto.quoteNotes !== undefined ? { quoteNotes: dto.quoteNotes } : {}),
        ...(dto.quoteValidUntil !== undefined
          ? { quoteValidUntil: dto.quoteValidUntil }
          : {}),
        ...(dto.customerName !== undefined
          ? { customerName: dto.customerName.trim() }
          : {}),
        ...(dto.customerPhone !== undefined
          ? { customerPhone: dto.customerPhone }
          : {}),
        ...(dto.customerDocument !== undefined
          ? { customerDocument: dto.customerDocument }
          : {}),
        ...(dto.customerEmail !== undefined
          ? { customerEmail: dto.customerEmail }
          : {}),
        ...(dto.itemName !== undefined ? { itemName: dto.itemName.trim() } : {}),
        ...(dto.itemBrand !== undefined ? { itemBrand: dto.itemBrand } : {}),
        ...(dto.itemModel !== undefined ? { itemModel: dto.itemModel } : {}),
        ...(dto.itemColor !== undefined ? { itemColor: dto.itemColor } : {}),
        ...(dto.itemRef !== undefined ? { itemRef: dto.itemRef } : {}),
        ...(dto.devicePassword !== undefined
          ? { devicePassword: dto.devicePassword }
          : {}),
        ...(dto.accessories !== undefined ? { accessories: dto.accessories } : {}),
        ...(dto.conditionOnEntry !== undefined
          ? { conditionOnEntry: dto.conditionOnEntry }
          : {}),
      },
      include: WORK_ORDER_INCLUDE,
    });
    return toWorkOrderJson(row as WorkOrderFull);
  }

  async consumePart(storeId: string, osId: string, dto: ConsumePartDto) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await this.loadTx(tx, storeId, osId);
      if (order.status === OsStatus.cancelled || order.status === OsStatus.delivered) {
        throw conflict('OS encerrada — não dá para baixar peças.');
      }
      const stock = await tx.stockItem.findFirst({
        where: { id: dto.stockId, storeId },
      });
      if (!stock) throw notFound('Item de estoque não encontrado.');
      if (stock.qty < dto.qty) {
        throw conflict(`Estoque insuficiente (${stock.qty} disponível).`);
      }

      const unitCost = money(stock.cost);
      const unitPrice = dto.unitPrice ?? money(stock.price);
      const costTotal = roundMoney(unitCost * dto.qty);

      await tx.stockItem.update({
        where: { id: stock.id },
        data: { qty: stock.qty - dto.qty },
      });

      const finance = await tx.financeEntry.create({
        data: {
          id: prefixedId('FIN'),
          storeId,
          type: FinanceType.out,
          label: `${osId} · peça ${stock.name}`,
          amount: costTotal,
          source: FinanceSource.os_part,
          refId: osId,
        },
      });

      await tx.workOrderLine.create({
        data: {
          id: prefixedId('OL'),
          workOrderId: osId,
          stockId: stock.id,
          name: stock.name,
          qty: dto.qty,
          unitCost,
          unitPrice,
          kind: OsLineKind.part,
          financeId: finance.id,
        },
      });

      return this.syncParts(tx, osId);
    });
    return toWorkOrderJson(updated);
  }

  async removePart(storeId: string, osId: string, lineId: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await this.loadTx(tx, storeId, osId);
      if (order.status === OsStatus.delivered) {
        throw conflict('OS já entregue — não dá para remover peça.');
      }
      const line = order.lines.find((item) => item.id === lineId);
      if (!line) throw notFound('Linha não encontrada.');
      if (line.kind !== OsLineKind.part || !line.stockId) {
        throw conflict('Só linhas de peça com estoque podem ser estornadas assim.');
      }

      await tx.stockItem.update({
        where: { id: line.stockId },
        data: { qty: { increment: line.qty } },
      });

      await tx.financeEntry.create({
        data: {
          id: prefixedId('FIN'),
          storeId,
          type: FinanceType.in,
          label: `${osId} · estorno peça ${line.name}`,
          amount: roundMoney(money(line.unitCost) * line.qty),
          source: FinanceSource.os_reversal,
          refId: osId,
        },
      });

      await tx.workOrderLine.delete({ where: { id: lineId } });
      return this.syncParts(tx, osId);
    });
    return toWorkOrderJson(updated);
  }

  async purchase(storeId: string, osId: string, dto: PurchaseAssetDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await this.loadTx(tx, storeId, osId);
      if (order.status === OsStatus.cancelled) throw conflict('OS cancelada.');
      if (order.assetDisposition === AssetDisposition.purchased && order.purchaseStockId) {
        throw conflict('Equipamento já comprado para estoque nesta OS.');
      }

      const name =
        dto.name?.trim() || order.itemName.trim() || 'Aparelho recondicionado';
      const sku =
        dto.sku?.trim() ||
        `REC-${osId.replace(/^OS-/, '')}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
      const imei =
        dto.imei?.trim() || order.itemRef.replace(/[^\d]/g, '').slice(0, 15);
      const price = dto.price ?? roundMoney(dto.cost * 1.35);
      const stockId = prefixedId('STK');

      const stock = await tx.stockItem.create({
        data: {
          id: stockId,
          storeId,
          name,
          sku,
          barcode: '',
          imei,
          qty: 1,
          minQty: 0,
          cost: dto.cost,
          price,
          kind: dto.kind ?? StockKind.device,
          condition: StockCondition.refurbished,
          sourceWorkOrderId: osId,
          showOnTotem: false,
        },
        include: { attributes: true, images: true },
      });

      const finance = await tx.financeEntry.create({
        data: {
          id: prefixedId('FIN'),
          storeId,
          type: FinanceType.out,
          label: `${osId} · compra recondicionado ${name}`,
          amount: dto.cost,
          source: FinanceSource.os_purchase,
          refId: osId,
        },
      });

      const updated = await tx.workOrder.update({
        where: { id: osId },
        data: {
          assetDisposition: AssetDisposition.purchased,
          purchaseCost: dto.cost,
          purchaseAt: new Date(),
          purchaseStockId: stock.id,
          purchaseFinanceId: finance.id,
        },
        include: WORK_ORDER_INCLUDE,
      });

      return { order: updated as WorkOrderFull, stock };
    });

    return {
      ...toWorkOrderJson(result.order),
      stock: toStockJson(result.stock),
    };
  }

  async deliver(storeId: string, osId: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await this.loadTx(tx, storeId, osId);
      if (order.status === OsStatus.cancelled) throw conflict('OS cancelada.');
      if (order.status === OsStatus.delivered) throw conflict('OS já entregue.');

      const revenue = workOrderRevenue(order);
      let revenueFinanceId = order.revenueFinanceId;
      if (revenue > 0 && !revenueFinanceId) {
        const finance = await tx.financeEntry.create({
          data: {
            id: prefixedId('FIN'),
            storeId,
            type: FinanceType.in,
            label: `${osId} · receita serviço (${revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`,
            amount: revenue,
            source: FinanceSource.os_revenue,
            refId: osId,
          },
        });
        revenueFinanceId = finance.id;
      }

      return tx.workOrder.update({
        where: { id: osId },
        data: {
          status: OsStatus.delivered,
          revenueFinanceId,
          deliveredAt: new Date(),
        },
        include: WORK_ORDER_INCLUDE,
      });
    });
    return toWorkOrderJson(updated as WorkOrderFull);
  }

  async cancel(storeId: string, osId: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await this.loadTx(tx, storeId, osId);
      if (order.status === OsStatus.delivered) {
        throw conflict('OS entregue — cancele via estorno manual se necessário.');
      }
      if (order.status === OsStatus.cancelled) return order;
      if (order.revenueFinanceId) {
        throw conflict('Há receita lançada — estorne manualmente antes de cancelar.');
      }

      for (const line of order.lines) {
        if (line.kind !== OsLineKind.part || !line.stockId) continue;
        await tx.stockItem.update({
          where: { id: line.stockId },
          data: { qty: { increment: line.qty } },
        });
        await tx.financeEntry.create({
          data: {
            id: prefixedId('FIN'),
            storeId,
            type: FinanceType.in,
            label: `${osId} · estorno peça ${line.name}`,
            amount: roundMoney(money(line.unitCost) * line.qty),
            source: FinanceSource.os_reversal,
            refId: osId,
          },
        });
        await tx.workOrderLine.delete({ where: { id: line.id } });
      }

      if (order.purchaseStockId && order.purchaseCost != null) {
        const stock = await tx.stockItem.findFirst({
          where: { id: order.purchaseStockId, storeId },
          include: { attributes: true, images: true },
        });
        if (stock) {
          if (stock.qty < 1) {
            throw conflict(
              'Aparelho comprado já saiu do estoque — não dá para cancelar automaticamente.',
            );
          }
          await tx.workOrder.update({
            where: { id: osId },
            data: { purchaseStockId: null },
          });
          await tx.stockItem.delete({ where: { id: stock.id } });
          await tx.financeEntry.create({
            data: {
              id: prefixedId('FIN'),
              storeId,
              type: FinanceType.in,
              label: `${osId} · estorno compra recondicionado ${stock.name}`,
              amount: money(order.purchaseCost),
              source: FinanceSource.os_reversal,
              refId: osId,
            },
          });
        }
      }

      return tx.workOrder.update({
        where: { id: osId },
        data: {
          status: OsStatus.cancelled,
          assetDisposition: order.purchaseStockId
            ? AssetDisposition.customer
            : order.assetDisposition,
          purchaseStockId: null,
          purchaseFinanceId: null,
          purchaseCost: null,
          purchaseAt: null,
          parts: 0,
        },
        include: WORK_ORDER_INCLUDE,
      });
    });
    return toWorkOrderJson(updated as WorkOrderFull);
  }

  async addPhoto(storeId: string, osId: string, dto: AddPhotoDto) {
    if (!isImageDataUrl(dto.dataUrl)) {
      throw validation('Foto precisa ser data URL de imagem (JPEG/PNG).');
    }
    const order = await this.findOwned(storeId, osId);
    if (order.status === OsStatus.cancelled) throw conflict('OS cancelada.');
    if (order.photos.length >= MAX_WORK_ORDER_PHOTOS) {
      throw conflict(`Limite de ${MAX_WORK_ORDER_PHOTOS} fotos por OS.`);
    }
    await this.prisma.workOrderPhoto.create({
      data: {
        id: prefixedId('PH'),
        workOrderId: osId,
        kind: dto.kind,
        dataUrl: dto.dataUrl,
        caption: optionalText(dto.caption),
      },
    });
    return this.get(storeId, osId);
  }

  async removePhoto(storeId: string, osId: string, photoId: string) {
    const order = await this.findOwned(storeId, osId);
    if (order.status === OsStatus.delivered || order.status === OsStatus.cancelled) {
      throw conflict('OS encerrada — não dá para remover fotos.');
    }
    const photo = order.photos.find((item) => item.id === photoId);
    if (!photo) throw notFound('Foto não encontrada.');
    await this.prisma.workOrderPhoto.delete({ where: { id: photoId } });
    return this.get(storeId, osId);
  }

  async patchChecklist(
    storeId: string,
    osId: string,
    itemId: string,
    dto: PatchChecklistDto,
  ) {
    const order = await this.findOwned(storeId, osId);
    if (order.status === OsStatus.delivered || order.status === OsStatus.cancelled) {
      throw conflict('OS encerrada — checklist bloqueado.');
    }
    const item = order.checklistItems.find((row) => row.id === itemId);
    if (!item) throw notFound('Item de checklist não encontrado.');
    await this.prisma.workOrderChecklistItem.update({
      where: { id: itemId },
      data: {
        ...(dto.mark !== undefined ? { mark: dto.mark } : {}),
        ...(dto.note !== undefined ? { note: dto.note.trim() } : {}),
      },
    });
    return this.get(storeId, osId);
  }

  async sign(storeId: string, osId: string, dto: SignatureDto) {
    if (!isImageDataUrl(dto.dataUrl)) {
      throw validation('Assinatura inválida.');
    }
    const order = await this.findOwned(storeId, osId);
    if (order.status === OsStatus.cancelled) throw conflict('OS cancelada.');
    await this.prisma.workOrder.update({
      where: { id: osId },
      data: {
        customerSignature: dto.dataUrl,
        customerSignedAt: new Date(),
        customerSignedName: (dto.signedName ?? order.customerName).trim(),
      },
    });
    return this.get(storeId, osId);
  }

  async clearSignature(storeId: string, osId: string) {
    const order = await this.findOwned(storeId, osId);
    if (order.status === OsStatus.delivered || order.status === OsStatus.cancelled) {
      throw conflict('OS encerrada — assinatura bloqueada.');
    }
    await this.prisma.workOrder.update({
      where: { id: osId },
      data: {
        customerSignature: '',
        customerSignedAt: null,
        customerSignedName: '',
      },
    });
    return this.get(storeId, osId);
  }

  async quoteDraft(storeId: string, osId: string, dto: QuoteDraftDto) {
    const order = await this.findOwned(storeId, osId);
    this.assertOpenQuote(order);
    if (order.quoteStatus === QuoteStatus.approved) {
      throw conflict('Orçamento já aprovado. Crie revisão nas observações se precisar.');
    }
    await this.prisma.workOrder.update({
      where: { id: osId },
      data: {
        labor: dto.labor ?? order.labor,
        quoteNotes: dto.notes ?? order.quoteNotes,
        quoteValidUntil: dto.validUntil ?? order.quoteValidUntil,
        quoteStatus: QuoteStatus.draft,
        quoteDecidedAt: null,
      },
    });
    return this.get(storeId, osId);
  }

  async quoteSend(storeId: string, osId: string) {
    const order = await this.findOwned(storeId, osId);
    this.assertOpenQuote(order);
    const total = workOrderRevenue(order);
    if (total <= 0 && !order.quoteNotes.trim()) {
      throw validation('Informe valores ou descrição do orçamento antes de enviar.');
    }
    const waiting =
      order.status === OsStatus.open || order.status === OsStatus.diagnosis
        ? OsStatus.waiting
        : order.status;
    await this.prisma.workOrder.update({
      where: { id: osId },
      data: {
        quoteStatus: QuoteStatus.sent,
        quoteSentAt: new Date(),
        quoteDecidedAt: null,
        status: waiting,
      },
    });
    return this.get(storeId, osId);
  }

  async quoteApprove(storeId: string, osId: string, dto: QuoteApproveDto) {
    const order = await this.findOwned(storeId, osId);
    if (
      order.quoteStatus !== QuoteStatus.sent &&
      order.quoteStatus !== QuoteStatus.draft
    ) {
      throw conflict('Só dá para aprovar orçamento enviado ou em rascunho.');
    }
    const move = dto.moveToProgress !== false;
    const now = new Date();
    await this.prisma.workOrder.update({
      where: { id: osId },
      data: {
        quoteStatus: QuoteStatus.approved,
        quoteDecidedAt: now,
        status: move ? OsStatus.progress : order.status,
        ...(move && !order.progressStartedAt ? { progressStartedAt: now } : {}),
      },
    });
    return this.get(storeId, osId);
  }

  async quoteReject(storeId: string, osId: string) {
    const order = await this.findOwned(storeId, osId);
    if (
      order.quoteStatus !== QuoteStatus.sent &&
      order.quoteStatus !== QuoteStatus.draft
    ) {
      throw conflict('Só dá para recusar orçamento enviado ou em rascunho.');
    }
    await this.prisma.workOrder.update({
      where: { id: osId },
      data: {
        quoteStatus: QuoteStatus.rejected,
        quoteDecidedAt: new Date(),
        status: OsStatus.waiting,
      },
    });
    return this.get(storeId, osId);
  }

  async quoteReopen(storeId: string, osId: string) {
    const order = await this.findOwned(storeId, osId);
    if (
      order.quoteStatus !== QuoteStatus.rejected &&
      order.quoteStatus !== QuoteStatus.sent
    ) {
      throw conflict('Nada para reabrir.');
    }
    await this.prisma.workOrder.update({
      where: { id: osId },
      data: {
        quoteStatus: QuoteStatus.draft,
        quoteDecidedAt: null,
      },
    });
    return this.get(storeId, osId);
  }

  private assertOpenQuote(order: WorkOrderFull) {
    if (order.status === OsStatus.delivered || order.status === OsStatus.cancelled) {
      throw conflict('OS encerrada — não dá para alterar orçamento.');
    }
  }

  private async findOwned(storeId: string, id: string) {
    const row = await this.prisma.workOrder.findFirst({
      where: { id, storeId },
      include: WORK_ORDER_INCLUDE,
    });
    if (!row) throw notFound('OS não encontrada.');
    return row as WorkOrderFull;
  }

  private async loadTx(
    tx: Prisma.TransactionClient,
    storeId: string,
    id: string,
  ) {
    const row = await tx.workOrder.findFirst({
      where: { id, storeId },
      include: WORK_ORDER_INCLUDE,
    });
    if (!row) throw notFound('OS não encontrada.');
    return row as WorkOrderFull;
  }

  private async syncParts(tx: Prisma.TransactionClient, osId: string) {
    const order = await tx.workOrder.findFirstOrThrow({
      where: { id: osId },
      include: WORK_ORDER_INCLUDE,
    });
    const parts = partsTotalFromLines(order.lines);
    return tx.workOrder.update({
      where: { id: osId },
      data: { parts },
      include: WORK_ORDER_INCLUDE,
    }) as Promise<WorkOrderFull>;
  }
}
