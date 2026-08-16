import { Inject, Injectable } from '@nestjs/common';
import { AuditLog } from '../domain/audit-log.entity';
import {
  AUDIT_LOG_REPOSITORY,
  CreateAuditLogInput,
  IAuditLogRepository,
} from '../domain/interfaces/audit-log.repository';

@Injectable()
export class AuditLogsService {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  record(input: CreateAuditLogInput): Promise<AuditLog> {
    return this.auditLogRepository.create(input);
  }

  getRecentActivity(companyId: string, limit: number): Promise<AuditLog[]> {
    return this.auditLogRepository.findRecentByCompany(companyId, limit);
  }
}
