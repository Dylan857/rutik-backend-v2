import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { Company } from '../../company/domain/company.entity';
import { SchoolAssignment } from '../../school-assignments/domain/school-assignment.entity';
import { RouteStatus } from './enums/route-status.enum';

@Entity('school_routes')
export class SchoolRoute extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  // The route owns the FK. SchoolAssignment has no back-reference to avoid
  // bidirectional coupling — the route depends on the assignment, not the other way around.
  @Column({ name: 'school_assignment_id', type: 'uuid', unique: true })
  schoolAssignmentId: string;

  @OneToOne(() => SchoolAssignment, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'school_assignment_id' })
  schoolAssignment: SchoolAssignment;

  @Column({ type: 'enum', enum: RouteStatus, default: RouteStatus.ACTIVE })
  status: RouteStatus;
}
