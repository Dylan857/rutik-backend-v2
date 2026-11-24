import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsModule } from '../students/students.module';
import { GuardiansModule } from '../guardians/guardians.module';
import { SchoolSchedulesModule } from '../school-schedules/school-schedules.module';
import { SchoolAssignmentsModule } from '../school-assignments/school-assignments.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StudentGuardian } from './domain/student-guardian.entity';
import { STUDENT_GUARDIAN_REPOSITORY } from './domain/interfaces/student-guardian.repository';
import { StudentGuardianRepositoryImpl } from './infrastructure/repositories/student-guardian.repository.impl';
import { StudentGuardianService } from './application/student-guardians.service';
import { StudentGuardianController } from './infrastructure/api/controllers/student-guardian.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentGuardian]),
    forwardRef(() => StudentsModule),
    GuardiansModule,
    SchoolSchedulesModule,
    SchoolAssignmentsModule,
    AuditLogsModule,
  ],
  controllers: [StudentGuardianController],
  providers: [
    StudentGuardianService,
    {
      provide: STUDENT_GUARDIAN_REPOSITORY,
      useClass: StudentGuardianRepositoryImpl,
    },
  ],
  exports: [StudentGuardianService],
})
export class StudentGuardiansModule {}
