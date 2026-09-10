import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StudentService } from '../../students/application/students.service';
import { GuardianService } from '../../guardians/application/guardians.service';
import { SchoolScheduleService } from '../../school-schedules/application/school-schedules.service';
import { SchoolAssignmentsService } from '../../school-assignments/application/school-assignments.service';
import { AssignmentStatus } from '../../school-assignments/domain/enums/assignment-status.enum';
import { Student } from '../../students/domain/student.entity';
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
    private readonly scheduleService: SchoolScheduleService,
    private readonly schoolAssignmentsService: SchoolAssignmentsService,
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

  /** Students linked to the guardian account of the currently authenticated user, if any. */
  async findMyStudents(userId: string): Promise<MyStudentEntry[]> {
    const guardian = await this.guardianService.findByUserId(userId);
    if (!guardian) return [];

    const relations = await this.studentGuardianRepository.findAll({
      guardianId: guardian.id,
    });

    return Promise.all(
      relations.map(async (relation) => {
        const student = await this.studentService.findById(relation.studentId);
        const schedule = await this.scheduleService.findById(student.scheduleId);

        // At most one ACTIVE assignment per school+schedule is enforced at
        // creation time (assertNoActiveAssignmentForSlot), so [0] is safe.
        // A student can legitimately have none yet (school/schedule not
        // staffed with a driver+vehicle yet) — pickup info is omitted then.
        const [assignment] = await this.schoolAssignmentsService.findAll({
          companyId: student.companyId,
          schoolId: student.schoolId,
          scheduleId: student.scheduleId,
          status: AssignmentStatus.ACTIVE,
        });

        return {
          relation,
          student,
          scheduleName: schedule.name,
          pickupTime: assignment ? schedule.startTime : null,
          driverFirstName: assignment?.driver?.firstName ?? null,
          driverLastName: assignment?.driver?.lastName ?? null,
        };
      }),
    );
  }

  /** True when the guardian account linked to userId has an active relation to studentId. */
  async isGuardianOfStudent(userId: string, studentId: string): Promise<boolean> {
    const guardian = await this.guardianService.findByUserId(userId);
    if (!guardian) return false;

    const relation = await this.studentGuardianRepository.findByStudentAndGuardian(
      studentId,
      guardian.id,
    );
    return relation !== null;
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

export interface MyStudentEntry {
  relation: StudentGuardian;
  student: Student;
  scheduleName: string;
  /** Schedule start time (e.g. "06:35:00"), null if no active assignment yet. */
  pickupTime: string | null;
  driverFirstName: string | null;
  driverLastName: string | null;
}
