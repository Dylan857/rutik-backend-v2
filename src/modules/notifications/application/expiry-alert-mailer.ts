import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../../../shared/mail/mail.service';
import { UserService } from '../../user/application/user.service';
import { UserRole } from '../../user/domain/enums/user-role.enum';
import { UserStatus } from '../../user/domain/enums/user-status.enum';

/**
 * Emails a document-expiry alert to every active admin of the company.
 * Called by the expiry scanners right after they create the matching in-app
 * notification, so the email follows the same cadence and dedupe.
 *
 * Never throws: a mail failure (Resend down, bad address) is logged and must
 * not stop the scan from checking the remaining vehicles/drivers.
 */
@Injectable()
export class ExpiryAlertMailer {
  private readonly logger = new Logger(ExpiryAlertMailer.name);

  constructor(
    private readonly userService: UserService,
    private readonly mailService: MailService,
  ) {}

  async notifyCompanyAdmins(
    companyId: string,
    title: string,
    message: string,
    critical: boolean,
  ): Promise<void> {
    try {
      const users = await this.userService.findAll(companyId);
      const adminEmails = users
        .filter(
          (u) => u.role === UserRole.ADMIN && u.status === UserStatus.ACTIVE,
        )
        .map((u) => u.email);

      if (adminEmails.length === 0) return;

      await this.mailService.sendExpiryAlert(
        adminEmails,
        title,
        message,
        critical,
      );
    } catch (error) {
      this.logger.error(
        `Failed to email expiry alert to admins of company ${companyId}: ${(error as Error).message}`,
      );
    }
  }
}
