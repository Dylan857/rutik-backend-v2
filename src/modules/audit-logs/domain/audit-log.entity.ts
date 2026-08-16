import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { Company } from '../../company/domain/company.entity';
import { User } from '../../user/domain/user.entity';
import { AuditAction } from './enums/audit-action.enum';
import { AuditEntityType } from './enums/audit-entity-type.enum';

@Entity('audit_logs')
@Index(['companyId', 'createdAt'])
export class AuditLog extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid', nullable: true, default: null })
  companyId: string | null;

  @ManyToOne(() => Company, {
    nullable: true,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'company_id' })
  company: Company | null;

  @Column({
    name: 'actor_user_id',
    type: 'uuid',
    nullable: true,
    default: null,
  })
  actorUserId: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: false,
  })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser: User | null;

  @Column({
    name: 'actor_email',
    type: 'varchar',
    length: 255,
    nullable: true,
    default: null,
  })
  actorEmail: string | null;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ name: 'entity_type', type: 'enum', enum: AuditEntityType })
  entityType: AuditEntityType;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true, default: null })
  entityId: string | null;

  @Column({ type: 'text' })
  description: string;
}
