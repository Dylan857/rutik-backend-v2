import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Maintenance } from './domain/maintenance.entity';
import { MAINTENANCE_REPOSITORY } from './domain/interfaces/maintenance.repository';
import { MaintenanceRepositoryImpl } from './infrastructure/repositories/maintenance.repository.impl';
import { MaintenancesService } from './application/maintenances.service';
import { MaintenanceController } from './infrastructure/api/controllers/maintenance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Maintenance]),
    VehiclesModule,
    AuditLogsModule,
  ],
  controllers: [MaintenanceController],
  providers: [
    MaintenancesService,
    {
      provide: MAINTENANCE_REPOSITORY,
      useClass: MaintenanceRepositoryImpl,
    },
  ],
  exports: [MaintenancesService],
})
export class MaintenancesModule {}
