import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '../students/domain/student.entity';
import { School } from '../school/domain/school.entity';
import { Vehicle } from '../vehicles/domain/vehicle.entity';
import { SchoolRoute } from '../school-routes/domain/school-route.entity';
import { StudentPayment } from '../student-payments/domain/student-payment.entity';
import { FuelLogsModule } from '../fuel-logs/fuel-logs.module';
import { MaintenancesModule } from '../maintenances/maintenances.module';
import { DASHBOARD_REPOSITORY } from './domain/interfaces/dashboard.repository';
import {
  EXPENSE_CATEGORY_PROVIDERS,
  IExpenseCategoryProvider,
} from './domain/interfaces/expense-category-provider';
import { DashboardRepositoryImpl } from './infrastructure/repositories/dashboard.repository.impl';
import { FuelExpenseCategoryProvider } from './infrastructure/providers/fuel-expense-category.provider';
import { MaintenanceExpenseCategoryProvider } from './infrastructure/providers/maintenance-expense-category.provider';
import { DashboardService } from './application/dashboard.service';
import { DashboardController } from './infrastructure/api/controllers/dashboard.controller';

// Read-only and intentionally independent from every other feature module —
// it talks to the underlying entities directly through its own repository
// instead of delegating to StudentsModule/SchoolModule/etc, so it never
// creates, updates, or deletes anything. The only exception is the expense
// category providers for the profit summary, which delegate to
// FuelLogsService/MaintenancesService (and future expense modules) instead of
// querying their tables directly.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      School,
      Vehicle,
      SchoolRoute,
      StudentPayment,
    ]),
    FuelLogsModule,
    MaintenancesModule,
  ],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    {
      provide: DASHBOARD_REPOSITORY,
      useClass: DashboardRepositoryImpl,
    },
    FuelExpenseCategoryProvider,
    MaintenanceExpenseCategoryProvider,
    {
      provide: EXPENSE_CATEGORY_PROVIDERS,
      useFactory: (
        fuel: FuelExpenseCategoryProvider,
        maintenance: MaintenanceExpenseCategoryProvider,
      ): IExpenseCategoryProvider[] => [fuel, maintenance],
      inject: [FuelExpenseCategoryProvider, MaintenanceExpenseCategoryProvider],
    },
  ],
})
export class DashboardModule {}
