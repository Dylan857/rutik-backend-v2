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
import { DriverPaymentsModule } from './modules/driver-payments/driver-payments.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PasswordResetModule } from './modules/password-reset/password-reset.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import appConfig from './shared/config/app.config';
import databaseConfig from './shared/config/database.config';
import jwtConfig from './shared/config/jwt.config';
import googleMapsConfig from './shared/config/google-maps.config';
import mailConfig from './shared/config/mail.config';

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
    DriverPaymentsModule,
    DashboardModule,
    PasswordResetModule,
    NotificationsModule,
  ],
})
export class AppModule {}
