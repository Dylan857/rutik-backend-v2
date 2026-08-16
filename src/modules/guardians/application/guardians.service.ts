import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyService } from '../../company/application/company.service';
import { UserService } from '../../user/application/user.service';
import { AuditLogsService } from '../../audit-logs/application/audit-logs.service';
import { AuditAction } from '../../audit-logs/domain/enums/audit-action.enum';
import { AuditEntityType } from '../../audit-logs/domain/enums/audit-entity-type.enum';
import { AuditActor } from '../../audit-logs/domain/interfaces/audit-actor.interface';
import { Guardian } from '../domain/guardian.entity';
import {
  GuardianFilters,
  GUARDIAN_REPOSITORY,
  IGuardianRepository,
} from '../domain/interfaces/guardian.repository';
import { CreateGuardianDto } from '../infrastructure/api/dto/create-guardian.dto';
import { UpdateGuardianDto } from '../infrastructure/api/dto/update-guardian.dto';

@Injectable()
export class GuardianService {
  constructor(
    @Inject(GUARDIAN_REPOSITORY)
    private readonly guardianRepository: IGuardianRepository,
    private readonly companyService: CompanyService,
    private readonly userService: UserService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateGuardianDto, actor: AuditActor): Promise<Guardian> {
    await this.companyService.findById(dto.companyId);

    if (dto.userId) {
      await this.validateUserLink(dto.userId, dto.companyId);
    }

    await this.assertDocumentAvailable(dto.document, dto.companyId);
    await this.assertEmailAvailable(dto.email, dto.companyId);

    const guardian = await this.guardianRepository.create(dto);

    await this.auditLogsService.record({
      companyId: guardian.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.CREATED,
      entityType: AuditEntityType.GUARDIAN,
      entityId: guardian.id,
      description: `Se registró el acudiente ${guardian.firstName} ${guardian.lastName}`,
    });

    return guardian;
  }

  async findAll(filters: GuardianFilters): Promise<Guardian[]> {
    return this.guardianRepository.findAll(filters);
  }

  async findById(id: string): Promise<Guardian> {
    const guardian = await this.guardianRepository.findById(id);

    if (!guardian) {
      throw new NotFoundException(`Guardian with ID "${id}" not found`);
    }

    return guardian;
  }

  async update(
    id: string,
    dto: UpdateGuardianDto,
    actor: AuditActor,
  ): Promise<Guardian> {
    const current = await this.findById(id);

    if (dto.userId !== undefined && dto.userId !== current.userId) {
      if (dto.userId !== null) {
        await this.validateUserLink(dto.userId, current.companyId, id);
      }
    }

    if (dto.document && dto.document !== current.document) {
      await this.assertDocumentAvailable(dto.document, current.companyId, id);
    }

    if (dto.email && dto.email !== current.email) {
      await this.assertEmailAvailable(dto.email, current.companyId, id);
    }

    const updated = await this.guardianRepository.update(id, dto);

    await this.auditLogsService.record({
      companyId: updated.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.UPDATED,
      entityType: AuditEntityType.GUARDIAN,
      entityId: updated.id,
      description: `Se actualizó el acudiente ${updated.firstName} ${updated.lastName}`,
    });

    return updated;
  }

  async softDelete(id: string, actor: AuditActor): Promise<void> {
    const guardian = await this.findById(id);
    await this.guardianRepository.softDelete(id);

    await this.auditLogsService.record({
      companyId: guardian.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.DELETED,
      entityType: AuditEntityType.GUARDIAN,
      entityId: guardian.id,
      description: `Se eliminó el acudiente ${guardian.firstName} ${guardian.lastName}`,
    });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async validateUserLink(
    userId: string,
    companyId: string,
    excludeGuardianId?: string,
  ): Promise<void> {
    const user = await this.userService.findById(userId);

    if (user.companyId !== companyId) {
      throw new BadRequestException(
        `User with ID "${userId}" does not belong to company with ID "${companyId}"`,
      );
    }

    const existing = await this.guardianRepository.findByUserId(userId);
    if (existing && existing.id !== excludeGuardianId) {
      throw new ConflictException(
        `User with ID "${userId}" is already linked to another guardian`,
      );
    }
  }

  private async assertDocumentAvailable(
    document: string,
    companyId: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.guardianRepository.findByDocumentAndCompany(
      document,
      companyId,
    );
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `A guardian with document "${document}" already exists in this company`,
      );
    }
  }

  private async assertEmailAvailable(
    email: string,
    companyId: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.guardianRepository.findByEmailAndCompany(
      email,
      companyId,
    );
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `A guardian with email "${email}" already exists in this company`,
      );
    }
  }
}
