import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '../students/domain/student.entity';
import { School } from '../school/domain/school.entity';
import { Vehicle } from '../vehicles/domain/vehicle.entity';
import { SchoolRoute } from '../school-routes/domain/school-route.entity';
import { StudentPayment } from '../student-payments/domain/student-payment.entity';
import { DASHBOARD_REPOSITORY } from './domain/interfaces/dashboard.repository';
import { DashboardRepositoryImpl } from './infrastructure/repositories/dashboard.repository.impl';
import { DashboardService } from './application/dashboard.service';
import { DashboardController } from './infrastructure/api/controllers/dashboard.controller';

// Read-only and intentionally independent from every other feature module —
// it talks to the underlying entities directly through its own repository
// instead of delegating to StudentsModule/SchoolModule/etc, so it never
// creates, updates, or deletes anything.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      School,
      Vehicle,
      SchoolRoute,
      StudentPayment,
    ]),
  ],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    {
      provide: DASHBOARD_REPOSITORY,
      useClass: DashboardRepositoryImpl,
    },
  ],
})
export class DashboardModule {}
