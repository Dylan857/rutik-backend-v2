import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { Company } from '../../company/domain/company.entity';
import { Vehicle } from '../../vehicles/domain/vehicle.entity';
import { MaintenanceType } from './enums/maintenance-type.enum';

@Entity('maintenances')
export class Maintenance extends BaseEntity {
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
    name: 'maintenance_type',
    type: 'enum',
    enum: MaintenanceType,
  })
  maintenanceType: MaintenanceType;

  @Column({
    type: 'varchar',
    length: 150,
    nullable: true,
    default: null,
  })
  workshop: string | null;

  // Odometer reading at the moment of the maintenance. Used both as a
  // historical record and, when it exceeds the vehicle's current mileage, to
  // keep vehicle.currentMileage fresh (see MaintenancesService).
  @Column({ type: 'int' })
  mileage: number;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({
    name: 'labor_cost',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  laborCost: number;

  @Column({
    name: 'parts_cost',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  partsCost: number;

  // Always laborCost + partsCost, computed server-side — stored so the
  // dashboard summary can SUM() it directly instead of recomputing per row.
  @Column({
    name: 'total_cost',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  totalCost: number;

  @Column({
    name: 'next_maintenance_date',
    type: 'date',
    nullable: true,
    default: null,
  })
  nextMaintenanceDate: string | null;

  @Column({
    name: 'next_maintenance_mileage',
    type: 'int',
    nullable: true,
    default: null,
  })
  nextMaintenanceMileage: number | null;
}
