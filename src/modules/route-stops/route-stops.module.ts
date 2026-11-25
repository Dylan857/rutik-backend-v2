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
import { DailyRouteController } from './infrastructure/api/controllers/daily-route.controller';
import { DailyRoutePlan } from './domain/daily-route-plan.entity';
import { DailyRoutePlansService } from './application/daily-route-plans.service';
import { StudentAbsence } from '../student-absences/domain/student-absence.entity';

// StudentAbsence is registered here read-only (DailyRoutePlansService reads
// a date's absences directly) — importing StudentAbsencesModule instead
// would be circular, since it depends on this module to rebuild plans.
@Module({
  imports: [
    TypeOrmModule.forFeature([RouteStop, DailyRoutePlan, StudentAbsence]),
    SchoolAssignmentsModule,
    SchoolRoutesModule,
    SchoolModule,
    CompanyModule,
    HttpModule,
  ],
  controllers: [
    RouteStopController,
    RouteStopNestedController,
    DailyRouteController,
  ],
  providers: [
    RouteStopsService,
    DailyRoutePlansService,
    GoogleDirectionsService,
    {
      provide: ROUTE_STOP_REPOSITORY,
      useClass: RouteStopRepositoryImpl,
    },
  ],
  exports: [RouteStopsService, DailyRoutePlansService, GoogleDirectionsService],
})
export class RouteStopsModule {}
