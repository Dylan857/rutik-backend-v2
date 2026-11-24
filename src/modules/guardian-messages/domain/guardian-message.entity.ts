import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { Company } from '../../company/domain/company.entity';
import { Student } from '../../students/domain/student.entity';
import { User } from '../../user/domain/user.entity';
import {
  GuardianMessageCategory,
  GuardianMessageStatus,
  GuardianMessageTopic,
} from './enums/guardian-message.enums';

// A concern (inquietud) or complaint (incomodidad) a guardian sent from the
// mobile chat. Admins read them in the web inbox and mark them resolved —
// there's no reply thread yet.
@Entity('guardian_messages')
export class GuardianMessage extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'guardian_user_id', type: 'uuid' })
  guardianUserId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'guardian_user_id' })
  guardianUser: User;

  // Optional — a message can be about the service in general.
  @Column({ name: 'student_id', type: 'uuid', nullable: true, default: null })
  studentId: string | null;

  @ManyToOne(() => Student, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: false,
  })
  @JoinColumn({ name: 'student_id' })
  student: Student | null;

  @Column({ type: 'enum', enum: GuardianMessageCategory })
  category: GuardianMessageCategory;

  @Column({ type: 'enum', enum: GuardianMessageTopic })
  topic: GuardianMessageTopic;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: GuardianMessageStatus,
    default: GuardianMessageStatus.OPEN,
  })
  status: GuardianMessageStatus;

  @Column({
    name: 'resolved_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  resolvedAt: Date | null;

  @Column({
    name: 'resolved_by_user_id',
    type: 'uuid',
    nullable: true,
    default: null,
  })
  resolvedByUserId: string | null;
}
