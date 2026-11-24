import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RouteStopsModule } from '../route-stops/route-stops.module';
import { SchoolSchedulesModule } from '../school-schedules/school-schedules.module';
import { StudentGuardiansModule } from '../student-guardians/student-guardians.module';
import { StudentsModule } from '../students/students.module';
import { UserModule } from '../user/user.module';
import { StudentAbsence } from './domain/student-absence.entity';
import { STUDENT_ABSENCE_REPOSITORY } from './domain/interfaces/student-absence.repository';
import { StudentAbsenceRepositoryImpl } from './infrastructure/repositories/student-absence.repository.impl';
import { StudentAbsencesService } from './application/student-absences.service';
import { StudentAbsenceController } from './infrastructure/api/controllers/student-absence.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentAbsence]),
    StudentsModule,
    StudentGuardiansModule,
    SchoolSchedulesModule,
    CompanyModule,
    RouteStopsModule,
    NotificationsModule,
    UserModule,
  ],
  controllers: [StudentAbsenceController],
  providers: [
    StudentAbsencesService,
    {
      provide: STUDENT_ABSENCE_REPOSITORY,
      useClass: StudentAbsenceRepositoryImpl,
    },
  ],
})
export class StudentAbsencesModule {}
