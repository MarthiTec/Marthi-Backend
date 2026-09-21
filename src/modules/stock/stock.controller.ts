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
import { StockCondition, StockKind } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import { CreateStockDto, UpdateStockDto } from './dto/stock.dto';
import { StockService } from './stock.service';

@ApiTags('stock')
@ApiBearerAuth()
@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get()
  @ApiQuery({ name: 'kind', required: false, enum: StockKind })
  @ApiQuery({ name: 'condition', required: false, enum: StockCondition })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'low', required: false })
  @ApiOperation({ summary: 'Listar estoque' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('kind') kind?: StockKind,
    @Query('condition') condition?: StockCondition,
    @Query('q') q?: string,
    @Query('low') low?: string,
  ) {
    return this.stock.list(user.storeId, { kind, condition, q, low });
  }

  @Get('lookup')
  @ApiQuery({ name: 'code', required: true })
  @ApiOperation({ summary: 'Buscar SKU, barcode, IMEI, id ou nome único' })
  lookup(@CurrentUser() user: AuthUser, @Query('code') code: string) {
    return this.stock.lookup(user.storeId, code ?? '');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do item de estoque' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.stock.get(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar item de estoque' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateStockDto) {
    return this.stock.create(user.storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar item de estoque' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.stock.update(user.storeId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover item de estoque' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.stock.remove(user.storeId, id);
  }
}
