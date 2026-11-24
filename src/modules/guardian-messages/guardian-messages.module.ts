import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { StudentGuardiansModule } from '../student-guardians/student-guardians.module';
import { GuardianMessage } from './domain/guardian-message.entity';
import { GUARDIAN_MESSAGE_REPOSITORY } from './domain/interfaces/guardian-message.repository';
import { GuardianMessageRepositoryImpl } from './infrastructure/repositories/guardian-message.repository.impl';
import { GuardianMessagesService } from './application/guardian-messages.service';
import { GuardianMessageController } from './infrastructure/api/controllers/guardian-message.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([GuardianMessage]),
    StudentGuardiansModule,
    NotificationsModule,
  ],
  controllers: [GuardianMessageController],
  providers: [
    GuardianMessagesService,
    {
      provide: GUARDIAN_MESSAGE_REPOSITORY,
      useClass: GuardianMessageRepositoryImpl,
    },
  ],
})
export class GuardianMessagesModule {}
