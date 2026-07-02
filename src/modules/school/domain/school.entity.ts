import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { Company } from '../../company/domain/company.entity';
import { SchoolStatus } from './enums/school-status.enum';

@Entity('schools')
export class School extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true, default: null })
  address: string | null;

  @Column({ type: 'float', nullable: true, default: null })
  latitude: number | null;

  @Column({ type: 'float', nullable: true, default: null })
  longitude: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  email: string | null;

  @Column({ type: 'enum', enum: SchoolStatus, default: SchoolStatus.ACTIVE })
  status: SchoolStatus;
}
