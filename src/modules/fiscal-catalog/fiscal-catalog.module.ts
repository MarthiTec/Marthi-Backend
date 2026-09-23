import { Module } from '@nestjs/common';
import {
  CfopsController,
  FecpsController,
  FiscalClassificationsController,
} from './fiscal-catalog.controller';
import { FiscalCatalogService } from './fiscal-catalog.service';

@Module({
  controllers: [
    FiscalClassificationsController,
    CfopsController,
    FecpsController,
  ],
  providers: [FiscalCatalogService],
})
export class FiscalCatalogModule {}
