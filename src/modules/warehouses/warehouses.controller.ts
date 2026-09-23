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
  CreateKitDto,
  CreateLotDto,
  CreateWarehouseDto,
  CreateWarehouseMoveDto,
  UpdateKitDto,
  UpdateLotDto,
  UpdateWarehouseDto,
} from './dto/warehouse.dto';
import { WarehousesService } from './warehouses.service';

@ApiTags('warehouses')
@ApiBearerAuth()
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehouses: WarehousesService) {}

  @Get()
  @ApiQuery({ name: 'active', required: false })
  @ApiOperation({ summary: 'Listar almoxarifados' })
  list(@CurrentUser() user: AuthUser, @Query('active') active?: string) {
    return this.warehouses.listWarehouses(user.storeId, active);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do almoxarifado' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.warehouses.getWarehouse(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar almoxarifado' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWarehouseDto) {
    return this.warehouses.createWarehouse(user.storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar almoxarifado' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.warehouses.updateWarehouse(user.storeId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativar almoxarifado' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.warehouses.removeWarehouse(user.storeId, id);
  }
}

@ApiTags('lots')
@ApiBearerAuth()
@Controller('lots')
export class LotsController {
  constructor(private readonly warehouses: WarehousesService) {}

  @Get()
  @ApiQuery({ name: 'stockId', required: false })
  @ApiOperation({ summary: 'Listar lotes' })
  list(@CurrentUser() user: AuthUser, @Query('stockId') stockId?: string) {
    return this.warehouses.listLots(user.storeId, stockId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar lote' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLotDto) {
    return this.warehouses.createLot(user.storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar quantidade do lote' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateLotDto,
  ) {
    return this.warehouses.updateLotQty(user.storeId, id, dto);
  }
}

@ApiTags('kits')
@ApiBearerAuth()
@Controller('kits')
export class KitsController {
  constructor(private readonly warehouses: WarehousesService) {}

  @Get()
  @ApiQuery({ name: 'active', required: false })
  @ApiOperation({ summary: 'Listar kits' })
  list(@CurrentUser() user: AuthUser, @Query('active') active?: string) {
    return this.warehouses.listKits(user.storeId, active);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do kit' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.warehouses.getKit(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar kit com itens' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateKitDto) {
    return this.warehouses.createKit(user.storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar kit e itens' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateKitDto,
  ) {
    return this.warehouses.updateKit(user.storeId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativar kit' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.warehouses.removeKit(user.storeId, id);
  }
}

@ApiTags('warehouse-moves')
@ApiBearerAuth()
@Controller('warehouse-moves')
export class WarehouseMovesController {
  constructor(private readonly warehouses: WarehousesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar movimentações de almoxarifado' })
  list(@CurrentUser() user: AuthUser) {
    return this.warehouses.listMoves(user.storeId);
  }

  @Post()
  @ApiOperation({ summary: 'Lançar movimentação (ajusta estoque/lote)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWarehouseMoveDto) {
    return this.warehouses.createMove(user.storeId, dto, user.name);
  }
}
