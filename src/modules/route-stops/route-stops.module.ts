import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { SchoolAssignmentsModule } from '../school-assignments/school-assignments.module';
import { SchoolModule } from '../school/school.module';
import { SchoolRoutesModule } from '../school-routes/school-routes.module';
import { RouteStop } from './domain/route-stop.entity';
import { ROUTE_STOP_REPOSITORY } from './domain/interfaces/route-stop.repository';
import { GoogleDirectionsService } from './infrastructure/external/google-directions.service';
import { RouteStopRepositoryImpl } from './infrastructure/repositories/route-stop.repository.impl';
import { RouteStopsService } from './application/route-stops.service';
import { RouteStopController } from './infrastructure/api/controllers/route-stop.controller';
import { RouteStopNestedController } from './infrastructure/api/controllers/route-stop-nested.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RouteStop]),
    SchoolAssignmentsModule,
    SchoolRoutesModule,
    SchoolModule,
    CompanyModule,
    HttpModule,
  ],
  controllers: [RouteStopController, RouteStopNestedController],
  providers: [
    RouteStopsService,
    GoogleDirectionsService,
    {
      provide: ROUTE_STOP_REPOSITORY,
      useClass: RouteStopRepositoryImpl,
    },
  ],
  exports: [RouteStopsService],
})
export class RouteStopsModule {}
