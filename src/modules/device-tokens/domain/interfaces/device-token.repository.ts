import { DeviceToken } from '../device-token.entity';

export interface IDeviceTokenRepository {
  findByToken(token: string): Promise<DeviceToken | null>;
  create(data: Partial<DeviceToken>): Promise<DeviceToken>;
  update(id: string, data: Partial<DeviceToken>): Promise<DeviceToken>;
  deleteByToken(token: string): Promise<void>;
  deleteByTokens(tokens: string[]): Promise<void>;
  findTokensByUserIds(userIds: string[]): Promise<string[]>;
}

export const DEVICE_TOKEN_REPOSITORY = Symbol('DEVICE_TOKEN_REPOSITORY');
