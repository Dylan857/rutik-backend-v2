import { ApiProperty } from '@nestjs/swagger';
import { RelationshipType } from '../../../../student-guardians/domain/enums/relationship-type.enum';
import { AbsenceLeg } from '../../../../student-absences/domain/enums/absence-leg.enum';

export class LatLngDto {
  @ApiProperty({ example: 4.7109 })
  latitude: number;

  @ApiProperty({ example: -74.0721 })
  longitude: number;
}

export class DriverVehicleSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'ABC123' })
  plate: string;

  @ApiProperty({ example: 'Chevrolet' })
  brand: string;

  @ApiProperty({ example: 'NPR' })
  model: string;

  @ApiProperty({ example: 'Blanco' })
  color: string;
}

/** One assignment the driver runs on `date`, with that day's head count. */
export class DriverRouteSummaryDto {
  @ApiProperty({
    description:
      'School route UUID — open its daily plan with GET /driver/routes/:id/daily',
  })
  routeId: string;

  @ApiProperty()
  assignmentId: string;

  @ApiProperty({ example: 'Colegio San José' })
  schoolName: string;

  @ApiProperty({ nullable: true })
  schoolAddress: string | null;

  @ApiProperty({ example: 'Jornada mañana' })
  scheduleName: string;

  @ApiProperty({
    example: '06:30:00',
    description: 'School entry time (end of the ida)',
  })
  startTime: string;

  @ApiProperty({
    example: '13:00:00',
    description: 'School exit time (start of the regreso)',
  })
  endTime: string;

  @ApiProperty({ type: DriverVehicleSummaryDto, nullable: true })
  vehicle: DriverVehicleSummaryDto | null;

  @ApiProperty({
    example: 12,
    description: 'Students to pick up that day (absences excluded)',
  })
  pickupCount: number;

  @ApiProperty({
    example: 11,
    description: 'Students to drop off that day (absences excluded)',
  })
  dropoffCount: number;

  @ApiProperty({ example: 1 })
  absentCount: number;
}

export class GuardianContactDto {
  @ApiProperty({ example: 'María López' })
  name: string;

  @ApiProperty({ enum: RelationshipType })
  relationshipType: RelationshipType;

  @ApiProperty({ example: '3105556677' })
  phone: string;

  @ApiProperty()
  isPrimary: boolean;
}

export class DriverRouteStopDto {
  @ApiProperty()
  routeStopId: string;

  @ApiProperty()
  studentId: string;

  @ApiProperty({ example: 'Sofía Gómez' })
  studentName: string;

  @ApiProperty({ example: 'Calle 80 #20-10' })
  address: string;

  @ApiProperty({
    example: 1,
    description: '1-based visiting order for this leg, this day',
  })
  order: number;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiProperty({ type: [GuardianContactDto] })
  contacts: GuardianContactDto[];
}

export class DriverRouteLegDto {
  @ApiProperty({ type: [DriverRouteStopDto] })
  stops: DriverRouteStopDto[];

  @ApiProperty({ nullable: true, description: 'Encoded Google polyline' })
  polyline: string | null;

  @ApiProperty({ nullable: true })
  distanceMeters: number | null;

  @ApiProperty({ nullable: true })
  durationSeconds: number | null;
}

export class DriverAbsentStudentDto {
  @ApiProperty()
  studentId: string;

  @ApiProperty()
  studentName: string;

  @ApiProperty({ enum: AbsenceLeg })
  leg: AbsenceLeg;
}

/** The day's route for the driver: stops in order, contacts and map endpoints. */
export class DriverDailyRouteDto {
  @ApiProperty()
  routeId: string;

  @ApiProperty({ example: '2026-11-25' })
  date: string;

  @ApiProperty()
  isModified: boolean;

  @ApiProperty({ example: 'Colegio San José' })
  schoolName: string;

  @ApiProperty({
    type: LatLngDto,
    nullable: true,
    description: 'Ida destination / regreso origin',
  })
  school: LatLngDto | null;

  @ApiProperty({
    type: LatLngDto,
    nullable: true,
    description: 'Ida origin / regreso destination',
  })
  company: LatLngDto | null;

  @ApiProperty({
    type: DriverRouteLegDto,
    description: 'Ida (empresa -> colegio)',
  })
  pickup: DriverRouteLegDto;

  @ApiProperty({
    type: DriverRouteLegDto,
    description: 'Regreso (colegio -> empresa)',
  })
  dropoff: DriverRouteLegDto;

  @ApiProperty({ type: [DriverAbsentStudentDto] })
  absentStudents: DriverAbsentStudentDto[];
}

export class DriverVehicleDto extends DriverVehicleSummaryDto {
  @ApiProperty({ example: 2022 })
  year: number;

  @ApiProperty({ example: 20 })
  capacity: number;

  @ApiProperty({ example: '2027-03-01' })
  soatExpirationDate: string;

  @ApiProperty({ example: '2027-01-15' })
  technicalInspectionExpirationDate: string;

  @ApiProperty({ example: true })
  isPublicService: boolean;

  @ApiProperty({ nullable: true, example: '2026-12-10' })
  bimonthlyInspectionExpirationDate: string | null;

  @ApiProperty({ example: 120500 })
  currentMileage: number;
}
