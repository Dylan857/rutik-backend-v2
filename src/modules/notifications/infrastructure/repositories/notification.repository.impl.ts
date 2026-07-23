import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../domain/notification.entity';
import {
  INotificationRepository,
  NotificationQuery,
} from '../../domain/interfaces/notification.repository';

@Injectable()
export class NotificationRepositoryImpl implements INotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
  ) {}

  async create(data: Partial<Notification>): Promise<Notification> {
    const notification = this.repository.create(data);
    return this.repository.save(notification);
  }

  async findByCompany(
    companyId: string,
    query: NotificationQuery,
  ): Promise<Notification[]> {
    return this.repository.find({
      where: {
        companyId,
        ...(query.unreadOnly ? { isRead: false } : {}),
      },
      order: { createdAt: 'DESC' },
      take: query.limit,
      skip: query.offset,
    });
  }

  async countUnread(companyId: string): Promise<number> {
    return this.repository.count({ where: { companyId, isRead: false } });
  }

  async findById(id: string): Promise<Notification | null> {
    return this.repository.findOne({ where: { id } });
  }

  async markAsRead(id: string): Promise<Notification> {
    await this.repository.update(id, { isRead: true, readAt: new Date() });
    return this.findById(id) as Promise<Notification>;
  }

  async markAllAsRead(companyId: string): Promise<void> {
    await this.repository.update(
      { companyId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async existsByDedupeKey(dedupeKey: string): Promise<boolean> {
    const count = await this.repository.count({ where: { dedupeKey } });
    return count > 0;
  }
}
