import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('company-users')
  @ApiOperation({ summary: 'Usuários do sistema ativos/inativos por empresa (staff Marthi)' })
  companyUsers(@CurrentUser() user: AuthUser) {
    return this.admin.companyUsers(user);
  }
}

