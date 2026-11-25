import { Module } from '@nestjs/common';
import { CompanyModule } from '../company/company.module';
import { DriverPaymentsModule } from '../driver-payments/driver-payments.module';
import { DriversModule } from '../drivers/drivers.module';
import { GuardiansModule } from '../guardians/guardians.module';
import { RouteStopsModule } from '../route-stops/route-stops.module';
import { SchoolAssignmentsModule } from '../school-assignments/school-assignments.module';
import { SchoolRoutesModule } from '../school-routes/school-routes.module';
import { SchoolSchedulesModule } from '../school-schedules/school-schedules.module';
import { SchoolModule } from '../school/school.module';
import { StudentGuardiansModule } from '../student-guardians/student-guardians.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { DriverAppService } from './application/driver-app.service';
import { DriverAppController } from './infrastructure/api/controllers/driver-app.controller';

// Composition-only module for the drivers' app — nothing imports it back, so
// pulling in all these domains creates no cycles.
@Module({
  imports: [
    DriversModule,
    SchoolAssignmentsModule,
    SchoolRoutesModule,
    RouteStopsModule,
    SchoolModule,
    SchoolSchedulesModule,
    CompanyModule,
    StudentGuardiansModule,
    GuardiansModule,
    VehiclesModule,
    DriverPaymentsModule,
  ],
  controllers: [DriverAppController],
  providers: [DriverAppService],
})
export class DriverAppModule {}
