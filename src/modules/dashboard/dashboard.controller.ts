import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @ApiQuery({ name: 'days', required: false, description: 'Janela em dias (padrão 7)' })
  @ApiOperation({ summary: 'Resumo do painel inicial (cards + séries)' })
  summary(
    @CurrentUser() user: AuthUser,
    @Query('days') days?: string,
  ) {
    const parsed = Number(days);
    const window = Number.isFinite(parsed) && parsed > 0 && parsed <= 90 ? Math.floor(parsed) : 7;
    return this.dashboard.summary(user.storeId, window);
  }
}
