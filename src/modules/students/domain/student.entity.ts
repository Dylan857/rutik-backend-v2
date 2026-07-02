import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { Company } from '../../company/domain/company.entity';
import { School } from '../../school/domain/school.entity';
import { SchoolSchedule } from '../../school-schedules/domain/school-schedule.entity';
import { StudentStatus } from './enums/student-status.enum';

@Entity('students')
export class Student extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId: string;

  @ManyToOne(() => School, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @Column({ name: 'schedule_id', type: 'uuid' })
  scheduleId: string;

  @ManyToOne(() => SchoolSchedule, {
    nullable: false,
    onDelete: 'RESTRICT',
    eager: false,
  })
  @JoinColumn({ name: 'schedule_id' })
  schedule: SchoolSchedule;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 50, nullable: true, default: null })
  document: string | null;

  @Column({ name: 'birth_date', type: 'date', nullable: true, default: null })
  birthDate: string | null;

  @Column({ length: 50 })
  grade: string;

  @Column({ length: 500 })
  address: string;

  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({
    name: 'monthly_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  monthlyFee: number;

  // Day of month (1-31) the guardian is expected to pay. Clamped to the last valid
  // day of each billing month when computing a StudentPayment's dueDate — use 31
  // to represent "end of month" without a separate sentinel value.
  @Column({ name: 'payment_due_day', type: 'smallint', default: 5 })
  paymentDueDay: number;

  @Column({
    name: 'transport_start_date',
    type: 'date',
    nullable: true,
    default: null,
  })
  transportStartDate: string | null;

  @Column({
    name: 'transport_end_date',
    type: 'date',
    nullable: true,
    default: null,
  })
  transportEndDate: string | null;

  @BeforeInsert()
  setTransportStartDateDefault() {
    if (!this.transportStartDate) {
      this.transportStartDate = new Date().toISOString().split('T')[0];
    }
  }

  @Column({ type: 'enum', enum: StudentStatus, default: StudentStatus.ACTIVE })
  status: StudentStatus;

  @Column({ type: 'text', nullable: true, default: null })
  observations: string | null;
}
