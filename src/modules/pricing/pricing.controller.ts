import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import { CreatePaymentDto, UpdatePaymentDto } from './dto/payment.dto';
import {
  CreatePriceTableDto,
  UpdatePriceTableDto,
} from './dto/price-table.dto';
import { PricingService } from './pricing.service';

@ApiTags('price-tables')
@ApiBearerAuth()
@Controller('price-tables')
export class PriceTablesController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tabelas de preço' })
  list(@CurrentUser() user: AuthUser) {
    return this.pricing.listTables(user.storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da tabela de preço' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.pricing.getTable(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar tabela de preço' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePriceTableDto) {
    return this.pricing.createTable(user.storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar tabela de preço' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePriceTableDto,
  ) {
    return this.pricing.updateTable(user.storeId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover tabela de preço' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.pricing.removeTable(user.storeId, id);
  }
}

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  @ApiOperation({ summary: 'Listar formas de pagamento' })
  list(@CurrentUser() user: AuthUser) {
    return this.pricing.listPayments(user.storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da forma de pagamento' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.pricing.getPayment(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar forma de pagamento' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePaymentDto) {
    return this.pricing.createPayment(user.storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar forma de pagamento' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.pricing.updatePayment(user.storeId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover forma de pagamento' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.pricing.removePayment(user.storeId, id);
  }
}
