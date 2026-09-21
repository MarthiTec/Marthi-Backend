import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  assertModulesForPlan,
  clampModulesForPlan,
} from '../../common/constants/plans';
import { notFound, validation } from '../../common/errors/http';
import {
  UpdateStorePlanDto,
  UpdateTotemSettingsDto,
} from './dto/store.dto';

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
        shareStockWithErp: false,
      },
    });
    return {
      mode: row.mode,
      exitPassword: row.exitPassword,
      shareStockWithErp: row.shareStockWithErp,
    };
  }

  async updateTotemSettings(storeId: string, dto: UpdateTotemSettingsDto) {
    const current = await this.getTotemSettings(storeId);
    const row = await this.prisma.totemSettings.update({
      where: { storeId },
      data: {
        mode: dto.mode ?? current.mode,
        exitPassword: dto.exitPassword?.trim() || current.exitPassword,
        shareStockWithErp: dto.shareStockWithErp ?? current.shareStockWithErp,
      },
    });
    return {
      mode: row.mode,
      exitPassword: row.exitPassword,
      shareStockWithErp: row.shareStockWithErp,
    };
  }
}
