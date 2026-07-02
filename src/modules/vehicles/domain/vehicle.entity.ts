import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { Company } from '../../company/domain/company.entity';
import { VehicleStatus } from './enums/vehicle-status.enum';
import { VehicleType } from './enums/vehicle-type.enum';

@Entity('vehicles')
export class Vehicle extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ length: 20 })
  plate: string;

  @Column({ length: 100 })
  brand: string;

  @Column({ length: 100 })
  model: string;

  @Column({ type: 'smallint' })
  year: number;

  @Column({ length: 50 })
  color: string;

  @Column({ name: 'vehicle_type', type: 'enum', enum: VehicleType })
  vehicleType: VehicleType;

  @Column({ type: 'smallint' })
  capacity: number;

  @Column({ name: 'soat_number', length: 50 })
  soatNumber: string;

  @Column({ name: 'soat_expiration_date', type: 'date' })
  soatExpirationDate: string;

  @Column({ name: 'technical_inspection_number', length: 50 })
  technicalInspectionNumber: string;

  @Column({ name: 'technical_inspection_expiration_date', type: 'date' })
  technicalInspectionExpirationDate: string;

  @Column({ name: 'current_mileage', type: 'int', default: 0 })
  currentMileage: number;

  @Column({ type: 'enum', enum: VehicleStatus, default: VehicleStatus.ACTIVE })
  status: VehicleStatus;

  @Column({ type: 'text', nullable: true, default: null })
  observations: string | null;
}
