import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { Company } from '../../company/domain/company.entity';
import { Student } from '../../students/domain/student.entity';
import { User } from '../../user/domain/user.entity';
import { AbsenceLeg } from './enums/absence-leg.enum';
import { AbsenceStatus } from './enums/absence-status.enum';

// A guardian's report that a student won't ride the route on a given day.
// At most one ACTIVE absence per student per day — reporting again for the
// same day widens the existing one (e.g. PICKUP -> BOTH) instead of adding
// a second row. Cancelled rows are kept for history.
@Entity('student_absences')
@Index('UQ_student_absences_active_student_date', ['studentId', 'date'], {
  unique: true,
  where: `"status" = 'ACTIVE' AND "deleted_at" IS NULL`,
})
export class StudentAbsence extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: AbsenceLeg })
  leg: AbsenceLeg;

  @Column({ type: 'text', nullable: true, default: null })
  reason: string | null;

  @Column({ name: 'reported_by_user_id', type: 'uuid' })
  reportedByUserId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'reported_by_user_id' })
  reportedBy: User;

  @Column({ type: 'enum', enum: AbsenceStatus, default: AbsenceStatus.ACTIVE })
  status: AbsenceStatus;

  @Column({
    name: 'cancelled_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  cancelledAt: Date | null;
}
