import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { SchoolModule } from '../school/school.module';
import { SchoolSchedulesModule } from '../school-schedules/school-schedules.module';
import { RouteStopsModule } from '../route-stops/route-stops.module';
import { StudentPaymentsModule } from '../student-payments/student-payments.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Student } from './domain/student.entity';
import { STUDENT_REPOSITORY } from './domain/interfaces/student.repository';
import { StudentRepositoryImpl } from './infrastructure/repositories/student.repository.impl';
import { StudentService } from './application/students.service';
import { StudentController } from './infrastructure/api/controllers/student.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Student]),
    CompanyModule,
    SchoolModule,
    SchoolSchedulesModule,
    RouteStopsModule,
    forwardRef(() => StudentPaymentsModule),
    AuditLogsModule,
  ],
  controllers: [StudentController],
  providers: [
    StudentService,
    {
      provide: STUDENT_REPOSITORY,
      useClass: StudentRepositoryImpl,
    },
  ],
  exports: [StudentService],
})
export class StudentsModule {}
