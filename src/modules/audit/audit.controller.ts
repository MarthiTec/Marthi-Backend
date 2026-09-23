import { Body, Controller, Get, ParseEnumPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuditKind } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import { AuditService } from './audit.service';
import { CreateAuditDto } from './dto/audit.dto';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiQuery({ name: 'kind', required: false, enum: AuditKind })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiOperation({ summary: 'Listar auditoria (cap 400 mais recentes)' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('kind', new ParseEnumPipe(AuditKind, { optional: true }))
    kind?: AuditKind,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
  ) {
    return this.audit.list(user.storeId, { kind, from, to, q });
  }

  @Post()
  @ApiOperation({ summary: 'Registrar evento de auditoria (login, ação, etc.)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAuditDto) {
    return this.audit.create(user, dto);
  }
}
