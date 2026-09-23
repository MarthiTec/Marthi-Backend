import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { PartnersModule } from './modules/partners/partners.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AttributesModule } from './modules/attributes/attributes.module';
import { StockModule } from './modules/stock/stock.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { FinanceModule } from './modules/finance/finance.module';
import { SalesModule } from './modules/sales/sales.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { StoreModule } from './modules/store/store.module';
import { MeModule } from './modules/me/me.module';
import { RegistryModule } from './modules/registry/registry.module';
import { TotemModule } from './modules/totem/totem.module';
import { FinanceBookModule } from './modules/finance-book/finance-book.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { StockInvoicesModule } from './modules/stock-invoices/stock-invoices.module';
import { CashModule } from './modules/cash/cash.module';
import { FiscalCatalogModule } from './modules/fiscal-catalog/fiscal-catalog.module';
import { FiscalModule } from './modules/fiscal/fiscal.module';
import { CrmModule } from './modules/crm/crm.module';
import { EcommerceModule } from './modules/ecommerce/ecommerce.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    HealthModule,
    PartnersModule,
    ProductsModule,
    CustomersModule,
    AttributesModule,
    StockModule,
    PricingModule,
    FinanceModule,
    SalesModule,
    WorkOrdersModule,
    StoreModule,
    MeModule,
    RegistryModule,
    TotemModule,
    FinanceBookModule,
    WarehousesModule,
    StockInvoicesModule,
    CashModule,
    FiscalCatalogModule,
    FiscalModule,
    CrmModule,
    EcommerceModule,
    AuditModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
