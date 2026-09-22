import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import { RegistryService } from '../registry/registry.service';
import { UpdateOperatorProfileDto } from './dto/profile.dto';
import { MeService } from './me.service';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(
    private readonly me: MeService,
    private readonly registry: RegistryService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Perfil do operador logado' })
  get(@CurrentUser() user: AuthUser) {
    return this.me.getProfile(user);
  }

  @Get('access')
  @ApiOperation({ summary: 'ACL do operador (Employee.userEmail)' })
  access(@CurrentUser() user: AuthUser) {
    return this.registry.getAccess(user);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Atualizar perfil do operador' })
  update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateOperatorProfileDto,
  ) {
    return this.me.updateProfile(user, dto);
  }
}
