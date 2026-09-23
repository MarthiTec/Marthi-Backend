import { Module } from '@nestjs/common';
import { StockInvoicesController } from './stock-invoices.controller';
import { StockInvoicesService } from './stock-invoices.service';

@Module({
  controllers: [StockInvoicesController],
  providers: [StockInvoicesService],
})
export class StockInvoicesModule {}
