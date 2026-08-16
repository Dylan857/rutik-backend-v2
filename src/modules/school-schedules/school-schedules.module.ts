import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { SchoolModule } from '../school/school.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { SchoolSchedule } from './domain/school-schedule.entity';
import { SCHOOL_SCHEDULE_REPOSITORY } from './domain/interfaces/school-schedule.repository';
import { SchoolScheduleRepositoryImpl } from './infrastructure/repositories/school-schedule.repository.impl';
import { SchoolScheduleService } from './application/school-schedules.service';
import { SchoolScheduleController } from './infrastructure/api/controllers/school-schedule.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SchoolSchedule]),
    CompanyModule,
    SchoolModule,
    AuditLogsModule,
  ],
  controllers: [SchoolScheduleController],
  providers: [
    SchoolScheduleService,
    {
      provide: SCHOOL_SCHEDULE_REPOSITORY,
      useClass: SchoolScheduleRepositoryImpl,
    },
  ],
  exports: [SchoolScheduleService],
})
export class SchoolSchedulesModule {}
