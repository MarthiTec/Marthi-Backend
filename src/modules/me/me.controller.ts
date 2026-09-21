import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import { UpdateOperatorProfileDto } from './dto/profile.dto';
import { MeService } from './me.service';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Perfil do operador logado' })
  get(@CurrentUser() user: AuthUser) {
    return this.me.getProfile(user);
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
