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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PosQuoteStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import {
  ConvertQuoteDto,
  CreateQuoteDto,
  UpdateQuoteDto,
  UpdateQuoteStatusDto,
} from './dto/quote.dto';
import { QuotesService } from './quotes.service';

@ApiTags('quotes')
@ApiBearerAuth()
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar orçamentos comerciais' })
  @ApiQuery({ name: 'status', required: false, enum: PosQuoteStatus })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: PosQuoteStatus,
    @Query('customerId') customerId?: string,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.quotes.listQuotes(user.storeId, {
      status,
      customerId,
      q,
      from,
      to,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter orçamento detalhado com linhas' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotes.getQuote(user.storeId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo orçamento comercial' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateQuoteDto) {
    return this.quotes.createQuote(user.storeId, dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar orçamento existente' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.quotes.updateQuote(user.storeId, id, dto, user);
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Atualizar status do orçamento' })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteStatusDto,
  ) {
    return this.quotes.updateQuoteStatus(user.storeId, id, dto, user);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicar orçamento gerando novo número' })
  duplicate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotes.duplicateQuote(user.storeId, id, user);
  }

  @Post(':id/convert')
  @ApiOperation({ summary: 'Converter orçamento em pedido de venda' })
  convert(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ConvertQuoteDto,
  ) {
    return this.quotes.convertQuote(user.storeId, id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir orçamento' })
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotes.deleteQuote(user.storeId, id);
  }
}
