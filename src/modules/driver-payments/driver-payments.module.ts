import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { DriversModule } from '../drivers/drivers.module';
import { UserModule } from '../user/user.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { DriverPayment } from './domain/driver-payment.entity';
import { DRIVER_PAYMENT_REPOSITORY } from './domain/interfaces/driver-payment.repository';
import { DriverPaymentRepositoryImpl } from './infrastructure/repositories/driver-payment.repository.impl';
import { DriverPaymentsService } from './application/driver-payments.service';
import { DriverPaymentController } from './infrastructure/api/controllers/driver-payment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([DriverPayment]),
    CompanyModule,
    DriversModule,
    UserModule,
    AuditLogsModule,
  ],
  controllers: [DriverPaymentController],
  providers: [
    DriverPaymentsService,
    {
      provide: DRIVER_PAYMENT_REPOSITORY,
      useClass: DriverPaymentRepositoryImpl,
    },
  ],
  exports: [DriverPaymentsService],
})
export class DriverPaymentsModule {}
