import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './domain/audit-log.entity';
import { AUDIT_LOG_REPOSITORY } from './domain/interfaces/audit-log.repository';
import { AuditLogRepositoryImpl } from './infrastructure/repositories/audit-log.repository.impl';
import { AuditLogsService } from './application/audit-logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [
    AuditLogsService,
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: AuditLogRepositoryImpl,
    },
  ],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
