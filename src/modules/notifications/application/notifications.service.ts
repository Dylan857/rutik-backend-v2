import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Notification } from '../domain/notification.entity';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
  NotificationQuery,
} from '../domain/interfaces/notification.repository';
import { CreateNotificationInput } from '../domain/interfaces/create-notification.input';
import { NotificationsGateway } from '../infrastructure/websockets/notifications.gateway';
import { NotificationResponseDto } from '../infrastructure/api/dto/notification-response.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(input: CreateNotificationInput): Promise<Notification | null> {
    if (input.dedupeKey) {
      const exists = await this.notificationRepository.existsByDedupeKey(
        input.dedupeKey,
      );
      if (exists) return null;
    }

    const notification = await this.notificationRepository.create(input);

    this.gateway.emitToCompany(
      notification.companyId,
      plainToInstance(NotificationResponseDto, notification, {
        excludeExtraneousValues: true,
      }),
    );

    return notification;
  }

  async findForCompany(
    companyId: string,
    query: NotificationQuery,
  ): Promise<Notification[]> {
    return this.notificationRepository.findByCompany(companyId, query);
  }

  async getUnreadCount(companyId: string): Promise<number> {
    return this.notificationRepository.countUnread(companyId);
  }

  async markAsRead(id: string, companyId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification || notification.companyId !== companyId) {
      throw new NotFoundException('Notification not found');
    }
    return this.notificationRepository.markAsRead(id);
  }

  async markAllAsRead(companyId: string): Promise<void> {
    await this.notificationRepository.markAllAsRead(companyId);
  }
}
