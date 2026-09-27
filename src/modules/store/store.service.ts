import { Injectable } from '@nestjs/common';
import { TotemSettings } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  assertModulesForPlan,
  clampModulesForPlan,
} from '../../common/constants/plans';
import { isImageDataUrl } from '../../common/constants/uploads';
import { notFound, validation } from '../../common/errors/http';
import { UpdateStorePlanDto, UpdateTotemSettingsDto } from './dto/store.dto';

function toTotemJson(row: TotemSettings) {
  return {
    mode: row.mode,
    exitPassword: row.exitPassword,
    shareStockWithErp: row.shareStockWithErp,
    vertical: row.vertical,
    columns: row.columns as 1 | 2 | 3 | 4,
    showAttractScreen: row.showAttractScreen,
    storeName: row.storeName,
    storeLogo: row.storeLogo,
    attractBackground: row.attractBackground,
    attractGradientColor: row.attractGradientColor,
    attractLayout: row.attractLayout,
    keyboardPlacement: row.keyboardPlacement,
    askCustomerName: row.askCustomerName,
    offerFulfillment: row.offerFulfillment,
    printTicket: row.printTicket,
    audioAssist: row.audioAssist,
    storeWhatsApp: row.storeWhatsApp,
    notifyCustomerOnLead: row.notifyCustomerOnLead,
    locationLabel: row.locationLabel,
  };
}

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlan(storeId: string) {
    const row = await this.prisma.storeEntitlement.findUnique({
      where: { storeId },
    });
    if (!row) throw notFound('Plano da loja não encontrado.');
    return { planId: row.plan, modules: row.modules };
  }

  async updatePlan(storeId: string, dto: UpdateStorePlanDto) {
    if (!assertModulesForPlan(dto.planId, dto.modules)) {
      throw validation('Módulos inválidos para o plano.', {
        planId: dto.planId,
        modules: dto.modules,
      });
    }
    const modules = clampModulesForPlan(dto.planId, dto.modules);
    const row = await this.prisma.storeEntitlement.upsert({
      where: { storeId },
      update: { plan: dto.planId, modules },
      create: { storeId, plan: dto.planId, modules },
    });
    return { planId: row.plan, modules: row.modules };
  }

  async getTotemSettings(storeId: string) {
    const row = await this.prisma.totemSettings.upsert({
      where: { storeId },
      update: {},
      create: {
        storeId,
        mode: 'kiosk',
        exitPassword: 'cellponto',
        shareStockWithErp: true,
      },
    });
    return toTotemJson(row);
  }

  async updateTotemSettings(storeId: string, dto: UpdateTotemSettingsDto) {
    if (dto.storeLogo && !isImageDataUrl(dto.storeLogo)) {
      throw validation('Logo precisa ser data URL de imagem ou null.');
    }
    if (dto.attractBackground && !isImageDataUrl(dto.attractBackground)) {
      throw validation('Fundo precisa ser data URL de imagem ou null.');
    }
    const current = await this.getTotemSettings(storeId);
    const row = await this.prisma.totemSettings.update({
      where: { storeId },
      data: {
        mode: dto.mode ?? current.mode,
        exitPassword: dto.exitPassword?.trim() || current.exitPassword,
        shareStockWithErp: dto.shareStockWithErp ?? current.shareStockWithErp,
        vertical: dto.vertical ?? current.vertical,
        columns: dto.columns ?? current.columns,
        showAttractScreen: dto.showAttractScreen ?? current.showAttractScreen,
        storeName: dto.storeName?.trim() || current.storeName,
        storeLogo:
          dto.storeLogo === undefined ? current.storeLogo : dto.storeLogo,
        attractBackground:
          dto.attractBackground === undefined
            ? current.attractBackground
            : dto.attractBackground,
        attractGradientColor:
          dto.attractGradientColor?.trim() || current.attractGradientColor,
        attractLayout: dto.attractLayout ?? current.attractLayout,
        keyboardPlacement: dto.keyboardPlacement ?? current.keyboardPlacement,
        askCustomerName: dto.askCustomerName ?? current.askCustomerName,
        offerFulfillment: dto.offerFulfillment ?? current.offerFulfillment,
        printTicket: dto.printTicket ?? current.printTicket,
        audioAssist: dto.audioAssist ?? current.audioAssist,
        storeWhatsApp:
          dto.storeWhatsApp !== undefined
            ? dto.storeWhatsApp.trim()
            : current.storeWhatsApp,
        notifyCustomerOnLead:
          dto.notifyCustomerOnLead ?? current.notifyCustomerOnLead,
        locationLabel:
          dto.locationLabel !== undefined
            ? dto.locationLabel.trim()
            : current.locationLabel,
      },
    });
    return toTotemJson(row);
  }

  async getCustomization(storeId: string) {
    const row = await this.prisma.storeCustomization.findUnique({
      where: { storeId },
    });
    return (
      row ?? {
        storeId,
        segmentId: 'assistencia_tecnica',
        showImei: true,
        showDevicePassword: true,
        showTablesAndKitchen: false,
        showSizeColorGrid: false,
      }
    );
  }

  async updateCustomization(storeId: string, dto: any) {
    return this.prisma.storeCustomization.upsert({
      where: { storeId },
      create: {
        storeId,
        segmentId: dto.segmentId ?? 'assistencia_tecnica',
        showImei: dto.showImei ?? true,
        showDevicePassword: dto.showDevicePassword ?? true,
        showTablesAndKitchen: dto.showTablesAndKitchen ?? false,
        showSizeColorGrid: dto.showSizeColorGrid ?? false,
      },
      update: {
        ...(dto.segmentId !== undefined ? { segmentId: dto.segmentId } : {}),
        ...(dto.showImei !== undefined ? { showImei: dto.showImei } : {}),
        ...(dto.showDevicePassword !== undefined
          ? { showDevicePassword: dto.showDevicePassword }
          : {}),
        ...(dto.showTablesAndKitchen !== undefined
          ? { showTablesAndKitchen: dto.showTablesAndKitchen }
          : {}),
        ...(dto.showSizeColorGrid !== undefined
          ? { showSizeColorGrid: dto.showSizeColorGrid }
          : {}),
      },
    });
  }

  async getOperations(storeId: string) {
    const row = await this.prisma.storeOperations.findUnique({
      where: { storeId },
    });
    return (row?.shortcuts as any[]) ?? [];
  }

  async updateOperations(storeId: string, shortcuts: any) {
    const row = await this.prisma.storeOperations.upsert({
      where: { storeId },
      create: { storeId, shortcuts: Array.isArray(shortcuts) ? shortcuts : [] },
      update: { shortcuts: Array.isArray(shortcuts) ? shortcuts : [] },
    });
    return row.shortcuts;
  }
}
