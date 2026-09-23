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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import {
  CreateCfopDto,
  CreateFecpDto,
  CreateFiscalClassificationDto,
  UpdateCfopDto,
  UpdateFecpDto,
  UpdateFiscalClassificationDto,
} from './dto/fiscal-catalog.dto';
import { FiscalCatalogService } from './fiscal-catalog.service';

@ApiTags('fiscal-classifications')
@ApiBearerAuth()
@Controller('fiscal-classifications')
export class FiscalClassificationsController {
  constructor(private readonly catalog: FiscalCatalogService) {}

  @Get()
  @ApiQuery({ name: 'active', required: false })
  @ApiOperation({ summary: 'Listar classificações fiscais' })
  list(@CurrentUser() user: AuthUser, @Query('active') active?: string) {
    return this.catalog.listClassifications(user.storeId, active);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da classificação' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.catalog.getClassification(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar classificação fiscal' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFiscalClassificationDto,
  ) {
    return this.catalog.createClassification(user.storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar classificação fiscal' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateFiscalClassificationDto,
  ) {
    return this.catalog.updateClassification(user.storeId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativar classificação fiscal' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.catalog.removeClassification(user.storeId, id);
  }
}

@ApiTags('cfops')
@ApiBearerAuth()
@Controller('cfops')
export class CfopsController {
  constructor(private readonly catalog: FiscalCatalogService) {}

  @Get()
  @ApiQuery({ name: 'active', required: false })
  @ApiOperation({ summary: 'Listar CFOPs' })
  list(@CurrentUser() user: AuthUser, @Query('active') active?: string) {
    return this.catalog.listCfops(user.storeId, active);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do CFOP' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.catalog.getCfop(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar CFOP' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCfopDto) {
    return this.catalog.createCfop(user.storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar CFOP' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCfopDto,
  ) {
    return this.catalog.updateCfop(user.storeId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativar CFOP' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.catalog.removeCfop(user.storeId, id);
  }
}

@ApiTags('fecps')
@ApiBearerAuth()
@Controller('fecps')
export class FecpsController {
  constructor(private readonly catalog: FiscalCatalogService) {}

  @Get()
  @ApiQuery({ name: 'active', required: false })
  @ApiOperation({ summary: 'Listar regras FECP' })
  list(@CurrentUser() user: AuthUser, @Query('active') active?: string) {
    return this.catalog.listFecps(user.storeId, active);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do FECP' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.catalog.getFecp(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar FECP' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFecpDto) {
    return this.catalog.createFecp(user.storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar FECP' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateFecpDto,
  ) {
    return this.catalog.updateFecp(user.storeId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativar FECP' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.catalog.removeFecp(user.storeId, id);
  }
}
