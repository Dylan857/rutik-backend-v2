import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { StudentsModule } from '../students/students.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StudentPayment } from './domain/student-payment.entity';
import { STUDENT_PAYMENT_REPOSITORY } from './domain/interfaces/student-payment.repository';
import { StudentPaymentRepositoryImpl } from './infrastructure/repositories/student-payment.repository.impl';
import { StudentPaymentsService } from './application/student-payments.service';
import { StudentPaymentController } from './infrastructure/api/controllers/student-payment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentPayment]),
    CompanyModule,
    StudentsModule,
    NotificationsModule,
    AuditLogsModule,
  ],
  controllers: [StudentPaymentController],
  providers: [
    StudentPaymentsService,
    {
      provide: STUDENT_PAYMENT_REPOSITORY,
      useClass: StudentPaymentRepositoryImpl,
    },
  ],
  exports: [StudentPaymentsService],
})
export class StudentPaymentsModule {}
