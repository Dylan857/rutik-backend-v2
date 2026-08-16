import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyService } from '../../company/application/company.service';
import { AuditLogsService } from '../../audit-logs/application/audit-logs.service';
import { AuditAction } from '../../audit-logs/domain/enums/audit-action.enum';
import { AuditEntityType } from '../../audit-logs/domain/enums/audit-entity-type.enum';
import { AuditActor } from '../../audit-logs/domain/interfaces/audit-actor.interface';
import { School } from '../domain/school.entity';
import {
  ISchoolRepository,
  SCHOOL_REPOSITORY,
} from '../domain/interfaces/school.repository';
import { CreateSchoolDto } from '../infrastructure/api/dto/create-school.dto';
import { UpdateSchoolDto } from '../infrastructure/api/dto/update-school.dto';

@Injectable()
export class SchoolService {
  constructor(
    @Inject(SCHOOL_REPOSITORY)
    private readonly schoolRepository: ISchoolRepository,
    private readonly companyService: CompanyService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateSchoolDto, actor: AuditActor): Promise<School> {
    await this.companyService.findById(dto.companyId);

    const existing = await this.schoolRepository.findByNameAndCompany(
      dto.name,
      dto.companyId,
    );
    if (existing) {
      throw new ConflictException(
        `A school named "${dto.name}" already exists in this company`,
      );
    }

    const school = await this.schoolRepository.create(dto);

    await this.auditLogsService.record({
      companyId: school.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.CREATED,
      entityType: AuditEntityType.SCHOOL,
      entityId: school.id,
      description: `Se registró el colegio ${school.name}`,
    });

    return school;
  }

  async findAll(
    companyId?: string,
  ): Promise<(School & { scheduleCount: number })[]> {
    return this.schoolRepository.findAll(companyId);
  }

  async findById(id: string): Promise<School & { scheduleCount: number }> {
    const school = await this.schoolRepository.findById(id);

    if (!school) {
      throw new NotFoundException(`School with ID "${id}" not found`);
    }

    return school;
  }

  async update(
    id: string,
    dto: UpdateSchoolDto,
    actor: AuditActor,
  ): Promise<School> {
    const current = await this.findById(id);

    if (dto.name && dto.name !== current.name) {
      const existing = await this.schoolRepository.findByNameAndCompany(
        dto.name,
        current.companyId,
      );
      if (existing) {
        throw new ConflictException(
          `A school named "${dto.name}" already exists in this company`,
        );
      }
    }

    const updated = await this.schoolRepository.update(id, dto);

    await this.auditLogsService.record({
      companyId: updated.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.UPDATED,
      entityType: AuditEntityType.SCHOOL,
      entityId: updated.id,
      description: `Se actualizó el colegio ${updated.name}`,
    });

    return updated;
  }

  async softDelete(id: string, actor: AuditActor): Promise<void> {
    const school = await this.findById(id);
    await this.schoolRepository.softDelete(id);

    await this.auditLogsService.record({
      companyId: school.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.DELETED,
      entityType: AuditEntityType.SCHOOL,
      entityId: school.id,
      description: `Se eliminó el colegio ${school.name}`,
    });
  }
}
