import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { SchoolRoute } from './domain/school-route.entity';
import { SCHOOL_ROUTE_REPOSITORY } from './domain/interfaces/school-route.repository';
import { SchoolRouteRepositoryImpl } from './infrastructure/repositories/school-route.repository.impl';
import { SchoolRoutesService } from './application/school-routes.service';
import { SchoolRouteController } from './infrastructure/api/controllers/school-route.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolRoute]), CompanyModule],
  controllers: [SchoolRouteController],
  providers: [
    SchoolRoutesService,
    {
      provide: SCHOOL_ROUTE_REPOSITORY,
      useClass: SchoolRouteRepositoryImpl,
    },
  ],
  exports: [SchoolRoutesService],
})
export class SchoolRoutesModule {}
