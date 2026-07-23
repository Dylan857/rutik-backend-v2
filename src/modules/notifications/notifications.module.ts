import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './domain/notification.entity';
import { NOTIFICATION_REPOSITORY } from './domain/interfaces/notification.repository';
import { NotificationRepositoryImpl } from './infrastructure/repositories/notification.repository.impl';
import { NotificationsGateway } from './infrastructure/websockets/notifications.gateway';
import { NotificationsService } from './application/notifications.service';
import { VehicleDocumentExpiryScanner } from './application/vehicle-document-expiry.scanner';
import { NotificationController } from './infrastructure/api/controllers/notification.controller';
import { AuthModule } from '../auth/auth.module';
import { VehiclesModule } from '../vehicles/vehicles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    AuthModule,
    VehiclesModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    VehicleDocumentExpiryScanner,
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: NotificationRepositoryImpl,
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
