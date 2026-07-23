import { Notification } from '../notification.entity';

export interface NotificationQuery {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface INotificationRepository {
  create(data: Partial<Notification>): Promise<Notification>;
  findByCompany(
    companyId: string,
    query: NotificationQuery,
  ): Promise<Notification[]>;
  countUnread(companyId: string): Promise<number>;
  findById(id: string): Promise<Notification | null>;
  markAsRead(id: string): Promise<Notification>;
  markAllAsRead(companyId: string): Promise<void>;
  existsByDedupeKey(dedupeKey: string): Promise<boolean>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
