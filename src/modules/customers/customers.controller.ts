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
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @ApiQuery({ name: 'q', required: false })
  @ApiOperation({ summary: 'Listar clientes da loja' })
  list(@CurrentUser() user: AuthUser, @Query('q') q?: string) {
    return this.customers.list(user.storeId, q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do cliente' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.customers.get(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar cliente' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerDto) {
    return this.customers.create(user.storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar cliente' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(user.storeId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativar cliente (soft delete)' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.customers.remove(user.storeId, id);
  }
}
