import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CardapioController } from './cardapio.controller';
import { CardapioService } from './cardapio.service';

@Module({
  imports: [PrismaModule],
  controllers: [CardapioController],
  providers: [CardapioService],
  exports: [CardapioService],
})
export class CardapioModule {}
