import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { CashModule } from '../cash/cash.module';
import { OrdersController, PosController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [CustomersModule, CashModule],
  controllers: [OrdersController, PosController],
  providers: [SalesService],
})
export class SalesModule {}
