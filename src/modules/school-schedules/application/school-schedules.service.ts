import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyService } from '../../company/application/company.service';
import { SchoolService } from '../../school/application/school.service';
import { AuditLogsService } from '../../audit-logs/application/audit-logs.service';
import { AuditAction } from '../../audit-logs/domain/enums/audit-action.enum';
import { AuditEntityType } from '../../audit-logs/domain/enums/audit-entity-type.enum';
import { AuditActor } from '../../audit-logs/domain/interfaces/audit-actor.interface';
import { SchoolSchedule } from '../domain/school-schedule.entity';
import {
  ISchoolScheduleRepository,
  ScheduleFilters,
  SCHOOL_SCHEDULE_REPOSITORY,
} from '../domain/interfaces/school-schedule.repository';
import { CreateSchoolScheduleDto } from '../infrastructure/api/dto/create-school-schedule.dto';
import { UpdateSchoolScheduleDto } from '../infrastructure/api/dto/update-school-schedule.dto';

@Injectable()
export class SchoolScheduleService {
  constructor(
    @Inject(SCHOOL_SCHEDULE_REPOSITORY)
    private readonly scheduleRepository: ISchoolScheduleRepository,
    private readonly companyService: CompanyService,
    private readonly schoolService: SchoolService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    dto: CreateSchoolScheduleDto,
    actor: AuditActor,
  ): Promise<SchoolSchedule> {
    await this.companyService.findById(dto.companyId);

    const school = await this.schoolService.findById(dto.schoolId);
    if (school.companyId !== dto.companyId) {
      throw new BadRequestException(
        `School with ID "${dto.schoolId}" does not belong to company with ID "${dto.companyId}"`,
      );
    }

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime must be earlier than endTime');
    }

    const existing = await this.scheduleRepository.findByNameAndSchool(
      dto.name,
      dto.schoolId,
    );
    if (existing) {
      throw new ConflictException(
        `A schedule named "${dto.name}" already exists for this school`,
      );
    }

    const schedule = await this.scheduleRepository.create(dto);

    await this.auditLogsService.record({
      companyId: schedule.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.CREATED,
      entityType: AuditEntityType.SCHOOL_SCHEDULE,
      entityId: schedule.id,
      description: `Se registró el horario ${schedule.name}`,
    });

    return schedule;
  }

  async findAll(filters: ScheduleFilters): Promise<SchoolSchedule[]> {
    return this.scheduleRepository.findAll(filters);
  }

  async findById(id: string): Promise<SchoolSchedule> {
    const schedule = await this.scheduleRepository.findById(id);

    if (!schedule) {
      throw new NotFoundException(`School schedule with ID "${id}" not found`);
    }

    return schedule;
  }

  async update(
    id: string,
    dto: UpdateSchoolScheduleDto,
    actor: AuditActor,
  ): Promise<SchoolSchedule> {
    const current = await this.findById(id);

    const effectiveStart = dto.startTime ?? current.startTime;
    const effectiveEnd = dto.endTime ?? current.endTime;
    if (effectiveStart >= effectiveEnd) {
      throw new BadRequestException('startTime must be earlier than endTime');
    }

    if (dto.name && dto.name !== current.name) {
      const existing = await this.scheduleRepository.findByNameAndSchool(
        dto.name,
        current.schoolId,
      );
      if (existing) {
        throw new ConflictException(
          `A schedule named "${dto.name}" already exists for this school`,
        );
      }
    }

    const updated = await this.scheduleRepository.update(id, dto);

    await this.auditLogsService.record({
      companyId: updated.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.UPDATED,
      entityType: AuditEntityType.SCHOOL_SCHEDULE,
      entityId: updated.id,
      description: `Se actualizó el horario ${updated.name}`,
    });

    return updated;
  }

  async softDelete(id: string, actor: AuditActor): Promise<void> {
    const schedule = await this.findById(id);
    await this.scheduleRepository.softDelete(id);

    await this.auditLogsService.record({
      companyId: schedule.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.DELETED,
      entityType: AuditEntityType.SCHOOL_SCHEDULE,
      entityId: schedule.id,
      description: `Se eliminó el horario ${schedule.name}`,
    });
  }
}
