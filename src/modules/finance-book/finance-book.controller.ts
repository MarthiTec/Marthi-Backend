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
import { BillStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import {
  ApplyAdvanceDto,
  CreateAdvanceDto,
  CreateBankAccountDto,
  CreatePayableDto,
  CreateReceivableDto,
  CreateTreasuryDto,
  SettleBillDto,
  UpdateBankAccountDto,
  UpdatePayableDto,
  UpdateReceivableDto,
} from './dto/finance-book.dto';
import { FinanceBookService } from './finance-book.service';

@ApiTags('bank-accounts')
@ApiBearerAuth()
@Controller('bank-accounts')
export class BankAccountsController {
  constructor(private readonly book: FinanceBookService) {}

  @Get()
  @ApiQuery({ name: 'active', required: false })
  @ApiOperation({ summary: 'Listar contas bancárias (saldo derivado)' })
  list(@CurrentUser() user: AuthUser, @Query('active') active?: string) {
    return this.book.listAccounts(user.storeId, active);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da conta bancária' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.book.getAccount(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar conta bancária' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBankAccountDto) {
    return this.book.createAccount(user.storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar conta bancária' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBankAccountDto,
  ) {
    return this.book.updateAccount(user.storeId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativar conta bancária' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.book.removeAccount(user.storeId, id);
  }
}

@ApiTags('payables')
@ApiBearerAuth()
@Controller('payables')
export class PayablesController {
  constructor(private readonly book: FinanceBookService) {}

  @Get()
  @ApiQuery({ name: 'status', required: false, enum: BillStatus })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOperation({ summary: 'Listar contas a pagar' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: BillStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.book.listPayables(user.storeId, { status, from, to });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da conta a pagar' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.book.getPayable(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar conta a pagar' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePayableDto) {
    return this.book.createPayable(user.storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar conta a pagar (só se aberta/parcial)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePayableDto,
  ) {
    return this.book.updatePayable(user.storeId, id, dto);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Baixar pagamento (parcial ou total)' })
  pay(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SettleBillDto,
  ) {
    return this.book.payPayable(user.storeId, id, dto);
  }
}

@ApiTags('receivables')
@ApiBearerAuth()
@Controller('receivables')
export class ReceivablesController {
  constructor(private readonly book: FinanceBookService) {}

  @Get()
  @ApiQuery({ name: 'status', required: false, enum: BillStatus })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOperation({ summary: 'Listar contas a receber' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: BillStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.book.listReceivables(user.storeId, { status, from, to });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da conta a receber' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.book.getReceivable(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar conta a receber' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReceivableDto) {
    return this.book.createReceivable(user.storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar conta a receber (só se aberta/parcial)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateReceivableDto,
  ) {
    return this.book.updateReceivable(user.storeId, id, dto);
  }

  @Post(':id/receive')
  @ApiOperation({ summary: 'Baixar recebimento (parcial ou total)' })
  receive(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SettleBillDto,
  ) {
    return this.book.receiveReceivable(user.storeId, id, dto);
  }
}

@ApiTags('treasury')
@ApiBearerAuth()
@Controller('treasury')
export class TreasuryController {
  constructor(private readonly book: FinanceBookService) {}

  @Get()
  @ApiOperation({ summary: 'Listar movimentos de tesouraria' })
  list(@CurrentUser() user: AuthUser) {
    return this.book.listTreasury(user.storeId);
  }

  @Post()
  @ApiOperation({ summary: 'Lançar movimento (saldo derivado, sem coluna de saldo)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTreasuryDto) {
    return this.book.createTreasury(user.storeId, dto);
  }
}

@ApiTags('advances')
@ApiBearerAuth()
@Controller('advances')
export class AdvancesController {
  constructor(private readonly book: FinanceBookService) {}

  @Get()
  @ApiOperation({ summary: 'Listar adiantamentos' })
  list(@CurrentUser() user: AuthUser) {
    return this.book.listAdvances(user.storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do adiantamento' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.book.getAdvance(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar adiantamento' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAdvanceDto) {
    return this.book.createAdvance(user.storeId, dto);
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Aplicar adiantamento' })
  apply(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ApplyAdvanceDto,
  ) {
    return this.book.applyAdvance(user.storeId, id, dto);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Estornar adiantamento (só se não aplicado)' })
  refund(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.book.refundAdvance(user.storeId, id);
  }
}
