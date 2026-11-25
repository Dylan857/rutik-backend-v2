import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './shared/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { CompanyModule } from './modules/company/company.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { SchoolModule } from './modules/school/school.module';
import { SchoolSchedulesModule } from './modules/school-schedules/school-schedules.module';
import { StudentsModule } from './modules/students/students.module';
import { GuardiansModule } from './modules/guardians/guardians.module';
import { StudentGuardiansModule } from './modules/student-guardians/student-guardians.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { SchoolAssignmentsModule } from './modules/school-assignments/school-assignments.module';
import { SchoolRoutesModule } from './modules/school-routes/school-routes.module';
import { RouteStopsModule } from './modules/route-stops/route-stops.module';
import { StudentPaymentsModule } from './modules/student-payments/student-payments.module';
import { PaymentAccountsModule } from './modules/payment-accounts/payment-accounts.module';
import { DriverPaymentsModule } from './modules/driver-payments/driver-payments.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PasswordResetModule } from './modules/password-reset/password-reset.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FuelLogsModule } from './modules/fuel-logs/fuel-logs.module';
import { MaintenancesModule } from './modules/maintenances/maintenances.module';
import { StudentAbsencesModule } from './modules/student-absences/student-absences.module';
import { GuardianMessagesModule } from './modules/guardian-messages/guardian-messages.module';
import { ProfileModule } from './modules/profile/profile.module';
import { DriverAppModule } from './modules/driver-app/driver-app.module';
import { DeviceTokensModule } from './modules/device-tokens/device-tokens.module';
import { PushNotificationsModule } from './modules/push-notifications/push-notifications.module';
import { TripsModule } from './modules/trips/trips.module';
import appConfig from './shared/config/app.config';
import databaseConfig from './shared/config/database.config';
import jwtConfig from './shared/config/jwt.config';
import googleMapsConfig from './shared/config/google-maps.config';
import mailConfig from './shared/config/mail.config';
import cloudinaryConfig from './shared/config/cloudinary.config';
import firebaseConfig from './shared/config/firebase.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        googleMapsConfig,
        mailConfig,
        cloudinaryConfig,
        firebaseConfig,
      ],
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    HealthModule,
    CompanyModule,
    UserModule,
    AuthModule,
    SchoolModule,
    SchoolSchedulesModule,
    StudentsModule,
    GuardiansModule,
    StudentGuardiansModule,
    DriversModule,
    VehiclesModule,
    SchoolAssignmentsModule,
    SchoolRoutesModule,
    RouteStopsModule,
    StudentPaymentsModule,
    PaymentAccountsModule,
    DriverPaymentsModule,
    DashboardModule,
    PasswordResetModule,
    NotificationsModule,
    FuelLogsModule,
    MaintenancesModule,
    StudentAbsencesModule,
    GuardianMessagesModule,
    ProfileModule,
    DriverAppModule,
    DeviceTokensModule,
    PushNotificationsModule,
    TripsModule,
  ],
})
export class AppModule {}
