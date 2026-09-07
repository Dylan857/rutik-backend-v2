import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PaymentAccount } from './domain/payment-account.entity';
import { PAYMENT_ACCOUNT_REPOSITORY } from './domain/interfaces/payment-account.repository';
import { PaymentAccountRepositoryImpl } from './infrastructure/repositories/payment-account.repository.impl';
import { PaymentAccountsService } from './application/payment-accounts.service';
import { PaymentAccountController } from './infrastructure/api/controllers/payment-account.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentAccount]), CompanyModule, AuditLogsModule],
  controllers: [PaymentAccountController],
  providers: [
    PaymentAccountsService,
    {
      provide: PAYMENT_ACCOUNT_REPOSITORY,
      useClass: PaymentAccountRepositoryImpl,
    },
  ],
  exports: [PaymentAccountsService],
})
export class PaymentAccountsModule {}
