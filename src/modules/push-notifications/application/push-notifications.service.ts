import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { DeviceTokensService } from '../../device-tokens/application/device-tokens.service';
import { StudentGuardianService } from '../../student-guardians/application/student-guardians.service';
import { FirebaseMessagingService, PushPayload } from '../../../shared/firebase/firebase-messaging.service';

/**
 * Guardian-facing push notifications for the payments lifecycle
 * (comprobante enviado, factura generada, pago aprobado/rechazado).
 *
 * Deliberately separate from `NotificationsModule`, which is an
 * admin-only in-app/WebSocket feed — this module reaches a guardian's
 * phone instead. Every method swallows its own errors: a push failing to
 * send must never interrupt the payment flow that triggered it.
 */
@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);

  constructor(
    private readonly deviceTokensService: DeviceTokensService,
    @Inject(forwardRef(() => StudentGuardianService))
    private readonly studentGuardianService: StudentGuardianService,
    private readonly firebaseMessagingService: FirebaseMessagingService,
  ) {}

  async notifyUser(userId: string, payload: PushPayload): Promise<void> {
    await this.notifyUsers([userId], payload);
  }

  async notifyUsers(userIds: string[], payload: PushPayload): Promise<void> {
    try {
      const tokens = await this.deviceTokensService.getTokensForUsers(userIds);
      if (tokens.length === 0) return;

      const { invalidTokens } = await this.firebaseMessagingService.sendToTokens(tokens, payload);
      if (invalidTokens.length > 0) {
        await this.deviceTokensService.removeTokens(invalidTokens);
      }
    } catch (error) {
      this.logger.error(`Failed to notify users [${userIds.join(', ')}]: ${(error as Error).message}`);
    }
  }

  async notifyGuardiansOfStudent(studentId: string, payload: PushPayload): Promise<void> {
    try {
      const userIds = await this.studentGuardianService.findGuardianUserIdsForStudent(studentId);
      if (userIds.length === 0) return;
      await this.notifyUsers(userIds, payload);
    } catch (error) {
      this.logger.error(`Failed to notify guardians of student ${studentId}: ${(error as Error).message}`);
    }
  }
}
