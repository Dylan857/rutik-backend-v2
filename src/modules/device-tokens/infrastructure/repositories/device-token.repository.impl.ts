import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DeviceToken } from '../../domain/device-token.entity';
import { IDeviceTokenRepository } from '../../domain/interfaces/device-token.repository';

@Injectable()
export class DeviceTokenRepositoryImpl implements IDeviceTokenRepository {
  constructor(
    @InjectRepository(DeviceToken)
    private readonly repository: Repository<DeviceToken>,
  ) {}

  async findByToken(token: string): Promise<DeviceToken | null> {
    return this.repository.findOne({ where: { token } });
  }

  async create(data: Partial<DeviceToken>): Promise<DeviceToken> {
    const deviceToken = this.repository.create(data);
    return this.repository.save(deviceToken);
  }

  async update(id: string, data: Partial<DeviceToken>): Promise<DeviceToken> {
    await this.repository.update(id, data);
    return this.repository.findOne({ where: { id } }) as Promise<DeviceToken>;
  }

  async deleteByToken(token: string): Promise<void> {
    await this.repository.delete({ token });
  }

  async deleteByTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    await this.repository.delete({ token: In(tokens) });
  }

  async findTokensByUserIds(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const rows = await this.repository.find({ where: { userId: In(userIds) } });
    return rows.map((row) => row.token);
  }
}
