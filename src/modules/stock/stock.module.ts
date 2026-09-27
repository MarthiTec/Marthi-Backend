import { Module } from '@nestjs/common';
import { StockBalancesController } from './stock-balances.controller';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  controllers: [StockController, StockBalancesController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
