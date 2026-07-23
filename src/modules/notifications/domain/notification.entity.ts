import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { Company } from '../../company/domain/company.entity';
import { NotificationType } from './enums/notification-type.enum';
import { NotificationSeverity } from './enums/notification-severity.enum';
import { NotificationSourceType } from './enums/notification-source-type.enum';

@Entity('notifications')
@Index(['companyId', 'isRead'])
export class Notification extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'enum', enum: NotificationSeverity })
  severity: NotificationSeverity;

  @Column({ length: 150 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: NotificationSourceType,
    nullable: true,
    default: null,
  })
  sourceType: NotificationSourceType | null;

  @Column({ name: 'source_id', type: 'uuid', nullable: true, default: null })
  sourceId: string | null;

  @Column({
    name: 'dedupe_key',
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: true,
    default: null,
  })
  dedupeKey: string | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({
    name: 'read_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  readAt: Date | null;
}
