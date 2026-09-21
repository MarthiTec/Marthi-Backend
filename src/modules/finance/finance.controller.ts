import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FinanceSource } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import { CreateFinanceDto } from './dto/finance.dto';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get()
  @ApiQuery({ name: 'source', required: false, enum: FinanceSource })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOperation({ summary: 'Extrato financeiro (saldo é derivado)' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('source') source?: FinanceSource,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.finance.list(user.storeId, { source, from, to });
  }

  @Post()
  @ApiOperation({ summary: 'Lançamento manual' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFinanceDto) {
    return this.finance.createManual(user.storeId, dto);
  }
}
