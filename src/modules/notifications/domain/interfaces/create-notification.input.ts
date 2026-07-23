import { NotificationType } from '../enums/notification-type.enum';
import { NotificationSeverity } from '../enums/notification-severity.enum';
import { NotificationSourceType } from '../enums/notification-source-type.enum';

export interface CreateNotificationInput {
  companyId: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  sourceType?: NotificationSourceType;
  sourceId?: string;
  // when set, create() is a no-op if a notification with this key already exists
  dedupeKey?: string;
}
