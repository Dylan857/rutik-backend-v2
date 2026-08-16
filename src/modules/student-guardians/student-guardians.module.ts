import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsModule } from '../students/students.module';
import { GuardiansModule } from '../guardians/guardians.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StudentGuardian } from './domain/student-guardian.entity';
import { STUDENT_GUARDIAN_REPOSITORY } from './domain/interfaces/student-guardian.repository';
import { StudentGuardianRepositoryImpl } from './infrastructure/repositories/student-guardian.repository.impl';
import { StudentGuardianService } from './application/student-guardians.service';
import { StudentGuardianController } from './infrastructure/api/controllers/student-guardian.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentGuardian]),
    StudentsModule,
    GuardiansModule,
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
