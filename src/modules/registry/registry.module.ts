import { Module } from '@nestjs/common';
import {
  EmployeesController,
  SellersController,
  SuppliersController,
} from './registry.controller';
import { RegistryService } from './registry.service';

@Module({
  controllers: [SellersController, SuppliersController, EmployeesController],
  providers: [RegistryService],
  exports: [RegistryService],
})
export class RegistryModule {}
