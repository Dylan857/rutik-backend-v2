import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { Company } from '../../company/domain/company.entity';
import { User } from '../../user/domain/user.entity';
import { GuardianStatus } from './enums/guardian-status.enum';

@Entity('guardians')
export class Guardian extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  // Optional link to a User account for mobile app authentication.
  // When present, the User must have role GUARDIAN and belong to the same company.
  @Column({ name: 'user_id', type: 'uuid', nullable: true, default: null })
  userId: string | null;

  @OneToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ length: 50 })
  document: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 500, nullable: true, default: null })
  address: string | null;

  @Column({
    type: 'enum',
    enum: GuardianStatus,
    default: GuardianStatus.ACTIVE,
  })
  status: GuardianStatus;

  @Column({ type: 'text', nullable: true, default: null })
  observations: string | null;
}
