import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
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
}
