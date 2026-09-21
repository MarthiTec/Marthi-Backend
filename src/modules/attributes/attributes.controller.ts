import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth.types';
import { AttributesService } from './attributes.service';
import { CreateAttributeDto, UpdateAttributeDto } from './dto/attribute.dto';

@ApiTags('attributes')
@ApiBearerAuth()
@Controller('attributes')
export class AttributesController {
  constructor(private readonly attributes: AttributesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar atributos da loja (máx. 5)' })
  list(@CurrentUser() user: AuthUser) {
    return this.attributes.list(user.storeId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar atributo' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAttributeDto) {
    return this.attributes.create(user.storeId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar atributo' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAttributeDto,
  ) {
    return this.attributes.update(user.storeId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover atributo' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.attributes.remove(user.storeId, id);
  }
}
