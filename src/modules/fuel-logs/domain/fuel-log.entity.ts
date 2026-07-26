import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { Company } from '../../company/domain/company.entity';
import { Vehicle } from '../../vehicles/domain/vehicle.entity';

@Entity('fuel_logs')
export class FuelLog extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ type: 'date' })
  date: string;

  @Column({
    name: 'amount_paid',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  amountPaid: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 3,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  gallons: number;

  // Odometer reading at the moment of fueling. Optional today, but the
  // basis for real fuel-efficiency calculations later (distance between
  // consecutive readings / gallons consumed).
  @Column({ type: 'int', nullable: true, default: null })
  odometer: number | null;

  @Column({
    name: 'gas_station',
    type: 'varchar',
    length: 150,
    nullable: true,
    default: null,
  })
  gasStation: string | null;

  @Column({ type: 'text', nullable: true, default: null })
  notes: string | null;
}
