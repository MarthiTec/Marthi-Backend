import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import { UpdateStorePlanDto, UpdateTotemSettingsDto } from './dto/store.dto';
import { StoreService } from './store.service';

@ApiTags('store')
@ApiBearerAuth()
@Controller('store')
export class StoreController {
  constructor(private readonly store: StoreService) {}

  @Get('plan')
  @ApiOperation({ summary: 'Plano e módulos da loja' })
  getPlan(@CurrentUser() user: AuthUser) {
    return this.store.getPlan(user.storeId);
  }

  @Put('plan')
  @ApiOperation({ summary: 'Atualizar plano da loja' })
  updatePlan(@CurrentUser() user: AuthUser, @Body() dto: UpdateStorePlanDto) {
    return this.store.updatePlan(user.storeId, dto);
  }

  @Get('totem-settings')
  @ApiOperation({ summary: 'Configurações do totem' })
  getTotem(@CurrentUser() user: AuthUser) {
    return this.store.getTotemSettings(user.storeId);
  }

  @Put('totem-settings')
  @ApiOperation({ summary: 'Atualizar configurações do totem' })
  updateTotem(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTotemSettingsDto,
  ) {
    return this.store.updateTotemSettings(user.storeId, dto);
  }
}
