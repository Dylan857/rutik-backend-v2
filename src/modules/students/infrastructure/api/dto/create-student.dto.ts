import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { StudentStatus } from '../../../domain/enums/student-status.enum';
import { TripType } from '../../../domain/enums/trip-type.enum';

export class CreateStudentDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Company UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    description: 'School UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  schoolId: string;

  @ApiProperty({
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    description: 'School schedule UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  scheduleId: string;

  @ApiProperty({ example: 'Juan' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Pérez García' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({
    example: '1234567890',
    description: 'Student document number (optional)',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsOptional()
  @MaxLength(50)
  document?: string;

  @ApiPropertyOptional({
    example: '2015-08-20',
    description: 'Birth date in YYYY-MM-DD format',
  })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiProperty({ example: '3°', description: 'School grade or year' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  grade: string;

  @ApiProperty({ example: 'Carrera 45 #23-12, Medellín' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address: string;

  @ApiProperty({
    example: 6.2442,
    description: 'Latitude (-90 to 90). Required for route assignment.',
  })
  @IsLatitude()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({
    example: -75.5812,
    description: 'Longitude (-180 to 180). Required for route assignment.',
  })
  @IsLongitude()
  @IsNotEmpty()
  longitude: number;

  @ApiProperty({
    example: '2026-02-01',
    description: 'Date the student started in YYYY-MM-DD format',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    example: 180000,
    description: 'Monthly transport fee for billing purposes (must be > 0)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monthlyFee: number;

  @ApiPropertyOptional({
    example: 5,
    default: 5,
    description:
      'Day of month (1-31) payment is due. Use 31 for "end of month" (auto-clamped per billing period).',
  })
  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  paymentDueDay?: number;

  @ApiPropertyOptional({
    example: '2026-02-01',
    description: 'Date transport service starts. Defaults to today if omitted.',
  })
  @IsDateString()
  @IsOptional()
  transportStartDate?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Date transport service ends — null means currently active',
    nullable: true,
  })
  @IsDateString()
  @IsOptional()
  transportEndDate?: string;

  @ApiPropertyOptional({ enum: StudentStatus, default: StudentStatus.ACTIVE })
  @IsEnum(StudentStatus)
  @IsOptional()
  status?: StudentStatus;

  @ApiPropertyOptional({
    enum: TripType,
    default: TripType.ROUND_TRIP,
    description:
      'Which leg(s) of the route this student needs. ROUND_TRIP (default) ' +
      'needs both; PICKUP_ONLY only needs the morning ride to school; ' +
      'DROPOFF_ONLY only needs the afternoon ride home.',
  })
  @IsEnum(TripType)
  @IsOptional()
  tripType?: TripType;

  @ApiPropertyOptional({ example: 'Student requires special assistance.' })
  @IsString()
  @IsOptional()
  observations?: string;
}
