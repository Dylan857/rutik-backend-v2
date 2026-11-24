import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { SchoolRoute } from '../../school-routes/domain/school-route.entity';

// A route re-planned for one specific date because some students reported
// they won't ride that day. Derived data, never edited by hand: it's rebuilt
// whenever an absence for that date changes, and only exists for dates with
// absences — every other day runs the base route (route_stops.stop_order).
// Like RouteStop, it's hard-deleted (no soft delete) since it can always be
// recomputed.
@Entity('daily_route_plans')
@Unique('UQ_daily_route_plans_route_date', ['schoolRouteId', 'date'])
export class DailyRoutePlan {
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

  @Column({ type: 'date' })
  date: string;

  // Route stop IDs in visiting order for each leg, absent students removed.
  @Column({ name: 'pickup_stop_ids', type: 'jsonb' })
  pickupStopIds: string[];

  @Column({ name: 'dropoff_stop_ids', type: 'jsonb' })
  dropoffStopIds: string[];

  @Column({ type: 'text', nullable: true })
  polyline: string | null;

  @Column({ name: 'distance_meters', type: 'int', nullable: true })
  distanceMeters: number | null;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds: number | null;

  @Column({ name: 'polyline_return', type: 'text', nullable: true })
  polylineReturn: string | null;

  @Column({ name: 'distance_meters_return', type: 'int', nullable: true })
  distanceMetersReturn: number | null;

  @Column({ name: 'duration_seconds_return', type: 'int', nullable: true })
  durationSecondsReturn: number | null;

  @Column({ name: 'computed_at', type: 'timestamptz' })
  computedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
