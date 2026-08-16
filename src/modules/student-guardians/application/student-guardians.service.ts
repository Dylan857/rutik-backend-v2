import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StudentService } from '../../students/application/students.service';
import { GuardianService } from '../../guardians/application/guardians.service';
import { AuditLogsService } from '../../audit-logs/application/audit-logs.service';
import { AuditAction } from '../../audit-logs/domain/enums/audit-action.enum';
import { AuditEntityType } from '../../audit-logs/domain/enums/audit-entity-type.enum';
import { AuditActor } from '../../audit-logs/domain/interfaces/audit-actor.interface';
import { StudentGuardian } from '../domain/student-guardian.entity';
import {
  IStudentGuardianRepository,
  StudentGuardianFilters,
  STUDENT_GUARDIAN_REPOSITORY,
} from '../domain/interfaces/student-guardian.repository';
import { CreateStudentGuardianDto } from '../infrastructure/api/dto/create-student-guardian.dto';
import { UpdateStudentGuardianDto } from '../infrastructure/api/dto/update-student-guardian.dto';

@Injectable()
export class StudentGuardianService {
  constructor(
    @Inject(STUDENT_GUARDIAN_REPOSITORY)
    private readonly studentGuardianRepository: IStudentGuardianRepository,
    private readonly studentService: StudentService,
    private readonly guardianService: GuardianService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    dto: CreateStudentGuardianDto,
    actor: AuditActor,
  ): Promise<StudentGuardian> {
    const student = await this.studentService.findById(dto.studentId);
    const guardian = await this.guardianService.findById(dto.guardianId);

    if (student.companyId !== guardian.companyId) {
      throw new BadRequestException(
        `Student "${dto.studentId}" and guardian "${dto.guardianId}" do not belong to the same company`,
      );
    }

    const existing =
      await this.studentGuardianRepository.findByStudentAndGuardian(
        dto.studentId,
        dto.guardianId,
      );
    if (existing) {
      throw new ConflictException(
        `A relationship between student "${dto.studentId}" and guardian "${dto.guardianId}" already exists`,
      );
    }

    if (dto.isPrimary) {
      await this.studentGuardianRepository.clearPrimaryForStudent(
        dto.studentId,
      );
    }

    const relation = await this.studentGuardianRepository.create(dto);

    await this.auditLogsService.record({
      companyId: student.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.CREATED,
      entityType: AuditEntityType.STUDENT_GUARDIAN,
      entityId: relation.id,
      description: `Se vinculó al acudiente ${guardian.firstName} ${guardian.lastName} con el estudiante ${student.firstName} ${student.lastName}`,
    });

    return relation;
  }

  async findAll(filters: StudentGuardianFilters): Promise<StudentGuardian[]> {
    return this.studentGuardianRepository.findAll(filters);
  }

  async findById(id: string): Promise<StudentGuardian> {
    const relation = await this.studentGuardianRepository.findById(id);

    if (!relation) {
      throw new NotFoundException(`StudentGuardian with ID "${id}" not found`);
    }

    return relation;
  }

  async update(
    id: string,
    dto: UpdateStudentGuardianDto,
    actor: AuditActor,
  ): Promise<StudentGuardian> {
    const current = await this.findById(id);

    if (dto.isPrimary === true) {
      // Demote any other primary guardian for this student before promoting this one.
      await this.studentGuardianRepository.clearPrimaryForStudent(
        current.studentId,
        id,
      );
    }

    const updated = await this.studentGuardianRepository.update(id, dto);
    const student = await this.studentService.findById(updated.studentId);
    const guardian = await this.guardianService.findById(updated.guardianId);

    await this.auditLogsService.record({
      companyId: student.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.UPDATED,
      entityType: AuditEntityType.STUDENT_GUARDIAN,
      entityId: updated.id,
      description: `Se actualizó el vínculo entre ${guardian.firstName} ${guardian.lastName} y el estudiante ${student.firstName} ${student.lastName}`,
    });

    return updated;
  }

  async softDelete(id: string, actor: AuditActor): Promise<void> {
    const relation = await this.findById(id);
    const student = await this.studentService.findById(relation.studentId);
    const guardian = await this.guardianService.findById(relation.guardianId);
    await this.studentGuardianRepository.softDelete(id);

    await this.auditLogsService.record({
      companyId: student.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.DELETED,
      entityType: AuditEntityType.STUDENT_GUARDIAN,
      entityId: relation.id,
      description: `Se eliminó el vínculo entre ${guardian.firstName} ${guardian.lastName} y el estudiante ${student.firstName} ${student.lastName}`,
    });
  }
}
