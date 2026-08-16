import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { FuelLog } from './domain/fuel-log.entity';
import { FUEL_LOG_REPOSITORY } from './domain/interfaces/fuel-log.repository';
import { FuelLogRepositoryImpl } from './infrastructure/repositories/fuel-log.repository.impl';
import { FuelLogsService } from './application/fuel-logs.service';
import { FuelLogController } from './infrastructure/api/controllers/fuel-log.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FuelLog]),
    VehiclesModule,
    AuditLogsModule,
  ],
  controllers: [FuelLogController],
  providers: [
    FuelLogsService,
    {
      provide: FUEL_LOG_REPOSITORY,
      useClass: FuelLogRepositoryImpl,
    },
  ],
  exports: [FuelLogsService],
})
export class FuelLogsModule {}
