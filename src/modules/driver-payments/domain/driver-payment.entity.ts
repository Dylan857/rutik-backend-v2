import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { Company } from '../../company/domain/company.entity';
import { Driver } from '../../drivers/domain/driver.entity';
import { DriverPaymentStatus } from './enums/payment-status.enum';
import { DriverPaymentMethod } from './enums/payment-method.enum';

@Entity('driver_payments')
export class DriverPayment extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId: string;

  @ManyToOne(() => Driver, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  // Unlike students (always a calendar month), a driver's paymentType can be
  // MONTHLY/WEEKLY/BIWEEKLY, so the period is stored as an explicit date
  // range instead of month/year — see payment-period.util.ts.
  @Column({ name: 'period_start', type: 'date' })
  periodStart: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: string;

  // Copied from driver.salary at creation time — frozen, same historical-
  // integrity rationale as StudentPayment.monthlyFee.
  @Column({
    name: 'salary_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  salaryAmount: number;

  @Column({
    name: 'amount_paid',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  amountPaid: number;

  // Never set directly by API clients — DriverPaymentsService computes it
  // from amountPaid vs salaryAmount vs dueDate on every create/update, and
  // recomputes it (without persisting) on every read to stay accurate "as of now".
  @Column({
    type: 'enum',
    enum: DriverPaymentStatus,
    default: DriverPaymentStatus.PENDING,
  })
  status: DriverPaymentStatus;

  // Frozen at creation, equal to periodEnd — the calendar cutoff this
  // period is due at (mirrors monthlyFee's historical-integrity precedent).
  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

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
    enum: DriverPaymentMethod,
    nullable: true,
    default: null,
  })
  paymentMethod: DriverPaymentMethod | null;

  @Column({ type: 'text', nullable: true, default: null })
  notes: string | null;
}
