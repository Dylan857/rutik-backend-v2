import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { TripLeg, TripStatus } from './enums/trip.enums';
import { TripStop } from './trip-stop.entity';

/**
 * One run of a school route: started by the driver's "Iniciar ruta" and
 * ended by "Finalizar ruta". Holds the live state (last position, ETA) that
 * guardians and the admin panel read, plus display snapshots so reads don't
 * have to re-join half the schema every few seconds.
 */
@Entity('route_trips')
@Index(['companyId', 'status'])
@Index('UQ_route_trips_active_route_leg', ['schoolRouteId', 'date', 'leg'], {
  unique: true,
  where: `"status" = 'IN_PROGRESS'`,
})
export class RouteTrip extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'school_route_id', type: 'uuid' })
  schoolRouteId: string;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId: string;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId: string | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: TripLeg })
  leg: TripLeg;

  @Column({ type: 'enum', enum: TripStatus, default: TripStatus.IN_PROGRESS })
  status: TripStatus;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  // ── Display snapshots ──────────────────────────────────────────────────────
  @Column({ name: 'school_name', length: 150 })
  schoolName: string;

  @Column({ name: 'driver_name', length: 150 })
  driverName: string;

  @Column({
    name: 'vehicle_plate',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  vehiclePlate: string | null;

  @Column({ type: 'text', nullable: true })
  polyline: string | null;

  /** Where the leg ends: the school on PICKUP, the company base on DROPOFF. */
  @Column({ name: 'destination_lat', type: 'float', nullable: true })
  destinationLat: number | null;

  @Column({ name: 'destination_lng', type: 'float', nullable: true })
  destinationLng: number | null;

  // ── Live state ─────────────────────────────────────────────────────────────
  @Column({ name: 'last_lat', type: 'float', nullable: true })
  lastLat: number | null;

  @Column({ name: 'last_lng', type: 'float', nullable: true })
  lastLng: number | null;

  @Column({ name: 'last_heading', type: 'float', nullable: true })
  lastHeading: number | null;

  @Column({ name: 'last_speed', type: 'float', nullable: true })
  lastSpeed: number | null;

  @Column({ name: 'last_location_at', type: 'timestamptz', nullable: true })
  lastLocationAt: Date | null;

  /** When the last breadcrumb was written to trip_locations (throttling). */
  @Column({ name: 'last_trail_at', type: 'timestamptz', nullable: true })
  lastTrailAt: Date | null;

  @Column({ name: 'eta_destination_seconds', type: 'int', nullable: true })
  etaDestinationSeconds: number | null;

  @Column({ name: 'eta_updated_at', type: 'timestamptz', nullable: true })
  etaUpdatedAt: Date | null;

  @OneToMany(() => TripStop, (stop) => stop.trip)
  stops?: TripStop[];
}
