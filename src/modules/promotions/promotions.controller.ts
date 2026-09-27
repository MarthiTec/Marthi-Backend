import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import {
  CreatePromoCampaignDto,
  UpdatePromoCampaignDto,
} from './dto/promotion.dto';
import { PromotionsService } from './promotions.service';

@ApiTags('promotions')
@ApiBearerAuth()
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get('campaigns')
  @ApiOperation({ summary: 'Listar campanhas promocionais' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  list(
    @CurrentUser() user: AuthUser,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const isTrue = activeOnly === 'true' || activeOnly === '1';
    return this.promotions.listCampaigns(user.storeId, isTrue);
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Obter campanha promocional' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promotions.getCampaign(user.storeId, id);
  }

  @Post('campaigns')
  @ApiOperation({ summary: 'Criar campanha promocional' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePromoCampaignDto) {
    return this.promotions.createCampaign(user.storeId, dto);
  }

  @Patch('campaigns/:id')
  @ApiOperation({ summary: 'Atualizar campanha promocional' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePromoCampaignDto,
  ) {
    return this.promotions.updateCampaign(user.storeId, id, dto);
  }

  @Delete('campaigns/:id')
  @ApiOperation({ summary: 'Excluir campanha promocional' })
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promotions.deleteCampaign(user.storeId, id);
  }
}
