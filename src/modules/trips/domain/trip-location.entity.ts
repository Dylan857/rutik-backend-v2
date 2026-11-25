import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Breadcrumb trail of a trip (one point every ~15 s) for the admin's
 * "recorrido" view. Append-only, so no BaseEntity/soft delete.
 */
@Entity('trip_locations')
@Index(['tripId', 'recordedAt'])
export class TripLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trip_id', type: 'uuid' })
  tripId: string;

  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  @Column({ type: 'float', nullable: true })
  speed: number | null;

  @Column({ type: 'float', nullable: true })
  heading: number | null;

  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
