import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { TripStopStatus } from './enums/trip.enums';
import { RouteTrip } from './route-trip.entity';

/** One student's stop within a trip, in the order the bus visits them. */
@Entity('trip_stops')
@Index(['tripId', 'sequence'])
@Index(['studentId'])
export class TripStop extends BaseEntity {
  @Column({ name: 'trip_id', type: 'uuid' })
  tripId: string;

  @ManyToOne(() => RouteTrip, (trip) => trip.stops, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip?: RouteTrip;

  @Column({ name: 'route_stop_id', type: 'uuid' })
  routeStopId: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'student_name', length: 200 })
  studentName: string;

  /** 1-based visiting order. */
  @Column({ type: 'int' })
  sequence: number;

  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  @Column({
    type: 'enum',
    enum: TripStopStatus,
    default: TripStopStatus.PENDING,
  })
  status: TripStopStatus;

  /** Seconds to reach this stop as of the trip's etaUpdatedAt. */
  @Column({ name: 'eta_seconds', type: 'int', nullable: true })
  etaSeconds: number | null;

  @Column({
    name: 'approaching_notified_at',
    type: 'timestamptz',
    nullable: true,
  })
  approachingNotifiedAt: Date | null;

  @Column({ name: 'arrived_at', type: 'timestamptz', nullable: true })
  arrivedAt: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;
}
