import { Inject, Injectable } from '@nestjs/common';
import {
  DEVICE_TOKEN_REPOSITORY,
  IDeviceTokenRepository,
} from '../domain/interfaces/device-token.repository';
import { DevicePlatform } from '../domain/enums/device-platform.enum';

@Injectable()
export class DeviceTokensService {
  constructor(
    @Inject(DEVICE_TOKEN_REPOSITORY)
    private readonly repository: IDeviceTokenRepository,
  ) {}

  /**
   * Upserts by token: a fresh install/login on the same device reassigns
   * the existing row's userId instead of accumulating duplicates.
   */
  async registerToken(
    userId: string,
    token: string,
    platform: DevicePlatform,
  ): Promise<void> {
    const existing = await this.repository.findByToken(token);
    if (existing) {
      await this.repository.update(existing.id, { userId, platform, lastUsedAt: new Date() });
      return;
    }
    await this.repository.create({ userId, token, platform, lastUsedAt: new Date() });
  }

  async removeToken(token: string): Promise<void> {
    await this.repository.deleteByToken(token);
  }

  async getTokensForUsers(userIds: string[]): Promise<string[]> {
    return this.repository.findTokensByUserIds(userIds);
  }

  async removeTokens(tokens: string[]): Promise<void> {
    await this.repository.deleteByTokens(tokens);
  }
}
