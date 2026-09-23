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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { StockInvoiceKind, StockInvoiceStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import {
  AddStockInvoiceLineDto,
  CreateStockInvoiceDto,
  UpdateStockInvoiceDto,
} from './dto/stock-invoice.dto';
import { StockInvoicesService } from './stock-invoices.service';

@ApiTags('stock-invoices')
@ApiBearerAuth()
@Controller('stock-invoices')
export class StockInvoicesController {
  constructor(private readonly invoices: StockInvoicesService) {}

  @Get()
  @ApiQuery({ name: 'kind', required: false, enum: StockInvoiceKind })
  @ApiQuery({ name: 'status', required: false, enum: StockInvoiceStatus })
  @ApiOperation({ summary: 'Listar notas de estoque' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('kind') kind?: StockInvoiceKind,
    @Query('status') status?: StockInvoiceStatus,
  ) {
    return this.invoices.list(user.storeId, { kind, status });
  }

  @Post()
  @ApiOperation({ summary: 'Criar rascunho de nota' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateStockInvoiceDto) {
    return this.invoices.create(user.storeId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da nota' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoices.get(user.storeId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar rascunho' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateStockInvoiceDto,
  ) {
    return this.invoices.update(user.storeId, id, dto);
  }

  @Post(':id/lines')
  @ApiOperation({ summary: 'Incluir linha no rascunho' })
  addLine(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddStockInvoiceLineDto,
  ) {
    return this.invoices.addLine(user.storeId, id, dto);
  }

  @Delete(':id/lines/:lineId')
  @ApiOperation({ summary: 'Remover linha do rascunho' })
  removeLine(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
  ) {
    return this.invoices.removeLine(user.storeId, id, lineId);
  }

  @Post(':id/post')
  @ApiOperation({ summary: 'Lançar nota e ajustar estoque' })
  post(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoices.post(user.storeId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar nota e estornar estoque se lançada' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoices.cancel(user.storeId, id);
  }
}
