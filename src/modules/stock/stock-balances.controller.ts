import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import {
  ApplyStockBalanceDto,
  CreateStockBalanceDto,
  UpdateStockBalanceItemsDto,
} from './dto/stock-balance.dto';
import { StockService } from './stock.service';

@ApiTags('stock-balances')
@ApiBearerAuth()
@Controller('stock/balances')
export class StockBalancesController {
  constructor(private readonly stock: StockService) {}

  @Get()
  @ApiOperation({ summary: 'Listar histórico de balanços de estoque' })
  list(@CurrentUser() user: AuthUser) {
    return this.stock.listBalances(user.storeId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Obter balanço de estoque em andamento' })
  getActive(@CurrentUser() user: AuthUser) {
    return this.stock.getActiveBalance(user.storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhe de um balanço de estoque' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.stock.getBalance(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Iniciar nova sessão de balanço de estoque' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateStockBalanceDto) {
    return this.stock.createBalance(user.storeId, dto, user);
  }

  @Put(':id/items')
  @ApiOperation({ summary: 'Salvar itens contados na sessão de balanço' })
  updateItems(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateStockBalanceItemsDto,
  ) {
    return this.stock.updateBalanceItems(user.storeId, id, dto);
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Concluir balanço e atualizar estoque físico' })
  apply(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ApplyStockBalanceDto,
  ) {
    return this.stock.applyBalance(user.storeId, id, dto, user);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar / descartar sessão de balanço' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.stock.cancelBalance(user.storeId, id);
  }
}
