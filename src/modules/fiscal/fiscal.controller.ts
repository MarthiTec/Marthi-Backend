import { Body, Controller, Get, Put, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import {
  CreateFiscalLogDto,
  ReplaceTaxTablesDto,
  UpdateIssuerSettingsDto,
} from './dto/fiscal.dto';
import { FiscalService } from './fiscal.service';

@ApiTags('fiscal')
@ApiBearerAuth()
@Controller('fiscal')
export class FiscalController {
  constructor(private readonly fiscal: FiscalService) {}

  @Get('issuer-settings')
  @ApiOperation({ summary: 'Preferências do emissor (sem senha em texto)' })
  getIssuer(@CurrentUser() user: AuthUser) {
    return this.fiscal.getIssuer(user.storeId);
  }

  @Put('issuer-settings')
  @ApiOperation({
    summary: 'Atualizar emissor. certificatePassword e cscToken são criptografados.',
  })
  putIssuer(@CurrentUser() user: AuthUser, @Body() dto: UpdateIssuerSettingsDto) {
    return this.fiscal.putIssuer(user.storeId, dto);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Logs fiscais (append-only, cap 400)' })
  listLogs(@CurrentUser() user: AuthUser) {
    return this.fiscal.listLogs(user.storeId);
  }

  @Post('logs')
  @ApiOperation({ summary: 'Registrar log fiscal' })
  appendLog(@CurrentUser() user: AuthUser, @Body() dto: CreateFiscalLogDto) {
    return this.fiscal.appendLog(user.storeId, dto);
  }

  @Get('tax-tables')
  @ApiOperation({ summary: 'Tabelas CST / cClassTrib' })
  getTaxTables(@CurrentUser() user: AuthUser) {
    return this.fiscal.getTaxTables(user.storeId);
  }

  @Put('tax-tables')
  @ApiOperation({ summary: 'Substituir tabelas CST / cClassTrib (manual)' })
  putTaxTables(@CurrentUser() user: AuthUser, @Body() dto: ReplaceTaxTablesDto) {
    return this.fiscal.putTaxTables(user.storeId, dto);
  }

  @Post('tax-tables/sync')
  @ApiOperation({
    summary: 'Stub de sync SVRS (FISCAL_TAX_SYNC=true tenta a API; default off)',
  })
  syncTaxTables(@CurrentUser() user: AuthUser) {
    return this.fiscal.syncTaxTables(user.storeId);
  }
}
