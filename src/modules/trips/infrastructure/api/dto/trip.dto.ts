import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsDateString,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import {
  TripLeg,
  TripStatus,
  TripStopOutcome,
  TripStopStatus,
} from '../../../domain/enums/trip.enums';

// ── Requests ─────────────────────────────────────────────────────────────────

export class StartTripDto {
  @ApiProperty({
    enum: TripLeg,
    description: 'PICKUP = ida, DROPOFF = regreso',
  })
  @IsEnum(TripLeg)
  leg: TripLeg;
}

export class LocationPointDto {
  @ApiProperty({ example: 4.6533 })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: -74.0836 })
  @IsLongitude()
  longitude: number;

  @ApiPropertyOptional({ description: 'm/s', nullable: true })
  @IsOptional()
  @IsNumber()
  speed?: number | null;

  @ApiPropertyOptional({ description: 'Degrees from north', nullable: true })
  @IsOptional()
  @IsNumber()
  heading?: number | null;

  @ApiProperty({ example: '2026-11-25T11:32:05.000Z' })
  @IsDateString()
  recordedAt: string;
}

export class RecordLocationsDto {
  @ApiProperty({
    type: [LocationPointDto],
    description:
      'Oldest first. Batches let the app flush points queued offline.',
  })
  @ValidateNested({ each: true })
  @Type(() => LocationPointDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  points: LocationPointDto[];
}

export class ResolveStopDto {
  @ApiProperty({
    enum: TripStopOutcome,
    description: 'DONE = Sí (recogido/entregado), NOT_DONE = No',
  })
  @IsEnum(TripStopOutcome)
  outcome: TripStopOutcome;
}

// ── Responses ────────────────────────────────────────────────────────────────

export class TripLatLngDto {
  @ApiProperty() latitude: number;
  @ApiProperty() longitude: number;
}

export class TripLocationDto extends TripLatLngDto {
  @ApiProperty({ nullable: true }) heading: number | null;
  @ApiProperty({ nullable: true, description: 'm/s' }) speed: number | null;
  @ApiProperty() recordedAt: Date;
}

export class TripStopDto {
  @ApiProperty() id: string;
  @ApiProperty() routeStopId: string;
  @ApiProperty() studentId: string;
  @ApiProperty() studentName: string;
  @ApiProperty() sequence: number;
  @ApiProperty() latitude: number;
  @ApiProperty() longitude: number;
  @ApiProperty({ enum: TripStopStatus }) status: TripStopStatus;
  @ApiProperty({ nullable: true, description: 'Seconds from now, approx.' })
  etaSeconds: number | null;
  @ApiProperty({ nullable: true }) arrivedAt: Date | null;
  @ApiProperty({ nullable: true }) resolvedAt: Date | null;
}

export class TripProgressDto {
  @ApiProperty() total: number;
  @ApiProperty({ description: 'Answered "Sí"' }) done: number;
  @ApiProperty({ description: 'Answered "No"' }) notDone: number;
  @ApiProperty({ description: 'Still to visit' }) open: number;
}

/** What the driver's app and the admin panel see of a trip. */
export class TripDto {
  @ApiProperty() id: string;
  @ApiProperty() routeId: string;
  @ApiProperty() date: string;
  @ApiProperty({ enum: TripLeg }) leg: TripLeg;
  @ApiProperty({ enum: TripStatus }) status: TripStatus;
  @ApiProperty() startedAt: Date;
  @ApiProperty({ nullable: true }) endedAt: Date | null;
  @ApiProperty() schoolName: string;
  @ApiProperty() driverName: string;
  @ApiProperty({ nullable: true }) vehiclePlate: string | null;
  @ApiProperty({ nullable: true, description: 'Encoded Google polyline' })
  polyline: string | null;
  @ApiProperty({ type: TripLatLngDto, nullable: true })
  destination: TripLatLngDto | null;
  @ApiProperty({ type: TripLocationDto, nullable: true })
  lastLocation: TripLocationDto | null;
  @ApiProperty({
    nullable: true,
    description: 'Seconds to the school (ida); null on regreso',
  })
  etaDestinationSeconds: number | null;
  @ApiProperty({ type: TripProgressDto }) progress: TripProgressDto;
  @ApiProperty({ type: [TripStopDto] }) stops: TripStopDto[];
}

export class TripDetailDto extends TripDto {
  @ApiProperty({ type: [TripLocationDto], description: 'Breadcrumb trail' })
  trail: TripLocationDto[];
}

export class GuardianTripStopDto {
  @ApiProperty() tripStopId: string;
  @ApiProperty() studentName: string;
  @ApiProperty() sequence: number;
  @ApiProperty() latitude: number;
  @ApiProperty() longitude: number;
  @ApiProperty({ enum: TripStopStatus }) status: TripStopStatus;
  @ApiProperty({ nullable: true, description: 'Seconds from now, approx.' })
  etaSeconds: number | null;
  @ApiProperty({ nullable: true }) arrivedAt: Date | null;
  @ApiProperty({ nullable: true }) resolvedAt: Date | null;
}

/**
 * A guardian's live view of their child's trip. Other families' stops are
 * reduced to counts — no names or home coordinates.
 */
export class GuardianLiveTripDto {
  @ApiProperty() tripId: string;
  @ApiProperty({ enum: TripLeg }) leg: TripLeg;
  @ApiProperty() schoolName: string;
  @ApiProperty() driverName: string;
  @ApiProperty({ nullable: true }) vehiclePlate: string | null;
  @ApiProperty() startedAt: Date;
  @ApiProperty({ nullable: true }) polyline: string | null;
  @ApiProperty({ type: TripLatLngDto, nullable: true })
  destination: TripLatLngDto | null;
  @ApiProperty({ type: TripLocationDto, nullable: true })
  lastLocation: TripLocationDto | null;
  @ApiProperty({ nullable: true, description: 'Seconds to the school (ida)' })
  etaDestinationSeconds: number | null;
  @ApiProperty({ description: 'Stops on this trip' }) totalStops: number;
  @ApiProperty({
    nullable: true,
    description:
      'Sequence of the stop the bus is heading to (null when all are done)',
  })
  currentStopNumber: number | null;
  @ApiProperty({ description: "Open stops before the guardian's own" })
  stopsBeforeMine: number;
  @ApiProperty({ type: GuardianTripStopDto }) myStop: GuardianTripStopDto;
}
