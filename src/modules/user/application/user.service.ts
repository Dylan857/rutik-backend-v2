import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../domain/interfaces/user.repository';
import { User } from '../domain/user.entity';
import { CreateUserDto } from '../infrastructure/api/dto/create-user.dto';
import { UpdateUserDto } from '../infrastructure/api/dto/update-user.dto';
import { AuditLogsService } from '../../audit-logs/application/audit-logs.service';
import { AuditAction } from '../../audit-logs/domain/enums/audit-action.enum';
import { AuditEntityType } from '../../audit-logs/domain/enums/audit-entity-type.enum';
import { AuditActor } from '../../audit-logs/domain/interfaces/audit-actor.interface';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // actor is optional: some callers auto-provision a User as a side effect of
  // another operation with no HTTP-level actor of their own (e.g. company
  // signup creating its admin user) — those creations are still persisted,
  // just recorded without an attributed actor.
  async create(dto: CreateUserDto, actor?: AuditActor): Promise<User> {
    const [byEmail, byDocument] = await Promise.all([
      this.userRepository.findByEmail(dto.email),
      this.userRepository.findByDocument(dto.document),
    ]);

    if (byEmail) {
      throw new ConflictException(
        `A user with email "${dto.email}" already exists`,
      );
    }
    if (byDocument) {
      throw new ConflictException(
        `A user with document "${dto.document}" already exists`,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });

    await this.auditLogsService.record({
      companyId: user.companyId,
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action: AuditAction.CREATED,
      entityType: AuditEntityType.USER,
      entityId: user.id,
      description: `Se registró el usuario ${user.firstName} ${user.lastName}`,
    });

    return user;
  }

  async findAll(companyId?: string): Promise<User[]> {
    return this.userRepository.findAll(companyId);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findByDocument(document: string): Promise<User | null> {
    return this.userRepository.findByDocument(document);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor?: AuditActor,
  ): Promise<User> {
    const current = await this.findById(id);

    if (dto.email && dto.email !== current.email) {
      const existing = await this.userRepository.findByEmail(dto.email);
      if (existing) {
        throw new ConflictException(
          `A user with email "${dto.email}" already exists`,
        );
      }
    }

    if (dto.document && dto.document !== current.document) {
      const existing = await this.userRepository.findByDocument(dto.document);
      if (existing) {
        throw new ConflictException(
          `A user with document "${dto.document}" already exists`,
        );
      }
    }

    const updated = await this.userRepository.update(id, dto);

    await this.auditLogsService.record({
      companyId: updated.companyId,
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action: AuditAction.UPDATED,
      entityType: AuditEntityType.USER,
      entityId: updated.id,
      description: `Se actualizó el usuario ${updated.firstName} ${updated.lastName}`,
    });

    return updated;
  }

  async softDelete(id: string, actor?: AuditActor): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.softDelete(id);

    await this.auditLogsService.record({
      companyId: user.companyId,
      actorUserId: actor?.userId,
      actorEmail: actor?.email,
      action: AuditAction.DELETED,
      entityType: AuditEntityType.USER,
      entityId: user.id,
      description: `Se eliminó el usuario ${user.firstName} ${user.lastName}`,
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.updateLastLogin(id);
  }

  async updatePassword(id: string, plainPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
    await this.userRepository.update(id, { password: hashedPassword });
  }
}
