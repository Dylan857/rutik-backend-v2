import { ApiProperty } from '@nestjs/swagger';
import { AbsenceLeg } from '../../../../student-absences/domain/enums/absence-leg.enum';

export class DailyRouteStopDto {
  @ApiProperty({ description: 'Route stop UUID' })
  routeStopId: string;

  @ApiProperty()
  studentId: string;

  @ApiProperty({ example: 'Sofía Gómez' })
  studentName: string;

  @ApiProperty({
    example: 1,
    description: '1-based visiting order for this leg, this day',
  })
  order: number;

  @ApiProperty({ example: 4.710989 })
  latitude: number;

  @ApiProperty({ example: -74.07209 })
  longitude: number;
}

export class DailyRouteLegDto {
  @ApiProperty({ type: [DailyRouteStopDto] })
  stops: DailyRouteStopDto[];

  @ApiProperty({ nullable: true, description: 'Encoded Google polyline' })
  polyline: string | null;

  @ApiProperty({ nullable: true })
  distanceMeters: number | null;

  @ApiProperty({ nullable: true })
  durationSeconds: number | null;
}

export class DailyRouteAbsentStudentDto {
  @ApiProperty()
  studentId: string;

  @ApiProperty({ example: 'Juan Pérez' })
  studentName: string;

  @ApiProperty({ enum: AbsenceLeg })
  leg: AbsenceLeg;
}

// The route a driver should actually run on `date`: the base route minus
// the students who reported they won't ride. Contract for the future
// driver app.
export class DailyRouteResponseDto {
  @ApiProperty()
  schoolRouteId: string;

  @ApiProperty({ example: '2026-11-25' })
  date: string;

  @ApiProperty({
    description:
      'True when absences changed the route for this date; false = base route',
  })
  isModified: boolean;

  @ApiProperty({
    type: DailyRouteLegDto,
    description: 'Ida (empresa -> colegio)',
  })
  pickup: DailyRouteLegDto;

  @ApiProperty({
    type: DailyRouteLegDto,
    description: 'Regreso (colegio -> empresa)',
  })
  dropoff: DailyRouteLegDto;

  @ApiProperty({ type: [DailyRouteAbsentStudentDto] })
  absentStudents: DailyRouteAbsentStudentDto[];
}
