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

  @Column({ type: 'text', nullable: true })
  polyline: string | null;

  @Column({ name: 'distance_meters', type: 'int', nullable: true })
  distanceMeters: number | null;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds: number | null;

  @Column({
    name: 'directions_updated_at',
    type: 'timestamptz',
    nullable: true,
  })
  directionsUpdatedAt: Date | null;

  @Column({ name: 'polyline_return', type: 'text', nullable: true })
  polylineReturn: string | null;

  @Column({ name: 'distance_meters_return', type: 'int', nullable: true })
  distanceMetersReturn: number | null;

  @Column({ name: 'duration_seconds_return', type: 'int', nullable: true })
  durationSecondsReturn: number | null;
}
