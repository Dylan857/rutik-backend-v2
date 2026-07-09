import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordResetService } from './application/password-reset.service';
import { VERIFICATION_CODE_REPOSITORY } from './domain/interfaces/verification-code.repository';
import { VerificationCode } from './domain/verification-code.entity';
import { PasswordResetController } from './infrastructure/api/controllers/password-reset.controller';
import { VerificationCodeRepositoryImpl } from './infrastructure/repositories/verification-code.repository.impl';
import { UserModule } from '../user/user.module';
import { MailModule } from '../../shared/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationCode]),
    UserModule,
    MailModule,
  ],
  controllers: [PasswordResetController],
  providers: [
    PasswordResetService,
    {
      provide: VERIFICATION_CODE_REPOSITORY,
      useClass: VerificationCodeRepositoryImpl,
    },
  ],
})
export class PasswordResetModule {}
