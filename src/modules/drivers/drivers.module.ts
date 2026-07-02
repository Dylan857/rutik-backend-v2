import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { UserModule } from '../user/user.module';
import { Driver } from './domain/driver.entity';
import { DRIVER_REPOSITORY } from './domain/interfaces/driver.repository';
import { DriverRepositoryImpl } from './infrastructure/repositories/driver.repository.impl';
import { DriverService } from './application/drivers.service';
import { DriverController } from './infrastructure/api/controllers/driver.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Driver]), CompanyModule, UserModule],
  controllers: [DriverController],
  providers: [
    DriverService,
    {
      provide: DRIVER_REPOSITORY,
      useClass: DriverRepositoryImpl,
    },
  ],
  exports: [DriverService],
})
export class DriversModule {}
