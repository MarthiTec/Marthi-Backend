import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CardapioOrderStatus, ReservationStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthUser } from '../auth/types/auth.types';
import { CardapioService } from './cardapio.service';
import {
  CreateCardapioCategoryDto,
  CreateCardapioItemDto,
  CreateCardapioOrderDto,
  CreateCardapioReservationDto,
  UpdateCardapioCategoryDto,
  UpdateCardapioConfigDto,
  UpdateCardapioItemDto,
  UpdateCardapioOrderStatusDto,
  UpdateCardapioReservationStatusDto,
} from './dto/cardapio.dto';

@ApiTags('cardapio')
@Controller('cardapio')
export class CardapioController {
  constructor(private readonly cardapio: CardapioService) {}

  // =================== PUBLIC ===================

  @Public()
  @Get('public/:slug')
  @ApiOperation({ summary: 'Obter cardápio digital público da loja por slug' })
  getPublic(@Param('slug') slug: string) {
    return this.cardapio.getPublicCatalog(slug);
  }

  @Public()
  @Post('public/:slug/orders')
  @ApiOperation({ summary: 'Enviar pedido via cardápio público' })
  createPublicOrder(
    @Param('slug') slug: string,
    @Body() dto: CreateCardapioOrderDto,
  ) {
    return this.cardapio.createPublicOrder(slug, dto);
  }

  @Public()
  @Post('public/:slug/reservations')
  @ApiOperation({ summary: 'Solicitar reserva de mesa via cardápio público' })
  createPublicReservation(
    @Param('slug') slug: string,
    @Body() dto: CreateCardapioReservationDto,
  ) {
    return this.cardapio.createPublicReservation(slug, dto);
  }

  // =================== CONFIG ===================

  @ApiBearerAuth()
  @Get('config')
  @ApiOperation({ summary: 'Obter configurações do cardápio digital' })
  getConfig(@CurrentUser() user: AuthUser) {
    return this.cardapio.getConfig(user.storeId);
  }

  @ApiBearerAuth()
  @Put('config')
  @ApiOperation({ summary: 'Atualizar configurações do cardápio digital' })
  updateConfig(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCardapioConfigDto,
  ) {
    return this.cardapio.updateConfig(user.storeId, dto);
  }

  // =================== CATEGORIES ===================

  @ApiBearerAuth()
  @Get('categories')
  @ApiOperation({ summary: 'Listar categorias do cardápio' })
  listCategories(@CurrentUser() user: AuthUser) {
    return this.cardapio.listCategories(user.storeId);
  }

  @ApiBearerAuth()
  @Post('categories')
  @ApiOperation({ summary: 'Criar categoria no cardápio' })
  createCategory(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCardapioCategoryDto,
  ) {
    return this.cardapio.createCategory(user.storeId, dto);
  }

  @ApiBearerAuth()
  @Patch('categories/:id')
  @ApiOperation({ summary: 'Atualizar categoria do cardápio' })
  updateCategory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCardapioCategoryDto,
  ) {
    return this.cardapio.updateCategory(user.storeId, id, dto);
  }

  @ApiBearerAuth()
  @Delete('categories/:id')
  @ApiOperation({ summary: 'Remover categoria do cardápio' })
  deleteCategory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cardapio.deleteCategory(user.storeId, id);
  }

  // =================== ITEMS ===================

  @ApiBearerAuth()
  @Get('items')
  @ApiOperation({ summary: 'Listar itens do cardápio' })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  listItems(
    @CurrentUser() user: AuthUser,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.cardapio.listItems(user.storeId, categoryId);
  }

  @ApiBearerAuth()
  @Get('items/:id')
  @ApiOperation({ summary: 'Obter item do cardápio' })
  getItem(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cardapio.getItem(user.storeId, id);
  }

  @ApiBearerAuth()
  @Post('items')
  @ApiOperation({ summary: 'Criar item no cardápio' })
  createItem(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCardapioItemDto,
  ) {
    return this.cardapio.createItem(user.storeId, dto);
  }

  @ApiBearerAuth()
  @Patch('items/:id')
  @ApiOperation({ summary: 'Atualizar item do cardápio' })
  updateItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCardapioItemDto,
  ) {
    return this.cardapio.updateItem(user.storeId, id, dto);
  }

  @ApiBearerAuth()
  @Delete('items/:id')
  @ApiOperation({ summary: 'Remover item do cardápio' })
  deleteItem(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cardapio.deleteItem(user.storeId, id);
  }

  // =================== ORDERS ===================

  @ApiBearerAuth()
  @Get('orders')
  @ApiOperation({ summary: 'Listar pedidos do cardápio' })
  @ApiQuery({ name: 'status', required: false, enum: CardapioOrderStatus })
  listOrders(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: CardapioOrderStatus,
  ) {
    return this.cardapio.listOrders(user.storeId, status);
  }

  @ApiBearerAuth()
  @Post('orders')
  @ApiOperation({ summary: 'Criar pedido administrativo no cardápio' })
  createOrder(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCardapioOrderDto,
  ) {
    return this.cardapio.createOrder(user.storeId, dto);
  }

  @ApiBearerAuth()
  @Patch('orders/:id')
  @ApiOperation({ summary: 'Atualizar status do pedido do cardápio' })
  updateOrderStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCardapioOrderStatusDto,
  ) {
    return this.cardapio.updateOrderStatus(user.storeId, id, dto);
  }

  // =================== RESERVATIONS ===================

  @ApiBearerAuth()
  @Get('reservations')
  @ApiOperation({ summary: 'Listar reservas de mesas' })
  @ApiQuery({ name: 'status', required: false, enum: ReservationStatus })
  listReservations(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: ReservationStatus,
  ) {
    return this.cardapio.listReservations(user.storeId, status);
  }

  @ApiBearerAuth()
  @Post('reservations')
  @ApiOperation({ summary: 'Criar reserva de mesa administrativa' })
  createReservation(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCardapioReservationDto,
  ) {
    return this.cardapio.createReservation(user.storeId, dto);
  }

  @ApiBearerAuth()
  @Patch('reservations/:id')
  @ApiOperation({ summary: 'Atualizar status da reserva de mesa' })
  updateReservationStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCardapioReservationStatusDto,
  ) {
    return this.cardapio.updateReservationStatus(user.storeId, id, dto);
  }
}
