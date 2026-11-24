import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from '../../notifications/application/notifications.service';
import { NotificationSeverity } from '../../notifications/domain/enums/notification-severity.enum';
import { NotificationSourceType } from '../../notifications/domain/enums/notification-source-type.enum';
import { NotificationType } from '../../notifications/domain/enums/notification-type.enum';
import { StudentGuardianService } from '../../student-guardians/application/student-guardians.service';
import { GuardianMessage } from '../domain/guardian-message.entity';
import {
  CATEGORY_LABELS,
  GuardianMessageCategory,
  GuardianMessageStatus,
  TOPIC_LABELS,
} from '../domain/enums/guardian-message.enums';
import {
  GUARDIAN_MESSAGE_REPOSITORY,
  IGuardianMessageRepository,
} from '../domain/interfaces/guardian-message.repository';
import {
  CreateGuardianMessageDto,
  GuardianMessageResponseDto,
} from '../infrastructure/api/dto/guardian-message.dto';

const NOTIFICATION_PREVIEW_LENGTH = 140;

@Injectable()
export class GuardianMessagesService {
  constructor(
    @Inject(GUARDIAN_MESSAGE_REPOSITORY)
    private readonly messageRepository: IGuardianMessageRepository,
    private readonly studentGuardianService: StudentGuardianService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    userId: string,
    companyId: string | null,
    dto: CreateGuardianMessageDto,
  ): Promise<GuardianMessageResponseDto> {
    if (!companyId) {
      throw new BadRequestException(
        'Tu cuenta no está asociada a una empresa.',
      );
    }
    if (dto.studentId) {
      const isGuardian = await this.studentGuardianService.isGuardianOfStudent(
        userId,
        dto.studentId,
      );
      if (!isGuardian) {
        throw new ForbiddenException('No eres acudiente de este estudiante.');
      }
    }

    const message = await this.messageRepository.create({
      companyId,
      guardianUserId: userId,
      studentId: dto.studentId ?? null,
      category: dto.category,
      topic: dto.topic,
      message: dto.message,
      status: GuardianMessageStatus.OPEN,
    });

    const response = this.toResponse(message);
    const preview =
      dto.message.length > NOTIFICATION_PREVIEW_LENGTH
        ? `${dto.message.slice(0, NOTIFICATION_PREVIEW_LENGTH)}…`
        : dto.message;
    const about = response.studentName ? ` (${response.studentName})` : '';

    await this.notificationsService.create({
      companyId,
      type: NotificationType.GUARDIAN_MESSAGE_RECEIVED,
      severity:
        dto.category === GuardianMessageCategory.COMPLAINT
          ? NotificationSeverity.WARNING
          : NotificationSeverity.INFO,
      title: `Nueva ${CATEGORY_LABELS[dto.category]}: ${TOPIC_LABELS[dto.topic]}`,
      message: `${response.guardianName}${about}: ${preview}`,
      sourceType: NotificationSourceType.GUARDIAN_MESSAGE,
      sourceId: message.id,
    });

    return response;
  }

  async findMine(userId: string): Promise<GuardianMessageResponseDto[]> {
    const messages = await this.messageRepository.findAll({
      guardianUserId: userId,
    });
    return messages.map((m) => this.toResponse(m));
  }

  async findForCompany(
    companyId: string,
    status?: GuardianMessageStatus,
  ): Promise<GuardianMessageResponseDto[]> {
    const messages = await this.messageRepository.findAll({
      companyId,
      status,
    });
    return messages.map((m) => this.toResponse(m));
  }

  async resolve(
    id: string,
    actor: { userId: string; companyId: string | null; isSuperAdmin: boolean },
  ): Promise<GuardianMessageResponseDto> {
    const message = await this.messageRepository.findById(id);
    if (!message) {
      throw new NotFoundException(`Message with ID "${id}" not found`);
    }
    if (!actor.isSuperAdmin && message.companyId !== actor.companyId) {
      throw new ForbiddenException('This message belongs to another company');
    }
    if (message.status === GuardianMessageStatus.RESOLVED) {
      return this.toResponse(message);
    }

    const resolved = await this.messageRepository.update(id, {
      status: GuardianMessageStatus.RESOLVED,
      resolvedAt: new Date(),
      resolvedByUserId: actor.userId,
    });
    return this.toResponse(resolved);
  }

  private toResponse(message: GuardianMessage): GuardianMessageResponseDto {
    const guardian = message.guardianUser;
    const student = message.student;
    return {
      id: message.id,
      category: message.category,
      topic: message.topic,
      message: message.message,
      status: message.status,
      guardianName: `${guardian.firstName} ${guardian.lastName}`,
      guardianEmail: guardian.email,
      guardianPhone: guardian.phone,
      studentId: message.studentId,
      studentName: student ? `${student.firstName} ${student.lastName}` : null,
      createdAt: message.createdAt,
      resolvedAt: message.resolvedAt,
    };
  }
}
