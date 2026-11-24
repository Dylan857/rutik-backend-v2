import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DriverService } from '../../drivers/application/drivers.service';
import { Driver } from '../../drivers/domain/driver.entity';
import { DriverStatus } from '../../drivers/domain/enums/driver-status.enum';
import { UserService } from '../../user/application/user.service';
import { NotificationsService } from './notifications.service';
import { ExpiryAlertMailer } from './expiry-alert-mailer';
import { NotificationType } from '../domain/enums/notification-type.enum';
import { NotificationSeverity } from '../domain/enums/notification-severity.enum';
import { NotificationSourceType } from '../domain/enums/notification-source-type.enum';

// Reminder cadence: once at each milestone, then every day from 10 days out
// (and every day after it expires, until the date is renewed).
const MILESTONE_DAYS = [30, 20, 15];
const DAILY_REMINDER_THRESHOLD_DAYS = 10;

// Inactive drivers aren't driving, so an expired license isn't a risk.
const SCANNED_STATUSES = new Set([DriverStatus.ACTIVE, DriverStatus.SUSPENDED]);

@Injectable()
export class DriverLicenseExpiryScanner {
  private readonly logger = new Logger(DriverLicenseExpiryScanner.name);

  constructor(
    private readonly driverService: DriverService,
    private readonly userService: UserService,
    private readonly notificationsService: NotificationsService,
    private readonly expiryAlertMailer: ExpiryAlertMailer,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async scan(): Promise<void> {
    const drivers = await this.driverService.findAll({});
    const scanned = drivers.filter((d) => SCANNED_STATUSES.has(d.status));

    for (const driver of scanned) {
      try {
        await this.checkLicense(driver);
      } catch (error) {
        this.logger.error(
          `License check failed for driver ${driver.id}: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log(`License expiry scan checked ${scanned.length} drivers`);
  }

  private async checkLicense(driver: Driver): Promise<void> {
    const diffDays = this.daysUntil(driver.licenseExpirationDate);

    const isMilestone = MILESTONE_DAYS.includes(diffDays);
    const isDailyWindow = diffDays <= DAILY_REMINDER_THRESHOLD_DAYS;
    if (!isMilestone && !isDailyWindow) return;

    const dedupeSuffix = isDailyWindow
      ? `DAILY:${this.todayStr()}`
      : `M${diffDays}`;

    const user = await this.userService.findById(driver.userId);
    const driverName = `${user.firstName} ${user.lastName}`;
    const expired = diffDays < 0;

    const title = expired
      ? 'Licencia de conducción vencida'
      : 'Licencia de conducción próxima a vencer';
    const message = expired
      ? `La licencia de conducción (${driver.licenseNumber}) del conductor ${driverName} venció hace ${Math.abs(diffDays)} día(s).`
      : diffDays === 0
        ? `La licencia de conducción (${driver.licenseNumber}) del conductor ${driverName} vence hoy.`
        : `La licencia de conducción (${driver.licenseNumber}) del conductor ${driverName} vence en ${diffDays} día(s).`;
    const severity = expired
      ? NotificationSeverity.CRITICAL
      : NotificationSeverity.WARNING;

    const created = await this.notificationsService.create({
      companyId: driver.companyId,
      type: NotificationType.DRIVER_LICENSE_EXPIRING,
      severity,
      title,
      message,
      sourceType: NotificationSourceType.DRIVER,
      sourceId: driver.id,
      dedupeKey: `${NotificationType.DRIVER_LICENSE_EXPIRING}:${driver.id}:${driver.licenseExpirationDate}:${dedupeSuffix}`,
    });

    // Only email when the notification is new — a second scan the same day
    // is deduped above and must not send a duplicate email.
    if (!created) return;

    await this.expiryAlertMailer.notifyCompanyAdmins(
      driver.companyId,
      title,
      message,
      expired,
    );
  }

  private daysUntil(dateStr: string): number {
    const target = new Date(dateStr.slice(0, 10) + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private todayStr(): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().slice(0, 10);
  }
}
