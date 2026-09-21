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
import { OsStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import {
  AddPhotoDto,
  ConsumePartDto,
  CreateWorkOrderDto,
  PatchChecklistDto,
  PurchaseAssetDto,
  QuoteApproveDto,
  QuoteDraftDto,
  SignatureDto,
  UpdateWorkOrderDto,
} from './dto/work-order.dto';
import { WorkOrdersService } from './work-orders.service';

@ApiTags('work-orders')
@ApiBearerAuth()
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrders: WorkOrdersService) {}

  @Get()
  @ApiQuery({ name: 'status', required: false, enum: OsStatus })
  @ApiQuery({ name: 'technician', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiOperation({ summary: 'Listar ordens de serviço' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: OsStatus,
    @Query('technician') technician?: string,
    @Query('q') q?: string,
  ) {
    return this.workOrders.list(user.storeId, { status, technician, q });
  }

  @Get(':id')
  @ApiOperation({ summary: 'OS completa (lines, photos, checklist, quote)' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workOrders.get(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Abrir OS' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkOrderDto) {
    return this.workOrders.create(user.storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar OS (sem deliver/cancel/purchase)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    return this.workOrders.update(user.storeId, id, dto);
  }

  @Post(':id/parts')
  @ApiOperation({ summary: 'Consumir peça (baixa estoque + custo)' })
  consumePart(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ConsumePartDto,
  ) {
    return this.workOrders.consumePart(user.storeId, id, dto);
  }

  @Delete(':id/parts/:lineId')
  @ApiOperation({ summary: 'Estornar peça' })
  removePart(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
  ) {
    return this.workOrders.removePart(user.storeId, id, lineId);
  }

  @Post(':id/purchase')
  @ApiOperation({ summary: 'Comprar recondicionado para estoque' })
  purchase(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PurchaseAssetDto,
  ) {
    return this.workOrders.purchase(user.storeId, id, dto);
  }

  @Post(':id/deliver')
  @ApiOperation({ summary: 'Entregar OS e lançar receita' })
  deliver(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workOrders.deliver(user.storeId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar OS com reversões' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workOrders.cancel(user.storeId, id);
  }

  @Post(':id/photos')
  @ApiOperation({ summary: 'Anexar foto (data URL, MVP)' })
  addPhoto(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddPhotoDto,
  ) {
    return this.workOrders.addPhoto(user.storeId, id, dto);
  }

  @Delete(':id/photos/:photoId')
  @ApiOperation({ summary: 'Remover foto' })
  removePhoto(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    return this.workOrders.removePhoto(user.storeId, id, photoId);
  }

  @Patch(':id/checklist/:itemId')
  @ApiOperation({ summary: 'Atualizar item do checklist' })
  patchChecklist(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: PatchChecklistDto,
  ) {
    return this.workOrders.patchChecklist(user.storeId, id, itemId, dto);
  }

  @Post(':id/signature')
  @ApiOperation({ summary: 'Assinatura do cliente (data URL)' })
  sign(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SignatureDto,
  ) {
    return this.workOrders.sign(user.storeId, id, dto);
  }

  @Delete(':id/signature')
  @ApiOperation({ summary: 'Limpar assinatura' })
  clearSignature(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workOrders.clearSignature(user.storeId, id);
  }

  @Post(':id/quote/draft')
  @ApiOperation({ summary: 'Rascunho de orçamento' })
  quoteDraft(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: QuoteDraftDto,
  ) {
    return this.workOrders.quoteDraft(user.storeId, id, dto);
  }

  @Post(':id/quote/send')
  @ApiOperation({ summary: 'Enviar orçamento (OS → waiting)' })
  quoteSend(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workOrders.quoteSend(user.storeId, id);
  }

  @Post(':id/quote/approve')
  @ApiOperation({ summary: 'Aprovar orçamento' })
  quoteApprove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: QuoteApproveDto,
  ) {
    return this.workOrders.quoteApprove(user.storeId, id, dto);
  }

  @Post(':id/quote/reject')
  @ApiOperation({ summary: 'Recusar orçamento' })
  quoteReject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workOrders.quoteReject(user.storeId, id);
  }

  @Post(':id/quote/reopen')
  @ApiOperation({ summary: 'Reabrir orçamento recusado/enviado' })
  quoteReopen(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workOrders.quoteReopen(user.storeId, id);
  }
}
