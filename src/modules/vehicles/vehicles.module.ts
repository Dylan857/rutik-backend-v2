import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { Vehicle } from './domain/vehicle.entity';
import { VEHICLE_REPOSITORY } from './domain/interfaces/vehicle.repository';
import { VehicleRepositoryImpl } from './infrastructure/repositories/vehicle.repository.impl';
import { VehiclesService } from './application/vehicles.service';
import { VehicleController } from './infrastructure/api/controllers/vehicle.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle]), CompanyModule],
  controllers: [VehicleController],
  providers: [
    VehiclesService,
    {
      provide: VEHICLE_REPOSITORY,
      useClass: VehicleRepositoryImpl,
    },
  ],
  exports: [VehiclesService],
})
export class VehiclesModule {}
