import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { Company } from '../../company/domain/company.entity';
import { User } from '../../user/domain/user.entity';
import { DriverStatus } from './enums/driver-status.enum';
import { PaymentType } from './enums/payment-type.enum';

@Entity('drivers')
export class Driver extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  // Each driver has exactly one User account (personal info lives there).
  // The user is auto-created with role DRIVER when the driver profile is registered.
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'license_number', length: 50 })
  licenseNumber: string;

  @Column({ name: 'license_category', length: 20 })
  licenseCategory: string;

  @Column({ name: 'license_expiration_date', type: 'date' })
  licenseExpirationDate: string;

  @Column({ name: 'hire_date', type: 'date' })
  hireDate: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => parseFloat(v),
    },
  })
  salary: number;

  @Column({ name: 'payment_type', type: 'enum', enum: PaymentType })
  paymentType: PaymentType;

  @Column({ type: 'enum', enum: DriverStatus, default: DriverStatus.ACTIVE })
  status: DriverStatus;

  @Column({ type: 'text', nullable: true, default: null })
  observations: string | null;
}
