import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar produtos do catálogo' })
  list() {
    return this.productsService.list();
  }

  @Get(':id/images')
  @ApiOperation({ summary: 'Imagens do produto' })
  images(@Param('id') id: string) {
    return this.productsService.images(id);
  }

  @Get(':id/variants')
  @ApiOperation({ summary: 'Variantes do produto (estoque ou attrs)' })
  variants(@Param('id') id: string) {
    return this.productsService.variants(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do produto' })
  findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }
}
