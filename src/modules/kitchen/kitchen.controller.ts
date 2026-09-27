import {
  Body,
  Controller,
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
import { CardapioOrderStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import {
  CreateKitchenTableDto,
  UpdateKitchenOrderStatusDto,
  UpdateKitchenTableDto,
} from './dto/kitchen.dto';
import { KitchenService } from './kitchen.service';

@ApiTags('kitchen')
@ApiBearerAuth()
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly kitchen: KitchenService) {}

  @Get('orders')
  @ApiOperation({ summary: 'Fila de pedidos da cozinha KDS' })
  @ApiQuery({ name: 'status', required: false, enum: CardapioOrderStatus })
  listOrders(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: CardapioOrderStatus,
  ) {
    return this.kitchen.listOrders(user.storeId, status);
  }

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Atualizar status do pedido na cozinha' })
  updateOrderStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateKitchenOrderStatusDto,
  ) {
    return this.kitchen.updateOrderStatus(user.storeId, id, dto);
  }

  @Get('tables')
  @ApiOperation({ summary: 'Listar mesas do restaurante' })
  listTables(@CurrentUser() user: AuthUser) {
    return this.kitchen.listTables(user.storeId);
  }

  @Post('tables')
  @ApiOperation({ summary: 'Cadastrar nova mesa' })
  createTable(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateKitchenTableDto,
  ) {
    return this.kitchen.createTable(user.storeId, dto);
  }

  @Patch('tables/:id')
  @ApiOperation({ summary: 'Atualizar status ou dados da mesa' })
  updateTable(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateKitchenTableDto,
  ) {
    return this.kitchen.updateTable(user.storeId, id, dto);
  }
}
