import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthUser } from '../auth/types/auth.types';
import { TotemClickDto } from './dto/totem-click.dto';
import { TotemLeadDto } from './dto/totem-lead.dto';
import { TotemService } from './totem.service';

@ApiTags('totem')
@Controller('totem')
export class TotemController {
  constructor(private readonly totem: TotemService) {}

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('leads')
  @ApiOperation({ summary: 'Lead do totem → fila PDV (público)' })
  createLead(@Body() dto: TotemLeadDto) {
    return this.totem.createLead(dto);
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post('analytics/clicks')
  @ApiOperation({ summary: 'Registrar clique de produto no totem (público, loja seed)' })
  trackClick(@Body() dto: TotemClickDto) {
    return this.totem.trackClick(dto);
  }

  @Get('analytics/summary')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ranking de cliques (dia + total) e estatísticas do dia' })
  summary(@CurrentUser() user: AuthUser) {
    return this.totem.summary(user.storeId);
  }
}
