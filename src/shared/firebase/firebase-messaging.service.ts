import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushSendResult {
  // Tokens Firebase reported as dead (uninstalled app / stale registration) —
  // the caller should stop trying to send to these.
  invalidTokens: string[];
}

const INVALID_TOKEN_ERROR_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

/**
 * Thin wrapper around the Firebase Admin SDK for sending guardian-facing
 * push notifications. Mirrors CloudinaryService's shape: one small service,
 * configured from env, exported for other modules to inject.
 *
 * Silently becomes a no-op when Firebase credentials aren't configured
 * (e.g. local dev without a Firebase project yet) — a missing/failed push
 * must never block the payment flow that triggers it.
 */
@Injectable()
export class FirebaseMessagingService {
  private readonly logger = new Logger(FirebaseMessagingService.name);
  private readonly app: admin.app.App | null;

  constructor(private readonly configService: ConfigService) {
    const projectId = this.configService.get<string>('firebase.projectId');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');
    const privateKey = this.configService.get<string>('firebase.privateKey');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase credentials not configured — push notifications are disabled.',
      );
      this.app = null;
      return;
    }

    this.app = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }

  async sendToTokens(tokens: string[], payload: PushPayload): Promise<PushSendResult> {
    if (!this.app || tokens.length === 0) {
      return { invalidTokens: [] };
    }

    try {
      const response = await this.app.messaging().sendEachForMulticast({
        tokens,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
      });

      const invalidTokens: string[] = [];
      response.responses.forEach((result, index) => {
        if (!result.success && result.error && INVALID_TOKEN_ERROR_CODES.has(result.error.code)) {
          invalidTokens.push(tokens[index]);
        }
      });

      return { invalidTokens };
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${(error as Error).message}`);
      return { invalidTokens: [] };
    }
  }
}
