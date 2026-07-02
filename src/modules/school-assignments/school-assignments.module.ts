import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { DriversModule } from '../drivers/drivers.module';
import { SchoolModule } from '../school/school.module';
import { SchoolSchedulesModule } from '../school-schedules/school-schedules.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { SchoolRoutesModule } from '../school-routes/school-routes.module';
import { SchoolAssignment } from './domain/school-assignment.entity';
import { SCHOOL_ASSIGNMENT_REPOSITORY } from './domain/interfaces/school-assignment.repository';
import { SchoolAssignmentRepositoryImpl } from './infrastructure/repositories/school-assignment.repository.impl';
import { SchoolAssignmentsService } from './application/school-assignments.service';
import { SchoolAssignmentController } from './infrastructure/api/controllers/school-assignment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SchoolAssignment]),
    CompanyModule,
    SchoolModule,
    SchoolSchedulesModule,
    DriversModule,
    VehiclesModule,
    SchoolRoutesModule,
  ],
  controllers: [SchoolAssignmentController],
  providers: [
    SchoolAssignmentsService,
    {
      provide: SCHOOL_ASSIGNMENT_REPOSITORY,
      useClass: SchoolAssignmentRepositoryImpl,
    },
  ],
  exports: [SchoolAssignmentsService],
})
export class SchoolAssignmentsModule {}
