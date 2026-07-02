import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { CompanyStatus } from './enums/company-status.enum';

@Entity('companies')
export class Company extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, unique: true })
  nit: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  phone: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, default: null })
  address: string | null;

  @Column({ type: 'float', nullable: true, default: null })
  latitude: number | null;

  @Column({ type: 'float', nullable: true, default: null })
  longitude: number | null;

  @Column({
    type: 'enum',
    enum: CompanyStatus,
    default: CompanyStatus.ACTIVE,
  })
  status: CompanyStatus;

  @Column({ length: 100, default: 'UTC' })
  timezone: string;
}
