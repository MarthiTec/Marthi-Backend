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
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
