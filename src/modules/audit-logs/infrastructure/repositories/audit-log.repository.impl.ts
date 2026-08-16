import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../domain/audit-log.entity';
import {
  CreateAuditLogInput,
  IAuditLogRepository,
} from '../../domain/interfaces/audit-log.repository';

@Injectable()
export class AuditLogRepositoryImpl implements IAuditLogRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const auditLog = this.repository.create(input);
    return this.repository.save(auditLog);
  }

  async findRecentByCompany(
    companyId: string,
    limit: number,
  ): Promise<AuditLog[]> {
    return this.repository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
