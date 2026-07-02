import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SchoolRoute } from '../../school-routes/domain/school-route.entity';
import { Student } from '../../students/domain/student.entity';

// RouteStop does not extend BaseEntity — it has no soft-delete column by design.
// Stops are hard-deleted when a student is removed from a route so that
// stop_order remains a compact, gap-free sequence at all times.
// Fields intentionally left for future phases (ETA, real pick-up/drop-off
// timestamps, stop status, observations, incidents) can be added here later
// without breaking the current contract.
@Entity('route_stops')
export class RouteStop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'school_route_id', type: 'uuid' })
  schoolRouteId: string;

  @ManyToOne(() => SchoolRoute, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'school_route_id' })
  schoolRoute: SchoolRoute;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'stop_order', type: 'int' })
  stopOrder: number;

  // Snapshot of the student's location at the moment the stop was created.
  // Decoupled from the Student entity so that address corrections do not
  // silently alter historical route configurations.
  @Column({ name: 'latitude_snapshot', type: 'float' })
  latitudeSnapshot: number;

  @Column({ name: 'longitude_snapshot', type: 'float' })
  longitudeSnapshot: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
