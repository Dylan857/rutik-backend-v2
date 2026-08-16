import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { FuelLog } from '../fuel-logs/domain/fuel-log.entity';
import { SchoolRoute } from '../school-routes/domain/school-route.entity';
import { RouteStop } from '../route-stops/domain/route-stop.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Vehicle } from './domain/vehicle.entity';
import { VEHICLE_REPOSITORY } from './domain/interfaces/vehicle.repository';
import { VEHICLE_DETAIL_REPOSITORY } from './domain/interfaces/vehicle-detail.repository';
import { VehicleRepositoryImpl } from './infrastructure/repositories/vehicle.repository.impl';
import { VehicleDetailRepositoryImpl } from './infrastructure/repositories/vehicle-detail.repository.impl';
import { VehiclesService } from './application/vehicles.service';
import { VehicleDetailService } from './application/vehicle-detail.service';
import { VehicleController } from './infrastructure/api/controllers/vehicle.controller';

// FuelLog/SchoolRoute/RouteStop are registered here read-only, the same way
// DashboardModule reaches into other modules' entities directly — it lets
// VehicleDetailService compose one aggregate response without VehiclesModule
// importing FuelLogsModule/SchoolRoutesModule/RouteStopsModule, which would
// create a circular module dependency (those modules already depend on
// VehiclesModule).
@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, FuelLog, SchoolRoute, RouteStop]),
    CompanyModule,
    AuditLogsModule,
  ],
  controllers: [VehicleController],
  providers: [
    VehiclesService,
    VehicleDetailService,
    {
      provide: VEHICLE_REPOSITORY,
      useClass: VehicleRepositoryImpl,
    },
    {
      provide: VEHICLE_DETAIL_REPOSITORY,
      useClass: VehicleDetailRepositoryImpl,
    },
  ],
  exports: [VehiclesService],
})
export class VehiclesModule {}
