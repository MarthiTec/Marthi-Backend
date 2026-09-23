import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CrmStage } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import { CrmService } from './crm.service';
import {
  ClaimCrmLeadDto,
  CreateCrmActivityDto,
  CreateCrmLeadDto,
  CreateCrmLeadMessageDto,
  CreateSellerMessageDto,
  MoveCrmLeadDto,
  UpdateCrmLeadDto,
  UpdateCrmProfileDto,
} from './dto/crm.dto';

@ApiTags('crm')
@ApiBearerAuth()
@Controller('crm')
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get('leads')
  @ApiQuery({ name: 'stage', required: false, enum: CrmStage })
  @ApiOperation({ summary: 'Listar leads do kanban' })
  listLeads(@CurrentUser() user: AuthUser, @Query('stage') stage?: CrmStage) {
    return this.crm.listLeads(user.storeId, stage);
  }

  @Post('leads')
  @ApiOperation({ summary: 'Criar lead' })
  createLead(@CurrentUser() user: AuthUser, @Body() dto: CreateCrmLeadDto) {
    return this.crm.createLead(user.storeId, dto);
  }

  @Get('messages/sellers')
  @ApiQuery({ name: 'sellerA', required: true })
  @ApiQuery({ name: 'sellerB', required: true })
  @ApiOperation({ summary: 'Chat entre vendedores' })
  listSellerMessages(
    @CurrentUser() user: AuthUser,
    @Query('sellerA') sellerA?: string,
    @Query('sellerB') sellerB?: string,
  ) {
    return this.crm.listSellerMessages(user.storeId, sellerA, sellerB);
  }

  @Post('messages/sellers')
  @ApiOperation({ summary: 'Enviar mensagem entre vendedores' })
  sendSellerMessage(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSellerMessageDto,
  ) {
    return this.crm.sendSellerMessage(user.storeId, dto);
  }

  @Get('profiles/:sellerId')
  @ApiOperation({ summary: 'Perfil social do vendedor' })
  getProfile(@CurrentUser() user: AuthUser, @Param('sellerId') sellerId: string) {
    return this.crm.getProfile(user.storeId, sellerId);
  }

  @Put('profiles/:sellerId')
  @ApiOperation({ summary: 'Atualizar perfil social do vendedor' })
  putProfile(
    @CurrentUser() user: AuthUser,
    @Param('sellerId') sellerId: string,
    @Body() dto: UpdateCrmProfileDto,
  ) {
    return this.crm.putProfile(user.storeId, sellerId, dto);
  }

  @Get('leads/:id')
  @ApiOperation({ summary: 'Detalhe do lead' })
  getLead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.crm.getLead(user.storeId, id);
  }

  @Patch('leads/:id')
  @ApiOperation({ summary: 'Atualizar detalhes do lead' })
  updateLead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCrmLeadDto,
  ) {
    return this.crm.updateLead(user.storeId, id, dto);
  }

  @Post('leads/:id/claim')
  @ApiOperation({ summary: 'Puxar lead (exclusivo)' })
  claim(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ClaimCrmLeadDto,
  ) {
    return this.crm.claimLead(user.storeId, id, dto);
  }

  @Post('leads/:id/move')
  @ApiOperation({ summary: 'Mover lead no funil' })
  move(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: MoveCrmLeadDto,
  ) {
    return this.crm.moveLead(user.storeId, id, dto);
  }

  @Get('leads/:id/activities')
  @ApiOperation({ summary: 'Atividades do lead' })
  listActivities(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.crm.listActivities(user.storeId, id);
  }

  @Post('leads/:id/activities')
  @ApiOperation({ summary: 'Registrar atividade' })
  addActivity(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateCrmActivityDto,
  ) {
    return this.crm.addActivity(user.storeId, id, dto);
  }

  @Get('leads/:id/messages')
  @ApiOperation({ summary: 'Chat do lead' })
  listLeadMessages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.crm.listLeadMessages(user.storeId, id);
  }

  @Post('leads/:id/messages')
  @ApiOperation({ summary: 'Enviar mensagem no lead' })
  sendLeadMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateCrmLeadMessageDto,
  ) {
    return this.crm.sendLeadMessage(user.storeId, id, dto);
  }
}
