import { Module } from '@nestjs/common';
import {
  PaymentsController,
  PriceTablesController,
} from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({
  controllers: [PriceTablesController, PaymentsController],
  providers: [PricingService],
})
export class PricingModule {}
