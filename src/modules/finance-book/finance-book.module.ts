import { Module } from '@nestjs/common';
import {
  AdvancesController,
  BankAccountsController,
  PayablesController,
  ReceivablesController,
  TreasuryController,
} from './finance-book.controller';
import { FinanceBookService } from './finance-book.service';

@Module({
  controllers: [
    BankAccountsController,
    PayablesController,
    ReceivablesController,
    TreasuryController,
    AdvancesController,
  ],
  providers: [FinanceBookService],
})
export class FinanceBookModule {}
