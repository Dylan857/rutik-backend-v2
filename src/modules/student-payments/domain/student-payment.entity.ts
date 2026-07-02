import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { Company } from '../../company/domain/company.entity';
import { Student } from '../../students/domain/student.entity';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentMethod } from './enums/payment-method.enum';

@Entity('student_payments')
export class StudentPayment extends BaseEntity {
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

  // Month 1-12 stored as smallint — simple, portable, and index-friendly.
  // Separating month and year (instead of a single date column) makes
  // billing queries like "all PENDING for June 2026" trivial without
  // date arithmetic.
  @Column({ name: 'billing_month', type: 'smallint' })
  billingMonth: number;

  @Column({ name: 'billing_year', type: 'smallint' })
  billingYear: number;

  @Column({
    name: 'monthly_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  monthlyFee: number;

  @Column({
    name: 'amount_paid',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  amountPaid: number;

  // Status is never set directly by API clients — StudentPaymentsService computes
  // it from amountPaid vs monthlyFee vs dueDate on every create/update, and
  // recomputes it (without persisting) on every read to stay accurate "as of now".
  // It stays a real, indexable column purely so `?status=` filtering stays cheap.
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  // Computed once at creation from the student's paymentDueDay + billingMonth/Year
  // (clamped to the last valid day of that month), then frozen — mirrors monthlyFee
  // being copied per-payment for historical integrity. Nullable only to tolerate
  // rows created before this column existed.
  @Column({ name: 'due_date', type: 'date', nullable: true, default: null })
  dueDate: string | null;

  // Nullable: only populated when amountPaid > 0. Kept as a plain timestamp
  // (not a computed column) so it can be set manually by an admin if needed.
  @Column({
    name: 'paid_at',
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  paidAt: Date | null;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
    default: null,
  })
  paymentMethod: PaymentMethod | null;

  @Column({ type: 'text', nullable: true, default: null })
  notes: string | null;
}
