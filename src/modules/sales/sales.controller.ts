import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TicketStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import { ClosePosSaleDto } from './dto/close-pos-sale.dto';
import { CreatePosTicketDto, PatchPosTicketDto } from './dto/pos-ticket.dto';
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

  @Get('tickets')
  @ApiQuery({ name: 'status', required: false, enum: TicketStatus })
  @ApiOperation({ summary: 'Fila de tickets PDV' })
  listTickets(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: TicketStatus,
  ) {
    return this.sales.listTickets(user.storeId, status);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Detalhe do ticket' })
  getTicket(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sales.getTicket(user.storeId, id);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Criar ticket manual' })
  createTicket(@CurrentUser() user: AuthUser, @Body() dto: CreatePosTicketDto) {
    return this.sales.createManualTicket(user.storeId, dto);
  }

  @Patch('tickets/:id')
  @ApiOperation({ summary: 'Atualizar status do ticket' })
  patchTicket(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PatchPosTicketDto,
  ) {
    return this.sales.patchTicket(user.storeId, id, dto);
  }

  @Post('sales')
  @ApiOperation({
    summary: 'Fechar venda PDV (pedido + estoque + financeiro + cliente)',
  })
  close(@CurrentUser() user: AuthUser, @Body() dto: ClosePosSaleDto) {
    return this.sales.closeSale(user, dto);
  }
}
