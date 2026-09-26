import { Controller, Delete, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthUser } from '../auth/types/auth.types';
import { ProductsService } from './products.service';

/** Catálogo público: totem e home leem sem JWT. Excluir exige login. */
@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar produtos do catálogo (totem)' })
  list() {
    return this.productsService.list();
  }

  @Public()
  @Get(':id/images')
  @ApiOperation({ summary: 'Imagens do produto' })
  images(@Param('id') id: string) {
    return this.productsService.images(id);
  }

  @Public()
  @Get(':id/variants')
  @ApiOperation({ summary: 'Variantes do produto (estoque ou attrs)' })
  variants(@Param('id') id: string) {
    return this.productsService.variants(id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do produto' })
  findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover produto do catálogo' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.remove(user.storeId, id);
  }
}
