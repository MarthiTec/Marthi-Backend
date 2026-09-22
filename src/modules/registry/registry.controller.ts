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
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { CreateSellerDto, UpdateSellerDto } from './dto/seller.dto';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { RegistryService } from './registry.service';

@ApiTags('sellers')
@ApiBearerAuth()
@Controller('sellers')
export class SellersController {
  constructor(private readonly registry: RegistryService) {}

  @Get()
  @ApiQuery({ name: 'active', required: false })
  @ApiOperation({ summary: 'Listar vendedores' })
  list(@CurrentUser() user: AuthUser, @Query('active') active?: string) {
    return this.registry.listSellers(user.storeId, active);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do vendedor' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.registry.getSeller(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar vendedor' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSellerDto) {
    return this.registry.createSeller(user.storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar vendedor' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSellerDto,
  ) {
    return this.registry.updateSeller(user.storeId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativar vendedor' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.registry.removeSeller(user.storeId, id);
  }
}

@ApiTags('suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly registry: RegistryService) {}

  @Get()
  @ApiQuery({ name: 'active', required: false })
  @ApiOperation({ summary: 'Listar fornecedores' })
  list(@CurrentUser() user: AuthUser, @Query('active') active?: string) {
    return this.registry.listSuppliers(user.storeId, active);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do fornecedor' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.registry.getSupplier(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar fornecedor' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSupplierDto) {
    return this.registry.createSupplier(user.storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar fornecedor' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.registry.updateSupplier(user.storeId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativar fornecedor' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.registry.removeSupplier(user.storeId, id);
  }
}

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly registry: RegistryService) {}

  @Get()
  @ApiQuery({ name: 'active', required: false })
  @ApiOperation({ summary: 'Listar funcionários' })
  list(@CurrentUser() user: AuthUser, @Query('active') active?: string) {
    return this.registry.listEmployees(user.storeId, active);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do funcionário' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.registry.getEmployee(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar funcionário' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEmployeeDto) {
    return this.registry.createEmployee(user.storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar funcionário' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.registry.updateEmployee(user.storeId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativar funcionário' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.registry.removeEmployee(user.storeId, id);
  }
}
