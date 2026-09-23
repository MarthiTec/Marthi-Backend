import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EcommerceChannelId } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import {
  ConnectEcommerceChannelDto,
  CreateEcommerceListingDto,
  UpdateEcommerceChannelDto,
  UpdateEcommerceListingDto,
} from './dto/ecommerce.dto';
import { EcommerceService } from './ecommerce.service';

@ApiTags('ecommerce')
@ApiBearerAuth()
@Controller('ecommerce')
export class EcommerceController {
  constructor(private readonly ecommerce: EcommerceService) {}

  @Get('channels')
  @ApiOperation({ summary: 'Listar canais (cria os 5 se ainda não existirem)' })
  listChannels(@CurrentUser() user: AuthUser) {
    return this.ecommerce.listChannels(user.storeId);
  }

  @Get('channels/:id')
  @ApiOperation({ summary: 'Detalhe do canal' })
  getChannel(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseEnumPipe(EcommerceChannelId)) id: EcommerceChannelId,
  ) {
    return this.ecommerce.getChannel(user.storeId, id);
  }

  @Put('channels/:id')
  @ApiOperation({ summary: 'Salvar credenciais (criptografadas)' })
  putChannel(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseEnumPipe(EcommerceChannelId)) id: EcommerceChannelId,
    @Body() dto: UpdateEcommerceChannelDto,
  ) {
    return this.ecommerce.putChannel(user.storeId, id, dto);
  }

  @Post('channels/:id/connect')
  @ApiOperation({ summary: 'Stub: marca canal conectado (sem OAuth)' })
  connect(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseEnumPipe(EcommerceChannelId)) id: EcommerceChannelId,
    @Body() dto: ConnectEcommerceChannelDto,
  ) {
    return this.ecommerce.connect(user.storeId, id, dto);
  }

  @Post('channels/:id/disconnect')
  @ApiOperation({ summary: 'Desconectar canal (mantém credenciais)' })
  disconnect(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseEnumPipe(EcommerceChannelId)) id: EcommerceChannelId,
  ) {
    return this.ecommerce.disconnect(user.storeId, id);
  }

  @Post('channels/:id/sync')
  @ApiOperation({ summary: 'Stub: sincroniza anúncios com estoque' })
  sync(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseEnumPipe(EcommerceChannelId)) id: EcommerceChannelId,
  ) {
    return this.ecommerce.sync(user.storeId, id);
  }

  @Get('listings')
  @ApiQuery({ name: 'channelId', required: false, enum: EcommerceChannelId })
  @ApiOperation({ summary: 'Listar anúncios' })
  listListings(
    @CurrentUser() user: AuthUser,
    @Query('channelId') channelId?: EcommerceChannelId,
  ) {
    return this.ecommerce.listListings(user.storeId, channelId);
  }

  @Post('listings')
  @ApiOperation({ summary: 'Publicar anúncio a partir do estoque' })
  createListing(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateEcommerceListingDto,
  ) {
    return this.ecommerce.createListing(user.storeId, dto);
  }

  @Get('listings/:id')
  @ApiOperation({ summary: 'Detalhe do anúncio' })
  getListing(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ecommerce.getListing(user.storeId, id);
  }

  @Patch('listings/:id')
  @ApiOperation({ summary: 'Atualizar anúncio' })
  updateListing(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateEcommerceListingDto,
  ) {
    return this.ecommerce.updateListing(user.storeId, id, dto);
  }

  @Delete('listings/:id')
  @ApiOperation({ summary: 'Remover anúncio' })
  removeListing(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ecommerce.removeListing(user.storeId, id);
  }

  @Get('orders')
  @ApiQuery({ name: 'channelId', required: false, enum: EcommerceChannelId })
  @ApiOperation({ summary: 'Listar pedidos de marketplace (sem seed fake)' })
  listOrders(
    @CurrentUser() user: AuthUser,
    @Query('channelId') channelId?: EcommerceChannelId,
  ) {
    return this.ecommerce.listOrders(user.storeId, channelId);
  }
}
