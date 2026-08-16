import { AuditLog } from '../audit-log.entity';
import { AuditAction } from '../enums/audit-action.enum';
import { AuditEntityType } from '../enums/audit-entity-type.enum';

export interface CreateAuditLogInput {
  companyId: string | null;
  actorUserId?: string;
  actorEmail?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  description: string;
}

export interface IAuditLogRepository {
  create(input: CreateAuditLogInput): Promise<AuditLog>;
  findRecentByCompany(companyId: string, limit: number): Promise<AuditLog[]>;
}

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');
