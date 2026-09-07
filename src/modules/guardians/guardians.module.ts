import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { UserModule } from '../user/user.module';
import { PasswordResetModule } from '../password-reset/password-reset.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Guardian } from './domain/guardian.entity';
import { GUARDIAN_REPOSITORY } from './domain/interfaces/guardian.repository';
import { GuardianRepositoryImpl } from './infrastructure/repositories/guardian.repository.impl';
import { GuardianService } from './application/guardians.service';
import { GuardianController } from './infrastructure/api/controllers/guardian.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Guardian]),
    CompanyModule,
    UserModule,
    PasswordResetModule,
    AuditLogsModule,
  ],
  controllers: [GuardianController],
  providers: [
    GuardianService,
    {
      provide: GUARDIAN_REPOSITORY,
      useClass: GuardianRepositoryImpl,
    },
  ],
  exports: [GuardianService],
})
export class GuardiansModule {}
