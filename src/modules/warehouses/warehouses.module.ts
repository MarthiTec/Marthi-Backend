import { Module } from '@nestjs/common';
import {
  KitsController,
  LotsController,
  WarehouseMovesController,
  WarehousesController,
} from './warehouses.controller';
import { WarehousesService } from './warehouses.service';

@Module({
  controllers: [
    WarehousesController,
    LotsController,
    KitsController,
    WarehouseMovesController,
  ],
  providers: [WarehousesService],
})
export class WarehousesModule {}
