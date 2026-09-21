import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import { ClosePosSaleDto } from './dto/close-pos-sale.dto';
import { SalesService } from './sales.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pedidos da loja' })
  list(@CurrentUser() user: AuthUser) {
    return this.sales.listOrders(user.storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Pedido com linhas' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sales.getOrder(user.storeId, id);
  }
}

@ApiTags('pos')
@ApiBearerAuth()
@Controller('pos')
export class PosController {
  constructor(private readonly sales: SalesService) {}

  @Post('sales')
  @ApiOperation({
    summary: 'Fechar venda PDV (pedido + estoque + financeiro + cliente)',
  })
  close(@CurrentUser() user: AuthUser, @Body() dto: ClosePosSaleDto) {
    return this.sales.closeSale(user, dto);
  }
}
