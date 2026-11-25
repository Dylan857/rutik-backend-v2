import { forwardRef, Module } from '@nestjs/common';
import { DeviceTokensModule } from '../device-tokens/device-tokens.module';
import { StudentGuardiansModule } from '../student-guardians/student-guardians.module';
import { FirebaseModule } from '../../shared/firebase/firebase.module';
import { PushNotificationsService } from './application/push-notifications.service';

@Module({
  imports: [DeviceTokensModule, forwardRef(() => StudentGuardiansModule), FirebaseModule],
  providers: [PushNotificationsService],
  exports: [PushNotificationsService],
})
export class PushNotificationsModule {}
