import {
  OsLineKind,
  Prisma,
  WorkOrder,
  WorkOrderChecklistItem,
  WorkOrderLine,
  WorkOrderPhoto,
} from '@prisma/client';
import { iso, isoRequired, money } from '../../common/utils/money';

export const WORK_ORDER_INCLUDE = {
  lines: true,
  photos: { orderBy: { createdAt: 'asc' as const } },
  checklistItems: { orderBy: { sort: 'asc' as const } },
} satisfies Prisma.WorkOrderInclude;

export type WorkOrderFull = WorkOrder & {
  lines: WorkOrderLine[];
  photos: WorkOrderPhoto[];
  checklistItems: WorkOrderChecklistItem[];
};

export function partsTotalFromLines(lines: WorkOrderLine[]) {
  return lines
    .filter((line) => line.kind === OsLineKind.part)
    .reduce((sum, line) => sum + money(line.unitPrice) * line.qty, 0);
}

export function workOrderRevenue(order: WorkOrderFull) {
  const hasParts = order.lines.some((line) => line.kind === OsLineKind.part);
  const parts = hasParts ? partsTotalFromLines(order.lines) : money(order.parts);
  return money(order.labor) + parts;
}

export function toWorkOrderJson(order: WorkOrderFull) {
  const hasParts = order.lines.some((line) => line.kind === OsLineKind.part);
  const parts = hasParts ? partsTotalFromLines(order.lines) : money(order.parts);
  return {
    id: order.id,
    customerId: order.customerId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerDocument: order.customerDocument,
    customerEmail: order.customerEmail,
    itemName: order.itemName,
    itemBrand: order.itemBrand,
    itemModel: order.itemModel,
    itemColor: order.itemColor,
    itemRef: order.itemRef,
    devicePassword: order.devicePassword,
    accessories: order.accessories,
    conditionOnEntry: order.conditionOnEntry,
    defect: order.defect,
    diagnosis: order.diagnosis,
    notes: order.notes,
    estimatedReadyAt: order.estimatedReadyAt,
    technician: order.technician,
    sellerId: order.sellerId,
    priority: order.priority,
    status: order.status,
    labor: money(order.labor),
    parts,
    lines: order.lines.map((line) => ({
      id: line.id,
      stockId: line.stockId ?? '',
      name: line.name,
      qty: line.qty,
      unitCost: money(line.unitCost),
      unitPrice: money(line.unitPrice),
      kind: line.kind,
      financeId: line.financeId ?? undefined,
    })),
    photos: order.photos.map((photo) => ({
      id: photo.id,
      kind: photo.kind,
      dataUrl: photo.dataUrl,
      caption: photo.caption,
      createdAt: isoRequired(photo.createdAt),
    })),
    checklist: order.checklistItems.map((item) => ({
      id: item.id,
      label: item.label,
      mark: item.mark,
      note: item.note,
    })),
    customerSignature: order.customerSignature,
    customerSignedAt: iso(order.customerSignedAt),
    customerSignedName: order.customerSignedName,
    assetDisposition: order.assetDisposition,
    quoteStatus: order.quoteStatus,
    quoteNotes: order.quoteNotes,
    quoteValidUntil: order.quoteValidUntil,
    quoteSentAt: iso(order.quoteSentAt),
    quoteDecidedAt: iso(order.quoteDecidedAt),
    purchaseCost:
      order.purchaseCost == null ? undefined : money(order.purchaseCost),
    purchaseAt: iso(order.purchaseAt),
    purchaseStockId: order.purchaseStockId ?? undefined,
    purchaseFinanceId: order.purchaseFinanceId ?? undefined,
    revenueFinanceId: order.revenueFinanceId ?? undefined,
    progressStartedAt: iso(order.progressStartedAt),
    deliveredAt: iso(order.deliveredAt),
    createdAt: isoRequired(order.createdAt),
    updatedAt: isoRequired(order.updatedAt),
  };
}

export const DEFAULT_CHECKLIST_LABELS = [
  'Liga / carrega',
  'Touch / display',
  'Áudio (alto-falante / microfone)',
  'Câmeras',
  'Wi-Fi / Bluetooth',
  'Face ID / biometria',
  'Botões físicos',
  'Carcaça / estética',
  'Bateria / aquecimento',
  'Sensores / outros',
] as const;
