import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { User } from '../../user/domain/user.entity';
import { DevicePlatform } from './enums/device-platform.enum';

// One row per installed app instance. `token` is unique — a device that
// reinstalls or logs in as a different user reassigns the same row's
// userId rather than accumulating duplicates.
@Entity('device_tokens')
export class DeviceToken extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 500, unique: true })
  token: string;

  @Column({ type: 'enum', enum: DevicePlatform })
  platform: DevicePlatform;

  @Column({ name: 'last_used_at', type: 'timestamptz' })
  lastUsedAt: Date;
}
