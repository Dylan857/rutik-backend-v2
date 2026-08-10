import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { FuelLogResponseDto } from '../../../../fuel-logs/infrastructure/api/dto/fuel-log-response.dto';
import { RouteStatus } from '../../../../school-routes/domain/enums/route-status.enum';
import { TripType } from '../../../../students/domain/enums/trip-type.enum';
import { VehicleResponseDto } from './vehicle-response.dto';

export class FuelPeriodDto {
  @ApiProperty({ example: 7 })
  @Expose()
  month: number;

  @ApiProperty({ example: 2026 })
  @Expose()
  year: number;

  @ApiProperty({ example: '2026-07-01' })
  @Expose()
  dateFrom: string;

  @ApiProperty({ example: '2026-07-31' })
  @Expose()
  dateTo: string;
}

export class FuelSummaryDto {
  @ApiProperty({ type: FuelPeriodDto })
  @Expose()
  @Type(() => FuelPeriodDto)
  period: FuelPeriodDto;

  @ApiProperty({
    example: 450000,
    description: 'Sum of amountPaid for the period',
  })
  @Expose()
  totalAmountPaid: number;

  @ApiProperty({ example: 55.5, description: 'Sum of gallons for the period' })
  @Expose()
  totalGallons: number;

  @ApiProperty({ example: 3 })
  @Expose()
  logsCount: number;

  @ApiProperty({ type: [FuelLogResponseDto] })
  @Expose()
  @Type(() => FuelLogResponseDto)
  logs: FuelLogResponseDto[];
}

export class ActiveRouteDto {
  @ApiProperty({ example: 'f1e2d3c4-b5a6-7890-cdef-123456789012' })
  @Expose()
  id: string;

  @ApiProperty({ enum: RouteStatus, example: RouteStatus.ACTIVE })
  @Expose()
  status: RouteStatus;

  @ApiProperty({ example: 'e0d1c2b3-a4f5-6789-0abc-def123456789' })
  @Expose()
  schoolAssignmentId: string;

  @ApiProperty({ example: 'a9b8c7d6-e5f4-3210-9876-543210fedcba' })
  @Expose()
  schoolId: string;

  @ApiProperty({ example: 'Colegio San José' })
  @Expose()
  schoolName: string;

  @ApiProperty({ example: 'b8c7d6e5-f4a3-2109-8765-43210fedcba9' })
  @Expose()
  scheduleId: string;

  @ApiProperty({ example: 'Mañana' })
  @Expose()
  scheduleName: string;

  @ApiProperty({ example: 8500, nullable: true })
  @Expose()
  distanceMeters: number | null;

  @ApiProperty({ example: 1200, nullable: true })
  @Expose()
  durationSeconds: number | null;

  @ApiProperty({ example: 8700, nullable: true })
  @Expose()
  distanceMetersReturn: number | null;

  @ApiProperty({ example: 1260, nullable: true })
  @Expose()
  durationSecondsReturn: number | null;
}

export class AssignedStudentDto {
  @ApiProperty({ example: 'c7d6e5f4-a3b2-1098-7654-3210fedcba98' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'Sofía' })
  @Expose()
  firstName: string;

  @ApiProperty({ example: 'Ramírez' })
  @Expose()
  lastName: string;

  @ApiProperty({ example: '5°' })
  @Expose()
  grade: string;

  @ApiProperty({ enum: TripType, example: TripType.ROUND_TRIP })
  @Expose()
  tripType: TripType;

  @ApiProperty({ example: 'f1e2d3c4-b5a6-7890-cdef-123456789012' })
  @Expose()
  schoolRouteId: string;
}

export class VehicleDetailResponseDto extends VehicleResponseDto {
  @ApiProperty({ type: FuelSummaryDto })
  @Expose()
  @Type(() => FuelSummaryDto)
  fuel: FuelSummaryDto;

  @ApiProperty({ type: [ActiveRouteDto] })
  @Expose()
  @Type(() => ActiveRouteDto)
  activeRoutes: ActiveRouteDto[];

  @ApiProperty({ type: [AssignedStudentDto] })
  @Expose()
  @Type(() => AssignedStudentDto)
  assignedStudents: AssignedStudentDto[];
}
