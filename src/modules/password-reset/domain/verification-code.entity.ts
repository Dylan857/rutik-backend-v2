import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/domain/user.entity';
import { VerificationPurpose } from './enums/verification-purpose.enum';

// Does not extend BaseEntity — this table only needs the columns below
// (no soft-delete, no updatedAt: a code is either deleted after use/replacement
// or left to expire, never updated in place).
@Entity('verification_codes')
export class VerificationCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'code_hash', length: 255 })
  codeHash: string;

  @Column({ type: 'enum', enum: VerificationPurpose })
  purpose: VerificationPurpose;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'smallint', default: 0 })
  attempts: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
