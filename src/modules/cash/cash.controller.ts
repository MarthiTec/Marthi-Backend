import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import { CashService } from './cash.service';
import {
  CashDrawerDto,
  CashMoneyDto,
  CloseCashSessionDto,
  CreateExchangeDto,
  CreateStoreCreditDto,
  OpenCashSessionDto,
  ReopenCashSessionDto,
  UseStoreCreditDto,
} from './dto/cash.dto';

@ApiTags('cash')
@ApiBearerAuth()
@Controller('cash')
export class CashController {
  constructor(private readonly cash: CashService) {}

  @Get('sessions')
  @ApiOperation({ summary: 'Listar sessões de caixa' })
  listSessions(@CurrentUser() user: AuthUser) {
    return this.cash.listSessions(user.storeId);
  }

  @Get('sessions/open')
  @ApiOperation({ summary: 'Sessão aberta da loja (null se não houver)' })
  openSession(@CurrentUser() user: AuthUser) {
    return this.cash.getOpenSession(user.storeId);
  }

  @Post('sessions/open')
  @ApiOperation({ summary: 'Abrir caixa (no máximo 1 open por loja)' })
  open(@CurrentUser() user: AuthUser, @Body() dto: OpenCashSessionDto) {
    return this.cash.openSession(user.storeId, dto);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Detalhe da sessão' })
  getSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cash.getSession(user.storeId, id);
  }

  @Post('sessions/:id/aporte')
  @ApiOperation({ summary: 'Aporte / suprimento' })
  aporte(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CashMoneyDto,
  ) {
    return this.cash.aporte(user.storeId, id, dto, user.name);
  }

  @Post('sessions/:id/sangria')
  @ApiOperation({ summary: 'Sangria' })
  sangria(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CashMoneyDto,
  ) {
    return this.cash.sangria(user.storeId, id, dto, user.name);
  }

  @Post('sessions/:id/drawer')
  @ApiOperation({ summary: 'Abertura de gaveta' })
  drawer(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CashDrawerDto,
  ) {
    return this.cash.drawer(user.storeId, id, dto, user.name);
  }

  @Post('sessions/:id/close')
  @ApiOperation({ summary: 'Fechar caixa' })
  close(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CloseCashSessionDto,
  ) {
    return this.cash.close(user.storeId, id, dto);
  }

  @Post('sessions/:id/reopen')
  @ApiOperation({ summary: 'Reabrir sessão fechada' })
  reopen(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReopenCashSessionDto,
  ) {
    return this.cash.reopen(user.storeId, id, dto);
  }

  @Get('credits')
  @ApiOperation({ summary: 'Listar vales-compra' })
  listCredits(@CurrentUser() user: AuthUser) {
    return this.cash.listCredits(user.storeId);
  }

  @Post('credits')
  @ApiOperation({ summary: 'Emitir vale-compra' })
  createCredit(@CurrentUser() user: AuthUser, @Body() dto: CreateStoreCreditDto) {
    return this.cash.createCredit(user.storeId, dto, user.name);
  }

  @Post('credits/:id/use')
  @ApiOperation({ summary: 'Resgatar vale-compra' })
  useCredit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UseStoreCreditDto,
  ) {
    return this.cash.useCredit(user.storeId, id, dto, user.name);
  }

  @Get('exchanges')
  @ApiOperation({ summary: 'Listar trocas' })
  listExchanges(@CurrentUser() user: AuthUser) {
    return this.cash.listExchanges(user.storeId);
  }

  @Post('exchanges')
  @ApiOperation({ summary: 'Registrar troca (caixa ou vale)' })
  createExchange(@CurrentUser() user: AuthUser, @Body() dto: CreateExchangeDto) {
    return this.cash.createExchange(user.storeId, dto, user.name);
  }
}
