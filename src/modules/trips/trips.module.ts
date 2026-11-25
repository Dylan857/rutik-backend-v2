import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DriverAppModule } from '../driver-app/driver-app.module';
import { DriversModule } from '../drivers/drivers.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';
import { RouteStopsModule } from '../route-stops/route-stops.module';
import { SchoolAssignmentsModule } from '../school-assignments/school-assignments.module';
import { SchoolRoutesModule } from '../school-routes/school-routes.module';
import { StudentGuardiansModule } from '../student-guardians/student-guardians.module';
import { TripEtaService } from './application/trip-eta.service';
import { TripNotifier } from './application/trip-notifier';
import { TripsService } from './application/trips.service';
import { RouteTrip } from './domain/route-trip.entity';
import { TripLocation } from './domain/trip-location.entity';
import { TripStop } from './domain/trip-stop.entity';
import { DriverTripsController } from './infrastructure/api/controllers/driver-trips.controller';
import { TripsController } from './infrastructure/api/controllers/trips.controller';
import { TrackingGateway } from './infrastructure/websockets/tracking.gateway';

// Real-time route tracking. Composition-only like DriverAppModule: nothing
// imports it back, so depending on all these domains creates no cycles.
@Module({
  imports: [
    TypeOrmModule.forFeature([RouteTrip, TripStop, TripLocation]),
    AuthModule, // JwtService for the socket handshake
    DriverAppModule,
    DriversModule,
    SchoolRoutesModule,
    SchoolAssignmentsModule,
    StudentGuardiansModule,
    RouteStopsModule,
    NotificationsModule,
    PushNotificationsModule,
  ],
  controllers: [DriverTripsController, TripsController],
  providers: [TripsService, TripEtaService, TripNotifier, TrackingGateway],
})
export class TripsModule {}
